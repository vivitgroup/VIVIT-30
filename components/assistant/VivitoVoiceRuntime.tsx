"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";

type VoiceState="idle"|"recording"|"transcribing"|"ready"|"error";
type JsonRecord=Record<string,unknown>;
const MAX_RECORDING_SECONDS=90;
const record=(value:unknown):JsonRecord=>value&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};
const errorText=(value:unknown,fallback:string)=>value instanceof Error?value.message:fallback;
const mmss=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`;

function preferredMimeType(){
 if(typeof MediaRecorder==="undefined")return"";
 for(const type of ["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"]){if(MediaRecorder.isTypeSupported(type))return type}
 return"";
}
function blobToBase64(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error("Could not read the recording."));reader.onload=()=>{const raw=String(reader.result||""),index=raw.indexOf(",");resolve(index>=0?raw.slice(index+1):raw)};reader.readAsDataURL(blob)})}
function setComposerText(text:string){
 const textarea=document.querySelector<HTMLTextAreaElement>(".va-input textarea");if(!textarea)return false;
 const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")?.set;setter?.call(textarea,text);textarea.dispatchEvent(new Event("input",{bubbles:true}));textarea.dispatchEvent(new Event("change",{bubbles:true}));textarea.focus();return true;
}
function messageText(node:HTMLElement){return String(node.firstElementChild?.textContent||"").trim().slice(0,1800)}

export default function VivitoVoiceRuntime(){
 const [inputHost,setInputHost]=useState<HTMLElement|null>(null),[barHost,setBarHost]=useState<HTMLElement|null>(null),[voiceState,setVoiceState]=useState<VoiceState>("idle"),[seconds,setSeconds]=useState(0),[note,setNote]=useState(""),[voiceReplies,setVoiceReplies]=useState(false),[speaking,setSpeaking]=useState(false);
 const recorderRef=useRef<MediaRecorder|null>(null),streamRef=useRef<MediaStream|null>(null),chunksRef=useRef<Blob[]>([]),timerRef=useRef<number|null>(null),audioRef=useRef<HTMLAudioElement|null>(null),audioUrlRef=useRef<string|null>(null),voiceRepliesRef=useRef(false),speakRef=useRef<(text:string)=>void>(()=>{}),knownMessages=useRef(new WeakSet<HTMLElement>()),panelRef=useRef<HTMLElement|null>(null);

 function stopTimer(){if(timerRef.current!==null){window.clearInterval(timerRef.current);timerRef.current=null}}
 function releaseMic(){stopTimer();streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;recorderRef.current=null}
 function stopAudio(){audioRef.current?.pause();audioRef.current=null;if(audioUrlRef.current){URL.revokeObjectURL(audioUrlRef.current);audioUrlRef.current=null}setSpeaking(false)}
 async function speak(text:string){
  const clean=text.trim().slice(0,1800);if(!clean)return;stopAudio();setSpeaking(true);setNote("Generating a free voice reply…");
  try{const response=await fetch("/api/assistant/voice/speak",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:clean}),cache:"no-store"}),data=record(await response.json().catch(()=>({})));if(!response.ok)throw new Error(String(data.error||"Voice playback is unavailable."));const encoded=String(data.audio||"");if(!encoded)throw new Error("Voice playback returned no audio.");const raw=atob(encoded),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const blob=new Blob([bytes],{type:String(data.mediaType||"audio/mpeg")}),url=URL.createObjectURL(blob),audio=new Audio(url);audioRef.current=audio;audioUrlRef.current=url;audio.onended=()=>{stopAudio();setNote("")};audio.onerror=()=>{stopAudio();setNote("Written reply is available; audio playback failed.")};await audio.play();setNote("Speaking · tap Listen again to replay")}
  catch(error){stopAudio();setNote(errorText(error,"Written reply is available; voice playback failed."));setVoiceState("error")}
 }
 speakRef.current=speak;

 async function transcribe(blob:Blob){
  setVoiceState("transcribing");setNote("Transcribing with a verified free model…");
  try{const audio=await blobToBase64(blob),mediaType=blob.type.split(";")[0]||"audio/webm",response=await fetch("/api/assistant/voice/transcribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({audio,mediaType}),cache:"no-store"}),data=record(await response.json().catch(()=>({})));if(!response.ok)throw new Error(String(data.error||"Transcription failed."));const text=String(data.text||"").trim();if(!text)throw new Error("I couldn't hear any speech in that recording.");if(!setComposerText(text))throw new Error("Open VIVITO before using voice input.");setVoiceState("ready");setNote("Transcript ready — review it, edit if needed, then send.")}
  catch(error){setVoiceState("error");setNote(errorText(error,"Voice transcription failed. You can keep typing normally."))}
 }
 async function startRecording(){
  if(voiceState==="transcribing")return;if(recorderRef.current&&recorderRef.current.state==="recording"){recorderRef.current.stop();return}
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setVoiceState("error");setNote("Microphone recording isn't supported in this browser. Text chat still works normally.");return}
  try{stopAudio();const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}),mimeType=preferredMimeType(),recorder=mimeType?new MediaRecorder(stream,{mimeType}):new MediaRecorder(stream);streamRef.current=stream;recorderRef.current=recorder;chunksRef.current=[];setSeconds(0);setVoiceState("recording");setNote("Listening… tap the mic again to stop.");recorder.ondataavailable=event=>{if(event.data.size)chunksRef.current.push(event.data)};recorder.onerror=()=>{releaseMic();setVoiceState("error");setNote("Recording stopped unexpectedly. Text chat is still available.")};recorder.onstop=()=>{const blob=new Blob(chunksRef.current,{type:recorder.mimeType||"audio/webm"});chunksRef.current=[];releaseMic();if(blob.size<300){setVoiceState("error");setNote("That recording was too short. Try again.");return}void transcribe(blob)};recorder.start(250);timerRef.current=window.setInterval(()=>setSeconds(current=>{const next=current+1;if(next>=MAX_RECORDING_SECONDS&&recorder.state==="recording")recorder.stop();return Math.min(next,MAX_RECORDING_SECONDS)}),1000)}
  catch(error){releaseMic();setVoiceState("error");setNote(error instanceof DOMException&&error.name==="NotAllowedError"?"Microphone permission was denied. Enable it in the browser to use voice input.":errorText(error,"Could not start the microphone."))}
 }

 useEffect(()=>{const enabled=window.localStorage.getItem("vivitoVoiceReplies")==="on";setVoiceReplies(enabled);voiceRepliesRef.current=enabled;return()=>{releaseMic();stopAudio()}},[]);
 useEffect(()=>{voiceRepliesRef.current=voiceReplies;window.localStorage.setItem("vivitoVoiceReplies",voiceReplies?"on":"off")},[voiceReplies]);
 useEffect(()=>{
  const sync=()=>{
   const input=document.querySelector<HTMLElement>(".va-input"),panel=document.querySelector<HTMLElement>(".va-panel");
   if(input){let host=input.querySelector<HTMLElement>(".va-voice-mic-host");if(!host){host=document.createElement("span");host.className="va-voice-mic-host";const send=input.querySelector('button[aria-label="Send"]');input.insertBefore(host,send||null)}if(inputHost!==host)setInputHost(host)}else if(inputHost)setInputHost(null);
   if(panel&&input){let host=panel.querySelector<HTMLElement>(".va-voice-bar-host");if(!host){host=document.createElement("div");host.className="va-voice-bar-host";panel.insertBefore(host,input)}if(barHost!==host)setBarHost(host)}else if(barHost)setBarHost(null);
   const messages=Array.from(document.querySelectorAll<HTMLElement>(".va-row:not(.you) .va-msg.ai"));
   if(panel!==panelRef.current){panelRef.current=panel||null;messages.forEach(message=>knownMessages.current.add(message))}
   else messages.forEach(message=>{const isNew=!knownMessages.current.has(message);knownMessages.current.add(message);if(!message.querySelector(".va-voice-listen")){const button=document.createElement("button");button.type="button";button.className="va-voice-listen";button.setAttribute("aria-label","Listen to this VIVITO reply");button.textContent="◖ Listen";button.onclick=event=>{event.stopPropagation();void speakRef.current(messageText(message))};message.appendChild(button)}if(isNew&&voiceRepliesRef.current){const text=messageText(message);if(text)void speakRef.current(text)}})
  };
  sync();const observer=new MutationObserver(()=>sync());observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()
 },[inputHost,barHost]);

 const micLabel=voiceState==="recording"?`Stop recording · ${mmss(seconds)}`:voiceState==="transcribing"?"Transcribing voice note":"Record voice note";
 const status=voiceState==="recording"?`LISTENING · ${mmss(seconds)} / ${mmss(MAX_RECORDING_SECONDS)}`:voiceState==="transcribing"?"TRANSCRIBING · FREE MODEL":speaking?"VOICE REPLY · PLAYING":voiceState==="ready"?"TRANSCRIPT READY":"VOICE · FREE-ONLY";
 return <>
  {inputHost&&createPortal(<button type="button" className={`va-voice-mic ${voiceState==="recording"?"recording":""}`} onClick={()=>void startRecording()} disabled={voiceState==="transcribing"} aria-pressed={voiceState==="recording"} aria-label={micLabel} title={micLabel}><span className="va-mic-glyph" aria-hidden="true"/></button>,inputHost)}
  {barHost&&createPortal(<div className="va-voice-bar" role="status" aria-live="polite"><div className="va-voice-state"><i className={voiceState==="recording"?"active":""}/><div><b>{status}</b>{note?<span>{note}</span>:<span>Voice is processed for transcription; recordings are not added to workspace files.</span>}</div></div><button type="button" className={voiceReplies?"on":""} aria-pressed={voiceReplies} onClick={()=>{setVoiceReplies(value=>!value);if(speaking)stopAudio()}}><span aria-hidden="true">◖</span> Voice replies <em>{voiceReplies?"ON":"OFF"}</em></button></div>,barHost)}
  <style>{CSS}</style>
 </>
}

const CSS=`
.va-voice-mic-host{display:contents}.va-voice-mic{border:1px solid rgba(255,255,255,.1)!important;width:38px!important;height:38px!important;min-width:38px;border-radius:12px!important;background:rgba(255,255,255,.07)!important;color:#fff!important;display:grid;place-items:center;cursor:pointer;transition:.18s ease}.va-voice-mic:hover{background:rgba(255,255,255,.12)!important}.va-voice-mic:disabled{opacity:.45;cursor:wait}.va-mic-glyph{position:relative;width:10px;height:15px;border:1.8px solid currentColor;border-radius:8px;display:block}.va-mic-glyph:before{content:"";position:absolute;left:50%;bottom:-6px;width:14px;height:8px;border:1.8px solid currentColor;border-top:0;border-radius:0 0 9px 9px;transform:translateX(-50%)}.va-mic-glyph:after{content:"";position:absolute;left:50%;bottom:-9px;width:1.8px;height:4px;background:currentColor;transform:translateX(-50%)}.va-voice-mic.recording{background:rgba(225,70,83,.16)!important;border-color:rgba(255,100,113,.5)!important;box-shadow:0 0 0 5px rgba(225,70,83,.08)}.va-voice-mic.recording .va-mic-glyph{animation:vivitoMicPulse 1s ease-in-out infinite}
.va-voice-bar-host{position:relative;padding:0 10px 7px}.va-voice-bar{min-height:42px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:13px;padding:7px 8px;display:flex;align-items:center;justify-content:space-between;gap:8px}.va-voice-state{min-width:0;display:flex;align-items:center;gap:7px}.va-voice-state>i{width:6px;height:6px;border-radius:50%;background:#7d7181;flex:none}.va-voice-state>i.active{background:#ff6574;box-shadow:0 0 0 5px rgba(255,101,116,.09);animation:vivitoVoiceDot 1s infinite}.va-voice-state div{min-width:0}.va-voice-state b{display:block;font-size:7.5px;letter-spacing:.12em;color:#e6dce9}.va-voice-state span{display:block;margin-top:2px;max-width:245px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8d808f;font-size:8px}.va-voice-bar>button{height:29px;border:1px solid rgba(255,255,255,.09);border-radius:9px;background:rgba(255,255,255,.045);color:#cfc5d2;font-size:8px;font-weight:800;letter-spacing:.03em;padding:0 8px;cursor:pointer;white-space:nowrap}.va-voice-bar>button.on{background:rgba(111,46,121,.24);border-color:rgba(190,118,205,.28);color:#fff}.va-voice-bar>button em{font-style:normal;font-size:6.5px;margin-left:3px;opacity:.65}.va-voice-listen{display:block!important;margin-top:8px!important;padding:4px 7px!important;width:auto!important;height:auto!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:8px!important;background:rgba(255,255,255,.035)!important;color:#aaa0ad!important;font:inherit!important;font-size:8px!important;font-weight:800!important;cursor:pointer!important;white-space:normal!important}.va-voice-listen:hover{color:#fff!important;background:rgba(255,255,255,.07)!important}
@keyframes vivitoMicPulse{50%{transform:scale(.9);opacity:.72}}@keyframes vivitoVoiceDot{50%{opacity:.35}}@media(max-width:560px){.va-voice-bar{min-height:46px}.va-voice-state span{max-width:42vw}.va-voice-bar>button{height:34px;min-width:108px}.va-voice-mic{width:42px!important;height:42px!important;min-width:42px}.va-input>button{width:42px!important;height:42px!important;min-width:42px}}
@media(prefers-reduced-motion:reduce){.va-voice-mic.recording .va-mic-glyph,.va-voice-state>i.active{animation:none}}
`;
