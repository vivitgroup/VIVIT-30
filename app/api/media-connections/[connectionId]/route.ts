export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,adPlatformConnections,clients,auditLogs} from "@/lib/db";
import {and,eq} from "drizzle-orm";

const ALLOWED=new Set(["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"]);

export async function PATCH(req:NextRequest,{params}:{params:Promise<{connectionId:string}>}){
 const session=await auth();
 if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String(session.user.role||""),userId=String(session.user.id||""),workspaceId=String(session.user.workspaceId||"").trim();
 if(!workspaceId||!userId)return NextResponse.json({error:"Workspace context is required"},{status:403});
 if(!ALLOWED.has(role))return NextResponse.json({error:"You do not have permission to rename media accounts."},{status:403});
 const {connectionId}=await params;
 const body=await req.json().catch(()=>null),accountName=String(body?.accountName||"").trim().replace(/\s+/g," ");
 if(!accountName)return NextResponse.json({error:"Account name is required."},{status:400});
 if(accountName.length>160)return NextResponse.json({error:"Account name must be 160 characters or fewer."},{status:400});
 const [connection]=await db.select({id:adPlatformConnections.id,clientId:adPlatformConnections.clientId,accountName:adPlatformConnections.accountName,adAccountId:adPlatformConnections.adAccountId,platform:adPlatformConnections.platform}).from(adPlatformConnections).where(and(eq(adPlatformConnections.id,connectionId),eq(adPlatformConnections.workspaceId,workspaceId))).limit(1);
 if(!connection)return NextResponse.json({error:"Media account not found."},{status:404});
 if(role!=="SUPER_ADMIN"){
  if(!connection.clientId)return NextResponse.json({error:"This media account is not assigned to a client."},{status:403});
  const ownerFilter=role==="MEDIA_BUYER"?eq(clients.mediaBuyerId,userId):eq(clients.accountManagerId,userId);
  const [owned]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,connection.clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),ownerFilter)).limit(1);
  if(!owned)return NextResponse.json({error:"Client access denied."},{status:403});
 }
 const [updated]=await db.update(adPlatformConnections).set({accountName,updatedAt:new Date()}).where(and(eq(adPlatformConnections.id,connectionId),eq(adPlatformConnections.workspaceId,workspaceId))).returning({id:adPlatformConnections.id,accountName:adPlatformConnections.accountName});
 if(!updated)return NextResponse.json({error:"Media account could not be updated."},{status:409});
 await db.insert(auditLogs).values({workspaceId,userId,action:"media_account_renamed",entity:"ad_platform_connections",entityId:connectionId,newValues:JSON.stringify({before:connection.accountName||null,after:accountName,platform:connection.platform,adAccountId:connection.adAccountId})});
 return NextResponse.json({success:true,account:updated},{headers:{"Cache-Control":"private, no-store"}});
}
