import {NextRequest,NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {createOpenRouterPkce,OPENROUTER_PKCE_COOKIE,openRouterCookieOptions,sealOpenRouterSecret} from "@/lib/vivito/openrouter-oauth";

export const dynamic="force-dynamic";
export async function GET(req:NextRequest){const session=await getVGroupSession();if(!session)return NextResponse.redirect(new URL("/group/login",req.url));const {verifier,challenge,state}=createOpenRouterPkce();const callback=new URL("/api/vivito/openrouter/callback",req.nextUrl.origin);callback.searchParams.set("state",state);const authorize=new URL("https://openrouter.ai/auth");authorize.searchParams.set("callback_url",callback.toString());authorize.searchParams.set("code_challenge",challenge);authorize.searchParams.set("code_challenge_method","S256");const response=NextResponse.redirect(authorize);response.cookies.set(OPENROUTER_PKCE_COOKIE,sealOpenRouterSecret(JSON.stringify({verifier,state,createdAt:Date.now()})),openRouterCookieOptions(600));return response}
