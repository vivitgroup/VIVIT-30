export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,adPlatformConnections} from "@/lib/db";
import {eq} from "drizzle-orm";
import {platformConfigured} from "@/lib/ad-platforms";
import {oauthConfigured} from "@/lib/ad-oauth";

const allowedRoles=new Set(["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"]);
const platforms=["META","TIKTOK","GOOGLE","SNAPCHAT","LINKEDIN"] as const;

export async function GET(){
 const session=await auth();
 if(!session?.user||!allowedRoles.has(String(session.user.role||"")))return NextResponse.json({error:"Unauthorized"},{status:401});
 const workspaceId=String(session.user.workspaceId||"").trim();
 if(!workspaceId)return NextResponse.json({error:"Workspace context is required"},{status:403});
 const reusableRows=await db.select({platform:adPlatformConnections.platform,accessTokenEncrypted:adPlatformConnections.accessTokenEncrypted}).from(adPlatformConnections).where(eq(adPlatformConnections.workspaceId,workspaceId)).limit(500);
 const reusable=new Set(reusableRows.filter(row=>Boolean(row.accessTokenEncrypted)).map(row=>String(row.platform)));
 const serverAccess=Object.fromEntries(platforms.map(platform=>[platform,platformConfigured(platform)||reusable.has(platform)]));
 const oauth=Object.fromEntries(platforms.map(platform=>[platform,oauthConfigured(platform)]));
 const workspaceAuthorization=Object.fromEntries(platforms.map(platform=>[platform,reusable.has(platform)]));
 return NextResponse.json({serverAccess,oauth,workspaceAuthorization},{headers:{"Cache-Control":"private, no-store"}});
}
