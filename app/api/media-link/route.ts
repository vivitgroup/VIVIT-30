export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,clients,adPlatformConnections,adCampaigns,auditLogs,sql} from "@/lib/db";
import {and,eq} from "drizzle-orm";
import {platformConfigured,syncCampaign} from "@/lib/ad-platforms";
import {connectionAccessToken} from "@/lib/ad-oauth";

const allowedRoles=["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"];
const allowedPlatforms=["META","TIKTOK"] as const;
type AllowedPlatform=(typeof allowedPlatforms)[number];
const isAllowedPlatform=(v:string):v is AllowedPlatform=>(allowedPlatforms as readonly string[]).includes(v);
const cleanId=(v:unknown)=>String(v||"").trim().replace(/^act_/i,"");
const iso=(d:Date)=>d.toISOString().slice(0,10),n=(v:unknown)=>Number(v||0);

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String(session.user.role||""),userId=String(session.user.id||""),workspaceId=String(session.user.workspaceId||"").trim();
 if(!workspaceId||!userId)return NextResponse.json({error:"Workspace context is required"},{status:403});
 if(!allowedRoles.includes(role))return NextResponse.json({error:"Only Super Admin, Media Buyer or Account Manager can link ad campaigns."},{status:403});
 const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Invalid request."},{status:400});
 const clientId=String(body.clientId||""),platform=String(body.platform||"").toUpperCase(),adAccountId=cleanId(body.adAccountId),campaignId=cleanId(body.campaignId);
 if(!clientId||!isAllowedPlatform(platform)||!/^\d+$/.test(adAccountId)||!/^\d+$/.test(campaignId))return NextResponse.json({error:"Client, platform, Ad Account ID and Campaign ID are required. IDs must contain numbers only."},{status:400});
 const [client]=await db.select({id:clients.id,mediaBuyerId:clients.mediaBuyerId,accountManagerId:clients.accountManagerId}).from(clients).where(and(eq(clients.id,clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).limit(1);
 if(!client)return NextResponse.json({error:"Client not found"},{status:404});if(role==="MEDIA_BUYER"&&client.mediaBuyerId!==userId||role==="ACCOUNT_MANAGER"&&client.accountManagerId!==userId)return NextResponse.json({error:"Client access denied"},{status:403});
 const [existingConnection]=await db.select().from(adPlatformConnections).where(and(eq(adPlatformConnections.workspaceId,workspaceId),eq(adPlatformConnections.platform,platform),eq(adPlatformConnections.adAccountId,adAccountId))).limit(1);
 if(!existingConnection){const [foreignConnection]=await db.select({id:adPlatformConnections.id}).from(adPlatformConnections).where(and(eq(adPlatformConnections.platform,platform),eq(adPlatformConnections.adAccountId,adAccountId))).limit(1);if(foreignConnection)return NextResponse.json({error:"This ad account is already linked outside this workspace."},{status:409});}
 if(existingConnection&&existingConnection.clientId!==clientId)return NextResponse.json({error:"This ad account is already linked to another client in this workspace. Reassign it explicitly as Super Admin instead of silently moving it."},{status:409});
 let accessToken="";if(existingConnection){try{accessToken=await connectionAccessToken(existingConnection)}catch{accessToken="";}}
 if(!accessToken&&!platformConfigured(platform))return NextResponse.json({error:`${platform} is not authorized yet. Add the platform access token in Vercel or connect the ad account with OAuth first.`},{status:400});
 const end=new Date(),start=new Date(Date.now()-30*86400000),startIso=iso(start),endIso=iso(end);
 try{
  const result=await syncCampaign({platform,campaignId,adAccountId,accessToken:accessToken||undefined,start:startIso,end:endIso});
  const saved=await db.transaction(async tx=>{
   await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`media-account:${platform}:${adAccountId}`}))`);
   await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`media-campaign:${platform}:${campaignId}`}))`);
   let [connection]=await tx.select().from(adPlatformConnections).where(and(eq(adPlatformConnections.workspaceId,workspaceId),eq(adPlatformConnections.platform,platform),eq(adPlatformConnections.adAccountId,adAccountId))).limit(1);
   if(!connection){const [foreign]=await tx.select({id:adPlatformConnections.id}).from(adPlatformConnections).where(and(eq(adPlatformConnections.platform,platform),eq(adPlatformConnections.adAccountId,adAccountId))).limit(1);if(foreign)throw new Error("ACCOUNT_LINKED_OUTSIDE_WORKSPACE");[connection]=await tx.insert(adPlatformConnections).values({workspaceId,clientId,platform,adAccountId,accountName:String(body.accountName||`${platform} ${adAccountId}`).trim().slice(0,160),status:"CONNECTED",createdBy:userId}).returning();}else if(connection.clientId!==clientId)throw new Error("ACCOUNT_LINKED_TO_OTHER_CLIENT");
   let [campaign]=await tx.select().from(adCampaigns).where(and(eq(adCampaigns.workspaceId,workspaceId),eq(adCampaigns.platform,platform),eq(adCampaigns.externalId,campaignId))).limit(1);
   if(!campaign){const [foreign]=await tx.select({id:adCampaigns.id}).from(adCampaigns).where(and(eq(adCampaigns.platform,platform),eq(adCampaigns.externalId,campaignId))).limit(1);if(foreign)throw new Error("CAMPAIGN_LINKED_OUTSIDE_WORKSPACE");[campaign]=await tx.insert(adCampaigns).values({workspaceId,clientId,connectionId:connection.id,platform,externalId:campaignId,name:String(result.name||`${platform} Campaign ${campaignId}`).slice(0,160),status:String(result.status||"ACTIVE"),campaignUrl:platform==="META"?`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}&selected_campaign_ids=${campaignId}`:`https://ads.tiktok.com/i18n/perf/campaign?aadvid=${adAccountId}&campaign_id=${campaignId}`,createdBy:userId,lastSyncAt:new Date()}).returning();}else{if(campaign.clientId!==clientId)throw new Error("CAMPAIGN_LINKED_TO_OTHER_CLIENT");[campaign]=await tx.update(adCampaigns).set({connectionId:connection.id,name:String(result.name||campaign.name).slice(0,160),status:String(result.status||campaign.status),lastSyncAt:new Date(),updatedAt:new Date()}).where(and(eq(adCampaigns.id,campaign.id),eq(adCampaigns.workspaceId,workspaceId))).returning();}
   await tx.execute(sql`update ad_campaigns set archived_at=null,archived_by=null where id=${campaign.id} and workspace_id=${workspaceId}`);
   for(const day of result.days){const date=new Date(`${day.date}T00:00:00Z`),spend=n(day.spend),results=n(day.results),purchases=n(day.purchases),impressions=n(day.impressions),clicks=n(day.clicks),revenue=n(day.revenue),reach=n(day.reach),frequency=n(day.frequency),addToCart=Math.max(0,Math.round(n(day.addToCart))),ctr=n(day.ctr)||(impressions?clicks/impressions*100:0),cpc=n(day.cpc)||(clicks?spend/clicks:0),cpm=n(day.cpm)||(impressions?spend/impressions*1000:0),costPerResult=n(day.costPerResult)||(results?spend/results:0),roas=spend?revenue/spend:0;await tx.execute(sql`delete from ad_performance_daily where campaign_id=${campaign.id} and date=${date}::timestamp and breakdown_type='TOTAL' and ad_id is null`);await tx.execute(sql`insert into ad_performance_daily(id,campaign_id,date,breakdown_type,breakdown_value,spend,impressions,reach,clicks,results,qualified_leads,purchases,add_to_cart,revenue,frequency,ctr,cpc,cpm,cpl,cost_per_result,cpa,roas) values(gen_random_uuid()::text,${campaign.id},${date}::timestamp,'TOTAL','ALL',${spend},${impressions},${reach},${clicks},${results},0,${purchases},${addToCart},${revenue},${frequency},${ctr},${cpc},${cpm},${costPerResult},${costPerResult},${purchases?spend/purchases:0},${roas})`)}
   if(result.summary)await tx.execute(sql`update ad_campaigns set reported_metrics=${JSON.stringify(result.summary)}::jsonb,reported_period_start=${startIso}::date,reported_period_end=${endIso}::date,reported_result_type=${result.summary.resultType||null},reported_result_label=${result.summary.resultLabel||null} where id=${campaign.id} and workspace_id=${workspaceId}`);
   await tx.update(adPlatformConnections).set({lastSyncAt:new Date(),syncError:null,status:"CONNECTED",updatedAt:new Date()}).where(and(eq(adPlatformConnections.id,connection.id),eq(adPlatformConnections.workspaceId,workspaceId)));
   await tx.insert(auditLogs).values({workspaceId,userId,action:"campaign_linked_by_id",entity:"ad_campaigns",entityId:campaign.id,newValues:JSON.stringify({platform,adAccountId,campaignId,days:result.days.length,metricSource:result.summary?.source||"PLATFORM"})});
   return{campaign,connection};
  });
  return NextResponse.json({success:true,campaign:{id:saved.campaign.id,name:saved.campaign.name,status:saved.campaign.status,platform,adAccountId,campaignId},days:result.days.length,summary:result.summary||null},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error:unknown){const message=String(error instanceof Error?error.message:"Campaign could not be loaded from the platform").slice(0,700);if(existingConnection)await db.update(adPlatformConnections).set({syncError:message,status:"ERROR",updatedAt:new Date()}).where(and(eq(adPlatformConnections.id,existingConnection.id),eq(adPlatformConnections.workspaceId,workspaceId)));const publicMessage=message==="ACCOUNT_LINKED_OUTSIDE_WORKSPACE"||message==="CAMPAIGN_LINKED_OUTSIDE_WORKSPACE"?"This ad account or campaign is already linked outside this workspace.":message==="ACCOUNT_LINKED_TO_OTHER_CLIENT"||message==="CAMPAIGN_LINKED_TO_OTHER_CLIENT"?"This ad account or campaign is already linked to another client in this workspace.":message;return NextResponse.json({error:publicMessage},{status:400,headers:{"Cache-Control":"private, no-store"}});}
}
