export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,clients,adPlatformConnections,adCampaigns,adPerformanceDaily,auditLogs,sql} from "@/lib/db";
import {and,eq,isNull} from "drizzle-orm";
import {platformConfigured,syncCampaign} from "@/lib/ad-platforms";
import {connectionAccessToken} from "@/lib/ad-oauth";

const allowedRoles=["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"];
const allowedPlatforms=["META","TIKTOK"];
const cleanId=(v:any)=>String(v||"").trim().replace(/^act_/i,"");
const iso=(d:Date)=>d.toISOString().slice(0,10);
const n=(v:any)=>Number(v||0);

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String((session.user as any).role||"");if(!allowedRoles.includes(role))return NextResponse.json({error:"Only Super Admin, Media Buyer or Account Manager can link ad campaigns."},{status:403});
 const userId=String((session.user as any).id||"");const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Invalid request."},{status:400});
 const clientId=String(body.clientId||""),platform=String(body.platform||"").toUpperCase(),adAccountId=cleanId(body.adAccountId),campaignId=cleanId(body.campaignId);
 if(!clientId||!allowedPlatforms.includes(platform)||!/^\d+$/.test(adAccountId)||!/^\d+$/.test(campaignId))return NextResponse.json({error:"Client, platform, Ad Account ID and Campaign ID are required. IDs must contain numbers only."},{status:400});
 const [client]=await db.select({id:clients.id,mediaBuyerId:clients.mediaBuyerId,accountManagerId:clients.accountManagerId}).from(clients).where(and(eq(clients.id,clientId),eq(clients.isActive,true),eq(clients.workspaceId,"default"))).limit(1);
 if(!client)return NextResponse.json({error:"Client not found"},{status:404});if(role==="MEDIA_BUYER"&&client.mediaBuyerId!==userId||role==="ACCOUNT_MANAGER"&&client.accountManagerId!==userId)return NextResponse.json({error:"Client access denied"},{status:403});
 let [connection]=await db.select().from(adPlatformConnections).where(and(eq(adPlatformConnections.platform,platform as any),eq(adPlatformConnections.adAccountId,adAccountId))).limit(1);
 if(connection&&connection.clientId!==clientId)return NextResponse.json({error:"This ad account is already linked to another client. Reassign it explicitly as Super Admin instead of silently moving it."},{status:409});
 let accessToken="";if(connection){try{accessToken=await connectionAccessToken(connection)}catch{accessToken="";}}
 if(!accessToken&&!platformConfigured(platform))return NextResponse.json({error:`${platform} is not authorized yet. Add the platform access token in Vercel or connect the ad account with OAuth first.`},{status:400});
 const end=new Date(),start=new Date(Date.now()-30*86400000),startIso=iso(start),endIso=iso(end);
 try{
  const result=await syncCampaign({platform,campaignId,adAccountId,accessToken:accessToken||undefined,start:startIso,end:endIso});
  if(!connection){[connection]=await db.insert(adPlatformConnections).values({clientId,platform:platform as any,adAccountId,accountName:String(body.accountName||`${platform} ${adAccountId}`).trim().slice(0,160),status:"CONNECTED",createdBy:userId}).onConflictDoUpdate({target:[adPlatformConnections.platform,adPlatformConnections.adAccountId],set:{status:"CONNECTED",syncError:null,updatedAt:new Date()}}).returning();}
  const [existingCampaign]=await db.select().from(adCampaigns).where(and(eq(adCampaigns.platform,platform as any),eq(adCampaigns.externalId,campaignId))).limit(1);if(existingCampaign&&existingCampaign.clientId!==clientId)return NextResponse.json({error:"This campaign is already linked to another client."},{status:409});
  const [campaign]=await db.insert(adCampaigns).values({clientId,connectionId:connection.id,platform:platform as any,externalId:campaignId,name:String(result.name||`${platform} Campaign ${campaignId}`).slice(0,160),status:String(result.status||"ACTIVE"),campaignUrl:platform==="META"?`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}&selected_campaign_ids=${campaignId}`:`https://ads.tiktok.com/i18n/perf/campaign?aadvid=${adAccountId}&campaign_id=${campaignId}`,createdBy:userId,lastSyncAt:new Date()}).onConflictDoUpdate({target:[adCampaigns.platform,adCampaigns.externalId],set:{connectionId:connection.id,name:String(result.name||`${platform} Campaign ${campaignId}`).slice(0,160),status:String(result.status||"ACTIVE"),lastSyncAt:new Date(),updatedAt:new Date()}}).returning();
  await db.execute(sql`update ad_campaigns set archived_at=null,archived_by=null where id=${campaign.id}`);
  for(const day of result.days){
   const date=new Date(`${day.date}T00:00:00Z`),spend=n(day.spend),results=n(day.results),purchases=n(day.purchases),impressions=n(day.impressions),clicks=n(day.clicks),revenue=n(day.revenue),reach=n(day.reach),frequency=n(day.frequency),addToCart=Math.max(0,Math.round(n(day.addToCart))),ctr=n(day.ctr)||(impressions?clicks/impressions*100:0),cpc=n(day.cpc)||(clicks?spend/clicks:0),cpm=n(day.cpm)||(impressions?spend/impressions*1000:0),costPerResult=n(day.costPerResult)||(results?spend/results:0),roas=spend?revenue/spend:0;
   await db.delete(adPerformanceDaily).where(and(eq(adPerformanceDaily.campaignId,campaign.id),eq(adPerformanceDaily.date,date),eq(adPerformanceDaily.breakdownType,"TOTAL"),isNull(adPerformanceDaily.adId)));
   await db.execute(sql`insert into ad_performance_daily(id,campaign_id,date,breakdown_type,breakdown_value,spend,impressions,reach,clicks,results,qualified_leads,purchases,add_to_cart,revenue,frequency,ctr,cpc,cpm,cpl,cost_per_result,cpa,roas) values(gen_random_uuid()::text,${campaign.id},${date}::timestamp,'TOTAL','ALL',${spend},${impressions},${reach},${clicks},${results},0,${purchases},${addToCart},${revenue},${frequency},${ctr},${cpc},${cpm},${costPerResult},${costPerResult},${purchases?spend/purchases:0},${roas})`);
  }
  if(result.summary)await db.execute(sql`update ad_campaigns set reported_metrics=${JSON.stringify(result.summary)}::jsonb,reported_period_start=${startIso}::date,reported_period_end=${endIso}::date,reported_result_type=${result.summary.resultType||null},reported_result_label=${result.summary.resultLabel||null} where id=${campaign.id}`);
  await db.update(adPlatformConnections).set({lastSyncAt:new Date(),syncError:null,status:"CONNECTED",updatedAt:new Date()}).where(eq(adPlatformConnections.id,connection.id));
  await db.insert(auditLogs).values({userId,action:"campaign_linked_by_id",entity:"ad_campaigns",entityId:campaign.id,newValues:JSON.stringify({platform,adAccountId,campaignId,days:result.days.length,metricSource:result.summary?.source||"PLATFORM"})});
  return NextResponse.json({success:true,campaign:{id:campaign.id,name:campaign.name,status:campaign.status,platform,adAccountId,campaignId},days:result.days.length,summary:result.summary||null});
 }catch(error:any){const message=String(error?.message||"Campaign could not be loaded from the platform").slice(0,700);if(connection)await db.update(adPlatformConnections).set({syncError:message,status:"ERROR",updatedAt:new Date()}).where(eq(adPlatformConnections.id,connection.id));return NextResponse.json({error:message},{status:400});}
}
