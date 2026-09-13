"use client";

import {useRef,useState} from "react";

type Message={who:"you"|"vivito";text:string;modelId?:string|null};
type RecognitionResultEvent={results:ArrayLike<{0?:{transcript?:string};isFinal?:boolean}>};
type BrowserRecognition={lang:string;interimResults:boolean;continuous:boolean;onresult:((event:RecognitionResultEvent)=>void)|null;onerror:(()=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
type RecognitionCtor=new()=>BrowserRecognition;

export function GroupVivitoChat({initialWorkspace="group"}:{initialWorkspace?:string}){
  const [workspace,setWorkspace]=useState(initialWorkspace);
  const [question,setQuestion]=useState("");
  const [busy,setBusy]=useState(false);
  const [recording,setRecording]=useState(false);
  const [voiceBusy,setVoiceBusy]=useState(false);
  const [messages,setMessages]=useState<Message[]>([]);
  const recorderRef=useRef<MediaRecorder|null>(null),streamRef=useRef<MediaStream|null>(null),chunksRef=useRef<Blob[]>([]),recognitionRef=useRef<BrowserRecognition|null>(null);
  async function send(text=question){
    const q=text.trim();if(!q||busy)return;setQuestion("");setBusy(true);setMessages(m=>[...m,{who:"you",text:q}]);
    try{
      const response=await fetch("/api/vgroup/vivito/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:q,workspace}),cache:"no-store"});
      const data=await response.json().catch(()=>({}));
      setMessages(m=>[...m,{who:"vivito",text:String(data.answer||data.error||"VIVITO could not complete the request."),modelId:data.modelId||null}]);
    }catch{setMessages(m=>[...m,{who:"vivito",text:"Connection interrupted. Please retry."}])}
    finally{setBusy(false)}
  }
  async function transcribe(blob:Blob){
    if(!blob.size)return;setVoiceBusy(true);try{const form=new FormData();form.set("op","transcribe");form.set("file",new File([blob],"voice.webm",{type:blob.type||"audio/webm"}));const r=await fetch("/api/vgroup/vivito/voice",{method:"POST",body:form,cache:"no-store"});const d=await r.json().catch(()=>({}));if(!r.ok||!d.text)throw new Error(String(d.error||"Voice transcription failed"));await send(String(d.text))}catch{setMessages(m=>[...m,{who:"vivito",text:"The local voice worker is not reachable yet. On supported browsers the microphone uses the browser speech engine automatically; otherwise type the request until the VODER worker is online."}])}finally{setVoiceBusy(false)}}
  function recognitionCtor():RecognitionCtor|null{if(typeof window==="undefined")return null;const browserWindow=window as unknown as {SpeechRecognition?:RecognitionCtor;webkitSpeechRecognition?:RecognitionCtor};return browserWindow.SpeechRecognition||browserWindow.webkitSpeechRecognition||null}
  function startBrowserRecognition(Ctor:RecognitionCtor){
    const recognition=new Ctor();recognitionRef.current=recognition;recognition.lang=/^ar/i.test(navigator.language||"")?"ar-EG":"en-US";recognition.interimResults=false;recognition.continuous=false;
    recognition.onresult=event=>{let text="";for(let i=0;i<event.results.length;i++){text+=String(event.results[i]?.[0]?.transcript||"")}const clean=text.trim();if(clean)void send(clean)};
    recognition.onerror=()=>{setRecording(false);recognitionRef.current=null;setMessages(m=>[...m,{who:"vivito",text:"Browser speech recognition could not hear that. Try the microphone again or type the request."}])};
    recognition.onend=()=>{setRecording(false);recognitionRef.current=null};recognition.start();setRecording(true);
  }
  async function toggleRecording(){
    if(recording){recognitionRef.current?.stop();recorderRef.current?.stop();setRecording(false);return}
    const Recognition=recognitionCtor();if(Recognition){startBrowserRecognition(Recognition);return}
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setMessages(m=>[...m,{who:"vivito",text:"Voice recording is not supported by this browser."}]);return}
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});streamRef.current=stream;chunksRef.current=[];const preferred=["audio/webm;codecs=opus","audio/mp4","audio/webm"].find(t=>MediaRecorder.isTypeSupported(t));const recorder=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined);recorderRef.current=recorder;recorder.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)};recorder.onstop=()=>{const type=recorder.mimeType||chunksRef.current[0]?.type||"audio/webm";const blob=new Blob(chunksRef.current,{type});stream.getTracks().forEach(track=>track.stop());streamRef.current=null;void transcribe(blob)};recorder.start();setRecording(true)}catch{setMessages(m=>[...m,{who:"vivito",text:"Microphone access was not granted."}])}
  }
  function browserSpeak(text:string){if(typeof window==="undefined"||!("speechSynthesis" in window))return false;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text.slice(0,6000));utterance.lang=/[\u0600-\u06ff]/.test(text)?"ar-EG":"en-US";window.speechSynthesis.speak(utterance);return true}
  async function speak(text:string){setVoiceBusy(true);try{const r=await fetch("/api/vgroup/vivito/voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({op:"synthesize",text}),cache:"no-store"});if(!r.ok)throw new Error("voice-worker-unavailable");const blob=await r.blob(),url=URL.createObjectURL(blob),audio=new Audio(url);audio.onended=()=>URL.revokeObjectURL(url);audio.onerror=()=>URL.revokeObjectURL(url);await audio.play()}catch{if(!browserSpeak(text))setMessages(m=>[...m,{who:"vivito",text:"Voice playback is not supported by this browser and the local voice worker is offline."}])}finally{setVoiceBusy(false)}}
  const quick=["Give me an executive pulse","What needs attention today?","Top 5 priority decisions","Summarize risks across my workspaces"];
  return <section style={{border:"1px solid #263244",borderRadius:28,background:"rgba(12,17,25,.92)",overflow:"hidden",boxShadow:"0 30px 90px rgba(0,0,0,.34)"}}>
    <div style={{padding:20,borderBottom:"1px solid #202b3a",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><b style={{fontSize:20}}>VIVITO Chat</b><div style={{fontSize:12,color:"#8da2ba",marginTop:4}}>Live AI · role-aware · workspace-scoped · voice mesh</div></div><select value={workspace} onChange={e=>setWorkspace(e.target.value)} style={{background:'#0a1018',color:'#fff',border:'1px solid #2c3a4f',borderRadius:12,padding:'10px 12px'}}><option value="group">Vivit Group</option><option value="marketing">Vivit Marketing</option><option value="tech">Vivit Technology</option><option value="hospitality">Vivit Hospitality</option></select></div>
    <div style={{padding:16,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8,borderBottom:"1px solid #202b3a"}}>{quick.map(q=><button key={q} onClick={()=>send(q)} disabled={busy} style={{textAlign:'left',padding:'12px 14px',borderRadius:14,border:'1px solid #2a3648',background:'#111823',color:'#dce8f7',cursor:'pointer'}}>{q} ↗</button>)}</div>
    <div style={{minHeight:360,maxHeight:560,overflowY:'auto',padding:18,display:'flex',flexDirection:'column',gap:14}}>{messages.length===0?<div style={{margin:'auto',textAlign:'center',color:'#75869a'}}><div style={{fontSize:30,fontWeight:900,color:'#f8fbff'}}>Ask VIVITO anything.</div><p style={{maxWidth:520,lineHeight:1.6}}>Type or speak. Voice goes through browser speech when available, then VODER/Vox/audio.cpp as the server-side mesh. ERP scope and action permissions stay unchanged.</p></div>:messages.map((m,i)=><div key={i} style={{alignSelf:m.who==='you'?'flex-end':'flex-start',maxWidth:'86%'}}><div style={{fontSize:10,letterSpacing:'.14em',color:'#72849b',marginBottom:5}}>{m.who==='you'?'YOU':'VIVITO'}</div><div style={{whiteSpace:'pre-wrap',lineHeight:1.65,padding:'13px 15px',borderRadius:16,background:m.who==='you'?'linear-gradient(135deg,#17345f,#244d87)':'#151c27',border:'1px solid #2a3648'}}>{m.text}</div>{m.who==='vivito'&&<button onClick={()=>speak(m.text)} disabled={voiceBusy} style={{marginTop:6,border:'1px solid #2a3648',borderRadius:10,background:'#0c131d',color:'#8bd3ff',padding:'6px 9px',fontSize:11,cursor:'pointer'}}>🔊 Listen</button>}{m.modelId&&<div style={{fontSize:10,color:'#5f7289',marginTop:5}}>model: {m.modelId}</div>}</div>)}{busy&&<div style={{color:'#8bd3ff'}}>VIVITO is thinking…</div>}{voiceBusy&&<div style={{color:'#8bd3ff'}}>Voice engine is working…</div>}</div>
    <div style={{padding:16,borderTop:'1px solid #202b3a',display:'flex',gap:10,alignItems:'stretch'}}><button onClick={toggleRecording} disabled={busy||voiceBusy} aria-label={recording?'Stop recording':'Start voice message'} style={{minWidth:54,border:'1px solid #2c3a4f',borderRadius:16,background:recording?'#8b2432':'#111823',color:'#fff',fontWeight:900,cursor:'pointer'}}>{recording?'■':'🎙️'}</button><textarea value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}} placeholder={recording?"Listening…":"Ask, teach, command, or use the microphone…"} rows={2} style={{flex:1,resize:'none',borderRadius:16,border:'1px solid #2c3a4f',background:'#080d14',color:'#fff',padding:'13px 14px',fontSize:15}}/><button onClick={()=>send()} disabled={busy||!question.trim()} style={{minWidth:96,border:0,borderRadius:16,background:'linear-gradient(135deg,#2385ff,#56c8ff)',color:'#06111f',fontWeight:950,cursor:'pointer'}}>Send</button></div>
  </section>;
}
