export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,clients,adPlatformConnections,adCampaigns,adPerformanceDaily,auditLogs} from "@/lib/db";
import {and,eq,isNull} from "drizzle-orm";
import {platformConfigured,syncCampaign} from "@/lib/ad-platforms";
import {connectionAccessToken} from "@/lib/ad-oauth";

const allowedRoles=["SUPER_ADMIN","MEDIA_BUYER"];
const allowedPlatforms=["META","TIKTOK"];
const cleanId=(v:any)=>String(v||"").trim().replace(/^act_/,"");
const iso=(d:Date)=>d.toISOString().slice(0,10);

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String((session.user as any).role||"");if(!allowedRoles.includes(role))return NextResponse.json({error:"Only Super Admin or Media Buyer can link ad campaigns."},{status:403});
 const userId=String((session.user as any).id||"");const body=await req.json();
 const clientId=String(body.clientId||""),platform=String(body.platform||"").toUpperCase(),adAccountId=cleanId(body.adAccountId),campaignId=cleanId(body.campaignId);
 if(!clientId||!allowedPlatforms.includes(platform)||!/^\d+$/.test(adAccountId)||!/^\d+$/.test(campaignId))return NextResponse.json({error:"Client, platform, Ad Account ID and Campaign ID are required. IDs must contain numbers only."},{status:400});
 const [client]=await db.select({id:clients.id,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(and(eq(clients.id,clientId),eq(clients.isActive,true),eq(clients.workspaceId,"default"))).limit(1);
 if(!client)return NextResponse.json({error:"Client not found"},{status:404});if(role==="MEDIA_BUYER"&&client.mediaBuyerId!==userId)return NextResponse.json({error:"Client access denied"},{status:403});
 let [connection]=await db.select().from(adPlatformConnections).where(and(eq(adPlatformConnections.platform,platform as any),eq(adPlatformConnections.adAccountId,adAccountId))).limit(1);
 let accessToken="";if(connection){try{accessToken=await connectionAccessToken(connection)}catch{accessToken="";}}
 if(!accessToken&&!platformConfigured(platform))return NextResponse.json({error:`${platform} is not authorized yet. Add the platform access token in Vercel or connect the ad account with OAuth first.`},{status:400});
 const end=new Date(),start=new Date(Date.now()-30*86400000);
 try{
  const result=await syncCampaign({platform,campaignId,adAccountId,accessToken:accessToken||undefined,start:iso(start),end:iso(end)});
  if(!connection){[connection]=await db.insert(adPlatformConnections).values({clientId,platform:platform as any,adAccountId,accountName:String(body.accountName||`${platform} ${adAccountId}`).trim().slice(0,160),status:"CONNECTED",createdBy:userId}).onConflictDoUpdate({target:[adPlatformConnections.platform,adPlatformConnections.adAccountId],set:{clientId,status:"CONNECTED",syncError:null,updatedAt:new Date()}}).returning();}
  else if(connection.clientId!==clientId){await db.update(adPlatformConnections).set({clientId,status:"CONNECTED",syncError:null,updatedAt:new Date()}).where(eq(adPlatformConnections.id,connection.id));}
  const [campaign]=await db.insert(adCampaigns).values({clientId,connectionId:connection.id,platform:platform as any,externalId:campaignId,name:String(result.name||`${platform} Campaign ${campaignId}`).slice(0,160),status:String(result.status||"ACTIVE"),campaignUrl:platform==="META"?`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}&selected_campaign_ids=${campaignId}`:`https://ads.tiktok.com/i18n/perf/campaign?aadvid=${adAccountId}&campaign_id=${campaignId}`,createdBy:userId,lastSyncAt:new Date()}).onConflictDoUpdate({target:[adCampaigns.platform,adCampaigns.externalId],set:{clientId,connectionId:connection.id,name:String(result.name||`${platform} Campaign ${campaignId}`).slice(0,160),status:String(result.status||"ACTIVE"),lastSyncAt:new Date(),updatedAt:new Date()}}).returning();
  for(const day of result.days){const date=new Date(`${day.date}T00:00:00Z`);await db.delete(adPerformanceDaily).where(and(eq(adPerformanceDaily.campaignId,campaign.id),eq(adPerformanceDaily.date,date),eq(adPerformanceDaily.breakdownType,"TOTAL"),isNull(adPerformanceDaily.adId)));const cpl=day.results?day.spend/day.results:0,roas=day.spend?day.revenue/day.spend:0;await db.insert(adPerformanceDaily).values({campaignId:campaign.id,date,spend:day.spend,impressions:day.impressions,reach:day.reach,clicks:day.clicks,results:day.results,purchases:day.purchases,revenue:day.revenue,frequency:day.frequency,ctr:day.impressions?day.clicks/day.impressions*100:0,cpc:day.clicks?day.spend/day.clicks:0,cpm:day.impressions?day.spend/day.impressions*1000:0,cpl,roas});}
  await db.update(adPlatformConnections).set({lastSyncAt:new Date(),syncError:null,status:"CONNECTED",updatedAt:new Date()}).where(eq(adPlatformConnections.id,connection.id));
  await db.insert(auditLogs).values({userId,action:"campaign_linked_by_id",entity:"ad_campaigns",entityId:campaign.id,newValues:JSON.stringify({platform,adAccountId,campaignId,days:result.days.length})});
  return NextResponse.json({success:true,campaign:{id:campaign.id,name:campaign.name,status:campaign.status,platform,adAccountId,campaignId},days:result.days.length});
 }catch(error:any){const message=String(error?.message||"Campaign could not be loaded from the platform").slice(0,500);if(connection)await db.update(adPlatformConnections).set({syncError:message,status:"ERROR",updatedAt:new Date()}).where(eq(adPlatformConnections.id,connection.id));return NextResponse.json({error:message},{status:400});}
}
