import {NextRequest,NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {GROQ_KEY_COOKIE,groqCookieOptions,sealGroqSecret} from "@/lib/vivito/groq-user-key";

export const dynamic="force-dynamic";
const MODELS_URL="https://api.groq.com/openai/v1/models";

export async function POST(req:NextRequest){
  const session=await getVGroupSession();if(!session)return NextResponse.redirect(new URL("/group/login",req.url),303);
  const form=await req.formData().catch(()=>new FormData());const key=String(form.get("key")||"").trim();
  if(!key)return NextResponse.redirect(new URL("/group/vivito?groq=failed",req.url),303);
  try{
    const r=await fetch(MODELS_URL,{headers:{Authorization:`Bearer ${key}`},cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!r.ok)return NextResponse.redirect(new URL("/group/vivito?groq=failed",req.url),303);
    const response=NextResponse.redirect(new URL("/group/vivito?groq=connected",req.url),303);
    response.cookies.set(GROQ_KEY_COOKIE,sealGroqSecret(key),groqCookieOptions(60*60*24*30));return response;
  }catch{return NextResponse.redirect(new URL("/group/vivito?groq=failed",req.url),303)}
}
