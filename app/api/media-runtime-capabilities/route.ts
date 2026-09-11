export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {platformConfigured} from "@/lib/ad-platforms";
import {oauthConfigured} from "@/lib/ad-oauth";

const allowedRoles=new Set(["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"]);
const platforms=["META","TIKTOK","GOOGLE","SNAPCHAT","LINKEDIN"] as const;

export async function GET(){
 const session=await auth();
 if(!session?.user||!allowedRoles.has(String(session.user.role||"")))return NextResponse.json({error:"Unauthorized"},{status:401});
 const serverAccess=Object.fromEntries(platforms.map(platform=>[platform,platformConfigured(platform)]));
 const oauth=Object.fromEntries(platforms.map(platform=>[platform,oauthConfigured(platform)]));
 return NextResponse.json({serverAccess,oauth},{headers:{"Cache-Control":"private, no-store"}});
}
