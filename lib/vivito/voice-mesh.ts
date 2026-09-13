export type VivitoVoiceProvider="voder"|"vox"|"audio-cpp";
export type VoiceProviderStatus={provider:VivitoVoiceProvider;configured:boolean;healthy:boolean;url?:string;detail?:string};
export type VoiceTranscript={text:string;provider:VivitoVoiceProvider;modelId?:string;durationMs:number};
export type VoiceSynthesis={audio:Uint8Array;contentType:string;provider:VivitoVoiceProvider;modelId?:string;durationMs:number};

type ProviderConfig={provider:VivitoVoiceProvider;url:string;token?:string};
const trimUrl=(value:string)=>String(value||"").trim().replace(/\/$/,"");
const configuredProviders=():ProviderConfig[]=>{
 const providers:ProviderConfig[]=[
  {provider:"voder",url:trimUrl(process.env.VIVITO_VODER_URL||""),token:String(process.env.VIVITO_VODER_TOKEN||"").trim()||undefined},
  {provider:"vox",url:trimUrl(process.env.VIVITO_VOX_URL||"")},
  {provider:"audio-cpp",url:trimUrl(process.env.VIVITO_AUDIOCPP_URL||"")},
 ];
 return providers.filter(x=>Boolean(x.url));
};
const headers=(cfg:ProviderConfig,extra:Record<string,string>={})=>({...extra,...(cfg.token?{Authorization:`Bearer ${cfg.token}`}:{})});
const timeout=(ms:number)=>AbortSignal.timeout(Math.max(1500,Math.min(ms,45000)));

export function vivitoVoiceConfigured(){return configuredProviders().length>0}

export async function vivitoVoiceStatus():Promise<VoiceProviderStatus[]>{
 const all:[VivitoVoiceProvider,string,string?][]=[
  ["voder",trimUrl(process.env.VIVITO_VODER_URL||""),String(process.env.VIVITO_VODER_TOKEN||"").trim()||undefined],
  ["vox",trimUrl(process.env.VIVITO_VOX_URL||"")],
  ["audio-cpp",trimUrl(process.env.VIVITO_AUDIOCPP_URL||"")],
 ];
 return Promise.all(all.map(async([provider,url,token])=>{
  if(!url)return{provider,configured:false,healthy:false};
  try{const r=await fetch(`${url}/health`,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:"no-store",signal:timeout(3500)});return{provider,configured:true,healthy:r.ok,url,detail:r.ok?"ready":`http-${r.status}`}}catch{return{provider,configured:true,healthy:false,url,detail:"unreachable"}}
 }));
}

async function transcribeVoderOrVox(cfg:ProviderConfig,audio:Uint8Array,mimeType:string,language?:string):Promise<VoiceTranscript>{
 const started=Date.now(),params=new URLSearchParams();if(language)params.set("language",language);
 const endpoint=`${cfg.url}/v1/transcribe${params.size?`?${params}`:""}`;
 const r=await fetch(endpoint,{method:"POST",headers:headers(cfg,{"Content-Type":mimeType||"application/octet-stream"}),body:Buffer.from(audio),cache:"no-store",signal:timeout(30000)});
 const raw=await r.text();if(!r.ok)throw new Error(`${cfg.provider}-transcribe-${r.status}`);
 let text=raw;let modelId:undefined|string;try{const d=JSON.parse(raw) as {text?:unknown;transcript?:unknown;model?:unknown};text=String(d.text||d.transcript||"").trim();modelId=d.model?String(d.model):undefined}catch{}
 if(!text.trim())throw new Error(`${cfg.provider}-empty-transcript`);return{text:text.trim(),provider:cfg.provider,modelId,durationMs:Date.now()-started};
}

async function transcribeAudioCpp(cfg:ProviderConfig,audio:Uint8Array,mimeType:string,language?:string):Promise<VoiceTranscript>{
 const started=Date.now(),form=new FormData();
 const model=String(process.env.VIVITO_AUDIOCPP_ASR_MODEL||"qwen3-asr").trim();form.set("model",model);if(language)form.set("language",language);form.set("file",new Blob([Buffer.from(audio)],{type:mimeType||"audio/wav"}),"input.wav");
 const r=await fetch(`${cfg.url}/v1/audio/transcriptions`,{method:"POST",headers:headers(cfg),body:form,cache:"no-store",signal:timeout(30000)});const raw=await r.text();if(!r.ok)throw new Error(`audio-cpp-transcribe-${r.status}`);
 let text=raw;try{const d=JSON.parse(raw) as {text?:unknown};text=String(d.text||"").trim()}catch{}if(!text.trim())throw new Error("audio-cpp-empty-transcript");return{text:text.trim(),provider:"audio-cpp",modelId:model,durationMs:Date.now()-started};
}

export async function transcribeWithVivitoVoice(audio:Uint8Array,mimeType="audio/wav",language?:string):Promise<VoiceTranscript>{
 const errors:string[]=[];for(const cfg of configuredProviders()){try{return cfg.provider==="audio-cpp"?await transcribeAudioCpp(cfg,audio,mimeType,language):await transcribeVoderOrVox(cfg,audio,mimeType,language)}catch(error){errors.push(`${cfg.provider}:${error instanceof Error?error.message:"failed"}`)}}throw new Error(`vivito-voice-transcription-unavailable:${errors.join("|")||"no-provider"}`)
}

async function synthVoderOrVox(cfg:ProviderConfig,text:string,voice?:string):Promise<VoiceSynthesis>{
 const started=Date.now();const r=await fetch(`${cfg.url}/v1/synthesize`,{method:"POST",headers:headers(cfg,{"Content-Type":"application/json"}),body:JSON.stringify({text,voice:voice||undefined}),cache:"no-store",signal:timeout(30000)});if(!r.ok)throw new Error(`${cfg.provider}-synthesize-${r.status}`);const audio=new Uint8Array(await r.arrayBuffer());if(!audio.byteLength)throw new Error(`${cfg.provider}-empty-audio`);return{audio,contentType:r.headers.get("content-type")||"audio/wav",provider:cfg.provider,modelId:r.headers.get("x-model-id")||undefined,durationMs:Date.now()-started};
}
async function synthAudioCpp(cfg:ProviderConfig,text:string,voice?:string):Promise<VoiceSynthesis>{
 const started=Date.now(),model=String(process.env.VIVITO_AUDIOCPP_TTS_MODEL||"pocket-tts").trim();const body:Record<string,unknown>={model,input:text};if(voice)body.voice=voice;
 const r=await fetch(`${cfg.url}/v1/audio/speech`,{method:"POST",headers:headers(cfg,{"Content-Type":"application/json"}),body:JSON.stringify(body),cache:"no-store",signal:timeout(30000)});if(!r.ok)throw new Error(`audio-cpp-synthesize-${r.status}`);const audio=new Uint8Array(await r.arrayBuffer());if(!audio.byteLength)throw new Error("audio-cpp-empty-audio");return{audio,contentType:r.headers.get("content-type")||"audio/wav",provider:"audio-cpp",modelId:model,durationMs:Date.now()-started};
}
export async function synthesizeWithVivitoVoice(text:string,voice?:string):Promise<VoiceSynthesis>{const clean=String(text||"").trim().slice(0,6000);if(!clean)throw new Error("voice-text-required");const errors:string[]=[];for(const cfg of configuredProviders()){try{return cfg.provider==="audio-cpp"?await synthAudioCpp(cfg,clean,voice):await synthVoderOrVox(cfg,clean,voice)}catch(error){errors.push(`${cfg.provider}:${error instanceof Error?error.message:"failed"}`)}}throw new Error(`vivito-voice-synthesis-unavailable:${errors.join("|")||"no-provider"}`)}
