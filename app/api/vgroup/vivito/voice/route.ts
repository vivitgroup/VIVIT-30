import {NextRequest,NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {synthesizeWithVivitoVoice,transcribeWithVivitoVoice,vivitoVoiceStatus} from "@/lib/vivito/voice-mesh";

export const dynamic="force-dynamic";export const maxDuration=60;
const MAX_AUDIO_BYTES=25*1024*1024;
const AUDIO_TYPES=new Set(["audio/wav","audio/x-wav","audio/mpeg","audio/mp4","audio/webm","audio/ogg","audio/aac","audio/flac","video/mp4","video/webm"]);

export async function GET(){const session=await getVGroupSession();if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});const providers=await vivitoVoiceStatus();return NextResponse.json({ok:providers.some(p=>p.healthy),providers},{headers:{"Cache-Control":"private, no-store"}})}

export async function POST(req:NextRequest){
 const session=await getVGroupSession();if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
 const contentType=String(req.headers.get("content-type")||"");
 try{
  if(contentType.includes("multipart/form-data")){
   const form=await req.formData(),op=String(form.get("op")||"transcribe");if(op!=="transcribe")return NextResponse.json({error:"Unsupported multipart voice operation"},{status:400});
   const file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"Audio file is required"},{status:400});if(file.size<=0||file.size>MAX_AUDIO_BYTES)return NextResponse.json({error:"Audio file must be between 1 byte and 25 MB"},{status:413});
   const mime=String(file.type||"application/octet-stream").toLowerCase();if(!AUDIO_TYPES.has(mime))return NextResponse.json({error:"Unsupported audio/video format"},{status:415});
   const language=String(form.get("language")||"").trim().slice(0,16)||undefined;const result=await transcribeWithVivitoVoice(new Uint8Array(await file.arrayBuffer()),mime,language);
   console.info("VIVITO voice audit",{userId:session.userId,op:"transcribe",provider:result.provider,modelId:result.modelId||null,bytes:file.size,latencyMs:result.durationMs});
   return NextResponse.json({ok:true,text:result.text,provider:result.provider,modelId:result.modelId||null,latencyMs:result.durationMs},{headers:{"Cache-Control":"private, no-store"}})
  }
  const body=await req.json().catch(()=>({})) as {op?:unknown;text?:unknown;voice?:unknown};const op=String(body.op||"");if(op!=="synthesize")return NextResponse.json({error:"Voice operation must be synthesize or multipart transcribe"},{status:400});
  const text=String(body.text||"").trim();if(!text)return NextResponse.json({error:"Text is required"},{status:400});if(text.length>6000)return NextResponse.json({error:"Text is too long"},{status:413});const voice=String(body.voice||"").trim().slice(0,120)||undefined;
  const result=await synthesizeWithVivitoVoice(text,voice);console.info("VIVITO voice audit",{userId:session.userId,op:"synthesize",provider:result.provider,modelId:result.modelId||null,chars:text.length,latencyMs:result.durationMs});
  return new NextResponse(Buffer.from(result.audio),{status:200,headers:{"Content-Type":result.contentType,"Cache-Control":"private, no-store","X-Vivito-Voice-Provider":result.provider,"X-Vivito-Voice-Model":result.modelId||""}})
 }catch(error:unknown){const message=error instanceof Error?error.message:"voice-operation-failed";console.warn("VIVITO voice failed",{userId:session.userId,error:message.slice(0,180)});return NextResponse.json({error:"Voice engine is temporarily unavailable",code:message.startsWith("vivito-voice-")?message.split(":")[0]:"voice-provider-failed"},{status:503,headers:{"Cache-Control":"private, no-store"}})}
}
