export const dynamic="force-dynamic";

import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {safeGatewayError,verifiedFreeAudioModels,vivitoGatewayToken,VIVITO_FREE_SPEECH_MODELS} from "@/lib/vivito/free-audio";

type JsonRecord=Record<string,unknown>;
const GATEWAY_URL="https://ai-gateway.vercel.sh/v4/ai/speech-model";
const MAX_TEXT=1800;
const record=(value:unknown):JsonRecord=>value&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};
const hasArabic=(value:string)=>/[\u0600-\u06ff]/.test(value);

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const token=vivitoGatewayToken();if(!token)return NextResponse.json({error:"Voice replies are not configured."},{status:503});
 const body=record(await req.json().catch(()=>({}))),text=String(body.text||"").trim().slice(0,MAX_TEXT);if(!text)return NextResponse.json({error:"Nothing to read aloud."},{status:400});
 const models=await verifiedFreeAudioModels("speech",VIVITO_FREE_SPEECH_MODELS);if(!models.length)return NextResponse.json({error:"No verified free speech model is available right now."},{status:503});
 const errors:string[]=[];
 for(const model of models){
  try{
   const response=await fetch(GATEWAY_URL,{method:"POST",signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${token}`,"ai-model-id":model,"Content-Type":"application/json","ai-reporting-tags":"product:vivito,feature:voice-reply,cost-policy:free-only"},body:JSON.stringify({text,outputFormat:"mp3",language:hasArabic(text)?"ar":"en",speed:1})});
   const data=record(await response.json().catch(()=>({})));if(!response.ok){errors.push(`${model}:${safeGatewayError(data)}`);continue}
   const audio=String(data.audio||"");if(!audio){errors.push(`${model}:empty-audio`);continue}
   return NextResponse.json({audio,mediaType:"audio/mpeg",model,warnings:Array.isArray(data.warnings)?data.warnings.slice(0,4):[]},{headers:{"Cache-Control":"private, no-store"}})
  }catch(error){errors.push(`${model}:${error instanceof Error?error.name:"request-failed"}`)}
 }
 console.warn("VIVITO free speech unavailable",errors.slice(-6));return NextResponse.json({error:"Voice playback is temporarily unavailable. The written answer is unchanged."},{status:503,headers:{"Cache-Control":"private, no-store"}})
}
