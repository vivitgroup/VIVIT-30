import {NextRequest,NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {OPENROUTER_KEY_COOKIE,openRouterCookieOptions,sealOpenRouterSecret} from "@/lib/vivito/openrouter-oauth";

export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
  const session=await getVGroupSession();
  if(!session)return NextResponse.redirect(new URL("/group/login",req.url),303);
  const isGroupSuperAdmin=session.memberships.some(m=>String(m.role)==="GROUP_SUPER_ADMIN");
  if(!isGroupSuperAdmin)return NextResponse.redirect(new URL("/group/vivito?openrouter=forbidden",req.url),303);

  const form=await req.formData();
  const apiKey=String(form.get("apiKey")||"").trim();
  if(!apiKey||apiKey.length<20)return NextResponse.redirect(new URL("/group/vivito?openrouter=invalid",req.url),303);

  try{
    const probe=await fetch("https://openrouter.ai/api/v1/key",{
      method:"GET",
      headers:{Authorization:`Bearer ${apiKey}`,Accept:"application/json"},
      cache:"no-store",
      signal:AbortSignal.timeout(10000)
    });
    if(!probe.ok)return NextResponse.redirect(new URL("/group/vivito?openrouter=invalid",req.url),303);
    const response=NextResponse.redirect(new URL("/group/vivito?openrouter=connected",req.url),303);
    response.cookies.set(OPENROUTER_KEY_COOKIE,sealOpenRouterSecret(apiKey),openRouterCookieOptions(60*60*24*30));
    return response;
  }catch{
    return NextResponse.redirect(new URL("/group/vivito?openrouter=failed",req.url),303);
  }
}
