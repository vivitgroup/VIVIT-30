import crypto from "crypto";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {authorizationUrl,oauthConfigured,signState,OAuthPlatform} from "@/lib/ad-oauth";
import {db,clients} from "@/lib/db";
import {and,eq} from "drizzle-orm";

const allowed=["META","TIKTOK","GOOGLE","SNAPCHAT","LINKEDIN"];
const stateCookieName=(platform:OAuthPlatform)=>`vivit_oauth_state_${platform.toLowerCase()}`;
const stateDigest=(state:string)=>crypto.createHash("sha256").update(state).digest("base64url");

export async function GET(req:NextRequest,{params}:{params:Promise<{platform:string}>}){
 const session=await auth();if(!session?.user)return NextResponse.redirect(new URL("/login",req.url));
 const role=String(session.user.role||""),userId=String(session.user.id||""),workspaceId=String(session.user.workspaceId||"").trim();
 if(!workspaceId)return NextResponse.redirect(new URL("/dashboard?oauth=workspace-missing",req.url));
 if(!["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"].includes(role))return NextResponse.redirect(new URL("/dashboard?oauth=forbidden",req.url));
 const {platform:raw}=await params,platform=raw.toUpperCase() as OAuthPlatform;if(!allowed.includes(platform))return NextResponse.json({error:"Unsupported platform"},{status:400});
 if(!oauthConfigured(platform))return NextResponse.redirect(new URL(`/dashboard/media/sync?oauth=missing&platform=${platform}`,req.url));
 const clientId=req.nextUrl.searchParams.get("clientId")||"",requestedAccountId=req.nextUrl.searchParams.get("adAccountId")||"",accountName=(req.nextUrl.searchParams.get("accountName")||"").slice(0,160),adAccountId=requestedAccountId.replace(/^act_/i,"")||(platform==="SNAPCHAT"?"auto":"");
 if(!clientId||!adAccountId)return NextResponse.redirect(new URL("/dashboard/media/sync?oauth=missing-account",req.url));
 const roleScope=role==="MEDIA_BUYER"?eq(clients.mediaBuyerId,userId):role==="ACCOUNT_MANAGER"?eq(clients.accountManagerId,userId):eq(clients.workspaceId,workspaceId);
 const access=and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),roleScope);
 if(!(await db.select({id:clients.id}).from(clients).where(access).limit(1))[0])return NextResponse.redirect(new URL("/dashboard/media/sync?oauth=forbidden",req.url));
 let state:string,authorizeUrl:string;
 try{state=signState({platform,clientId,adAccountId,accountName,userId});authorizeUrl=authorizationUrl(platform,state)}catch(error){console.error("OAuth start configuration error",error instanceof Error?error.message:"unknown");return NextResponse.redirect(new URL(`/dashboard/media/sync?oauth=missing&platform=${platform}`,req.url))}
 const response=NextResponse.redirect(authorizeUrl);
 response.cookies.set(stateCookieName(platform),stateDigest(state),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:10*60,path:`/api/ad-oauth/${platform.toLowerCase()}/callback`});
 return response;
}
