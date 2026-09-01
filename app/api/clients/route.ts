export const dynamic="force-dynamic";
import { NextRequest,NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db,clients,contacts,auditLogs,users,sql } from "@/lib/db";
import {and,eq,ilike,inArray} from "drizzle-orm";
import {hasEffectiveRole} from "@/lib/session-access";

const str=(v:unknown,n=500)=>String(v??"").trim().slice(0,n);
const num=(v:unknown)=>{const n=Number(v??0);return Number.isFinite(n)&&n>=0?n:0};
const date=(v:unknown)=>v&&!Number.isNaN(new Date(String(v)).getTime())?new Date(String(v)):null;
const sessionScope=async()=>{const session=await auth();if(!session?.user)return null;const workspaceId=str(session.user.workspaceId,160);if(!workspaceId)return null;return{session,workspaceId,role:String(session.user.role??""),userId:session.user.id}};
const validUrl=(value:string)=>{try{const u=new URL(value);return u.protocol==="https:"||u.protocol==="http:"}catch{return false}};
type CompetitorInput={name:string;facebook:string;instagram:string;tiktok:string};

const parseBody=async(req:NextRequest):Promise<Record<string,unknown>|null>=>{
 const value:unknown=await req.json().catch(()=>null);
 return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
};
const parseCompetitors=(value:unknown):CompetitorInput[]|null=>{
 if(!Array.isArray(value)||value.length<1||value.length>5)return null;
 const parsed=value.map(item=>{const row=item&&typeof item==="object"&&!Array.isArray(item)?item as Record<string,unknown>:{};return{name:str(row.name,160),facebook:str(row.facebook,700),instagram:str(row.instagram,700),tiktok:str(row.tiktok,700)}});
 if(parsed.some(item=>item.name.length<2||!item.facebook||!item.instagram||!item.tiktok||![item.facebook,item.instagram,item.tiktok].every(validUrl)))return null;
 return parsed;
};

export async function GET(){
  const s=await sessionScope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {session,workspaceId,role,userId}=s;
  if(!hasEffectiveRole(session.user,["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","ACCOUNTANT","CREATOR","CLIENT"]))return NextResponse.json({clients:[]});
  let rows:{id:string;companyName:string}[]=[];
  if(role==="CREATOR"){
    const {creativeTasks}=await import("@/lib/db");
    const taskRows=await db.select({clientId:creativeTasks.clientId}).from(creativeTasks).where(and(eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.assignedToId,userId)));
    const ids=[...new Set(taskRows.map(t=>t.clientId))];
    rows=ids.length?await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),inArray(clients.id,ids))):[];
  }else{
    const base=and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true));
    const roleFilter=role==="ACCOUNT_MANAGER"?eq(clients.accountManagerId,userId):role==="MEDIA_BUYER"?eq(clients.mediaBuyerId,userId):role==="CLIENT"?eq(clients.userId,userId):undefined;
    rows=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(base,roleFilter));
  }
  return NextResponse.json({clients:rows},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:NextRequest){
  const s=await sessionScope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {session,workspaceId,role,userId}=s;
  if(!hasEffectiveRole(session.user,["SUPER_ADMIN","ACCOUNT_MANAGER","ACCOUNTANT"]))return NextResponse.json({error:"You do not have permission to add clients."},{status:403});
  const b=await parseBody(req);if(!b)return NextResponse.json({error:"Invalid form data."},{status:400});
  const companyName=str(b.companyName,160);if(companyName.length<2)return NextResponse.json({error:"Company name is required."},{status:400});
  const competitors=parseCompetitors(b.competitors);if(!competitors)return NextResponse.json({error:"Add between 1 and 5 competitors. Every competitor requires a name plus valid Facebook, Instagram and TikTok links."},{status:400});
  const reportFrequency=str(b.reportFrequency,30)||"WEEKLY";if(!["DAILY","EVERY_3_DAYS","WEEKLY"].includes(reportFrequency))return NextResponse.json({error:"Choose a valid Vivito report frequency."},{status:400});
  const duplicate=await db.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,workspaceId),ilike(clients.companyName,companyName))).limit(1);
  if(duplicate[0])return NextResponse.json({error:"A client with this company name already exists.",clientId:duplicate[0].id},{status:409});
  const hasMarketingRole=hasEffectiveRole(session.user,["SUPER_ADMIN","ACCOUNT_MANAGER"]);
  const canSetupMarketing=hasMarketingRole||role!=="ACCOUNTANT";
  const portalUserId=canSetupMarketing?(str(b.portalUserId,80)||null):null;
  if(portalUserId){
    const [portalUser]=await db.select({id:users.id}).from(users).where(and(eq(users.id,portalUserId),eq(users.workspaceId,workspaceId),eq(users.role,"CLIENT"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);
    if(!portalUser)return NextResponse.json({error:"Choose a valid active approved client portal user."},{status:400});
    const existingLink=await db.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.userId,portalUserId))).limit(1);
    if(existingLink[0])return NextResponse.json({error:"This portal user is already linked to another client."},{status:409});
  }
  const isEffectiveAccountManager=hasEffectiveRole(session.user,["ACCOUNT_MANAGER"]);
  const accountManagerId=canSetupMarketing?(isEffectiveAccountManager&&!hasEffectiveRole(session.user,["SUPER_ADMIN"])?userId:str(b.accountManagerId,80)||null):null;
  const mediaBuyerId=canSetupMarketing?(str(b.mediaBuyerId,80)||null):null;
  if(accountManagerId){const [manager]=await db.select({id:users.id}).from(users).where(and(eq(users.id,accountManagerId),eq(users.workspaceId,workspaceId),eq(users.role,"ACCOUNT_MANAGER"),eq(users.isActive,true))).limit(1);if(!manager)return NextResponse.json({error:"Choose a valid active account manager."},{status:400});}
  if(mediaBuyerId){const [buyer]=await db.select({id:users.id}).from(users).where(and(eq(users.id,mediaBuyerId),eq(users.workspaceId,workspaceId),eq(users.role,"MEDIA_BUYER"),eq(users.isActive,true))).limit(1);if(!buyer)return NextResponse.json({error:"Choose a valid active media buyer."},{status:400});}
  const contractStart=date(b.contractStart),contractEnd=date(b.contractEnd);
  if(contractStart&&contractEnd&&contractEnd<contractStart)return NextResponse.json({error:"Contract end date must be on or after the start date."},{status:400});
  try{
   const clientId=await db.transaction(async tx=>{
    const [client]=await tx.insert(clients).values({workspaceId,companyName,industry:str(b.industry,100)||null,website:str(b.website,500)||null,monthlyRetainer:num(b.monthlyRetainer),mediaBudget:canSetupMarketing?num(b.mediaBudget):0,contractValue:num(b.contractValue),userId:portalUserId,accountManagerId,mediaBuyerId,metaAdsLink:canSetupMarketing?(str(b.metaAdsLink)||null):null,tiktokAdsLink:canSetupMarketing?(str(b.tiktokAdsLink)||null):null,snapchatAdsLink:canSetupMarketing?(str(b.snapchatAdsLink)||null):null,googleAdsLink:canSetupMarketing?(str(b.googleAdsLink)||null):null,internalNotes:canSetupMarketing?(str(b.internalNotes,2000)||null):null,contractStart,contractEnd}).returning();
    await tx.execute(sql`update clients set created_by=${userId},report_frequency=${reportFrequency},report_next_due_at=case when ${reportFrequency}='DAILY' then now()+interval '1 day' when ${reportFrequency}='EVERY_3_DAYS' then now()+interval '3 days' else now()+interval '7 days' end where id=${client.id} and workspace_id=${workspaceId}`);
    for(let index=0;index<competitors.length;index++){
      const competitor=competitors[index],watchlistId=crypto.randomUUID();
      await tx.execute(sql`insert into competitor_watchlists(id,workspace_id,client_id,competitor_name,is_active,created_by,sort_order,report_enabled,created_at,updated_at) values(${watchlistId}::uuid,${workspaceId},${client.id}::uuid,${competitor.name},true,${userId}::uuid,${index},true,now(),now())`);
      const profiles:[[string,string],[string,string],[string,string]]=[["FACEBOOK",competitor.facebook],["INSTAGRAM",competitor.instagram],["TIKTOK",competitor.tiktok]];
      for(const [platform,profileUrl] of profiles)await tx.execute(sql`insert into competitor_social_profiles(id,watchlist_id,platform,profile_url,collection_mode,is_active,created_at) values(${crypto.randomUUID()}::uuid,${watchlistId}::uuid,${platform},${profileUrl},'PUBLIC_WEB',true,now())`);
    }
    if(str(b.contactName,160))await tx.insert(contacts).values({clientId:client.id,name:str(b.contactName,160),title:str(b.contactTitle,120)||null,email:str(b.contactEmail,254)||null,phone:str(b.contactPhone,60)||null,whatsapp:str(b.contactPhone,60)||null,isPrimary:true});
    return client.id;
   });
   await db.insert(auditLogs).values({workspaceId,userId,action:"client_created",entity:"Client",entityId:clientId,newValues:JSON.stringify({companyName,reportFrequency,competitors:competitors.map(item=>item.name)})});
   return NextResponse.json({success:true,clientId},{status:201,headers:{"Cache-Control":"private, no-store"}});
  }catch(error){console.error("Client creation failed",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Client could not be created with its competitor monitoring setup."},{status:500})}
}
