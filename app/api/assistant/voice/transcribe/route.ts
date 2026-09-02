export const dynamic="force-dynamic";

import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {safeGatewayError,verifiedFreeAudioModels,vivitoGatewayToken,VIVITO_FREE_TRANSCRIPTION_MODELS} from "@/lib/vivito/free-audio";

type JsonRecord=Record<string,unknown>;
const GATEWAY_URL="https://ai-gateway.vercel.sh/v4/ai/transcription-model";
const MAX_BASE64_CHARS=6_500_000;
const ALLOWED_MEDIA=new Set(["audio/webm","audio/mp4","audio/mpeg","audio/ogg","audio/wav","audio/x-wav","audio/aac"]);
const record=(value:unknown):JsonRecord=>value&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const token=vivitoGatewayToken();if(!token)return NextResponse.json({error:"Voice transcription is not configured."},{status:503});
 const body=record(await req.json().catch(()=>({}))),audio=String(body.audio||""),mediaType=String(body.mediaType||"").split(";")[0].toLowerCase();
 if(!audio||audio.length>MAX_BASE64_CHARS)return NextResponse.json({error:"Voice note is empty or too large. Keep recordings under 90 seconds."},{status:413});
 if(!ALLOWED_MEDIA.has(mediaType))return NextResponse.json({error:"Unsupported audio format."},{status:415});
 const models=await verifiedFreeAudioModels("transcription",VIVITO_FREE_TRANSCRIPTION_MODELS);if(!models.length)return NextResponse.json({error:"No verified free transcription model is available right now."},{status:503});
 const errors:string[]=[];
 for(const model of models){
  try{
   const response=await fetch(GATEWAY_URL,{method:"POST",signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${token}`,"ai-model-id":model,"Content-Type":"application/json","ai-reporting-tags":"product:vivito,feature:voice-input,cost-policy:free-only"},body:JSON.stringify({audio,mediaType})});
   const data=record(await response.json().catch(()=>({})));if(!response.ok){errors.push(`${model}:${safeGatewayError(data)}`);continue}
   const text=String(data.text||"").trim();if(!text){errors.push(`${model}:empty-transcript`);continue}
   return NextResponse.json({text,language:String(data.language||""),durationInSeconds:Number(data.durationInSeconds||0),model},{headers:{"Cache-Control":"private, no-store"}})
  }catch(error){errors.push(`${model}:${error instanceof Error?error.name:"request-failed"}`)}
 }
 console.warn("VIVITO free transcription unavailable",errors.slice(-4));return NextResponse.json({error:"I couldn't transcribe that recording. Your typed chat is still available."},{status:503,headers:{"Cache-Control":"private, no-store"}})
}
