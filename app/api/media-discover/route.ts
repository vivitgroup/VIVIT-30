// @ts-nocheck
export const dynamic="force-dynamic";
export const maxDuration=300;
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,adPlatformConnections,adCampaigns,adPerformanceDaily,clients,auditLogs,sql} from "@/lib/db";
import {and,eq,isNull} from "drizzle-orm";
import {connectionAccessToken} from "@/lib/ad-oauth";
import {syncCampaign} from "@/lib/ad-platforms";

const ROLES=["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"];
const n=(v:any)=>Number(v||0),iso=(d:Date)=>d.toISOString().slice(0,10),sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function metaJson(url:string){const r=await fetch(url,{cache:"no-store"}),d=await r.json().catch(()=>({}));if(!r.ok||d?.error)throw new Error(d?.error?.message||`Meta API error ${r.status}`);return d}
async function listMetaCampaigns(accountId:string,token:string){let next=`https://graph.facebook.com/${process.env.META_GRAPH_VERSION||"v23.0"}/act_${String(accountId).replace(/^act_/i,"")}/campaigns?fields=id,name,status&limit=500&access_token=${encodeURIComponent(token)}`,rows:any[]=[];for(let i=0;next&&i<50;i++){const d=await metaJson(next);rows.push(...(d.data||[]));next=String(d?.paging?.next||"")}return rows}
function permanentMetaError(message:string){const m=message.toLowerCase();return m.includes("does not have permission")||m.includes("permissions error")||m.includes("invalid oauth")||m.includes("access token")||m.includes("unsupported get request")||m.includes("belongs to ad account")||m.includes("cannot be loaded due to missing permissions")}
async function syncWithRetry(input:any){let last:any;for(let attempt=1;attempt<=3;attempt++){try{return await syncCampaign(input)}catch(e:any){last=e;const message=String(e?.message||e||"Sync failed");if(attempt===3||permanentMetaError(message))throw e;await sleep(attempt*900)}}throw last}
async function persist(c:any,days:any[]){for(const day of days||[]){if(!day?.date)continue;const date=new Date(`${day.date}T00:00:00Z`);if(!Number.isFinite(date.getTime()))continue;const spend=n(day.spend),results=n(day.results),purchases=n(day.purchases),impressions=n(day.impressions),clicks=n(day.clicks),revenue=n(day.revenue),reach=n(day.reach),frequency=n(day.frequency),addToCart=Math.max(0,Math.round(n(day.addToCart))),ctr=n(day.ctr)||(impressions?clicks/impressions*100:0),cpc=n(day.cpc)||(clicks?spend/clicks:0),cpm=n(day.cpm)||(impressions?spend/impressions*1000:0),cost=n(day.costPerResult)||(results?spend/results:0);await db.delete(adPerformanceDaily).where(and(eq(adPerformanceDaily.campaignId,c.id),eq(adPerformanceDaily.date,date),eq(adPerformanceDaily.breakdownType,"TOTAL"),isNull(adPerformanceDaily.adId)));await db.execute(sql`insert into ad_performance_daily(id,campaign_id,date,breakdown_type,breakdown_value,spend,impressions,reach,clicks,results,qualified_leads,purchases,add_to_cart,revenue,frequency,ctr,cpc,cpm,cpl,cost_per_result,cpa,roas) values(gen_random_uuid()::text,${c.id},${date}::timestamp,'TOTAL','ALL',${spend},${impressions},${reach},${clicks},${results},0,${purchases},${addToCart},${revenue},${frequency},${ctr},${cpc},${cpm},${cost},${cost},${purchases?spend/purchases:0},${spend?revenue/spend:0})`)}}

export async function POST(req:NextRequest){
 const s=await auth();if(!s?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String((s.user as any).role),userId=String((s.user as any).id);if(!ROLES.includes(role))return NextResponse.json({error:"Forbidden"},{status:403});
 const b=await req.json().catch(()=>null),connectionId=String(b?.connectionId||"");if(!connectionId)return NextResponse.json({error:"Connection is required"},{status:400});
 const [connection]=await db.select().from(adPlatformConnections).where(eq(adPlatformConnections.id,connectionId)).limit(1);if(!connection||connection.platform!=="META")return NextResponse.json({error:"Meta connection not found"},{status:404});
 const [client]=await db.select().from(clients).where(and(eq(clients.id,connection.clientId),eq(clients.isActive,true))).limit(1);if(!client)return NextResponse.json({error:"Client is archived or missing"},{status:404});
 if(role==="MEDIA_BUYER"&&client.mediaBuyerId!==userId||role==="ACCOUNT_MANAGER"&&client.accountManagerId!==userId)return NextResponse.json({error:"Client access denied"},{status:403});
 let token="";try{token=await connectionAccessToken(connection)}catch(e:any){return NextResponse.json({error:e.message||"Meta authorization is invalid"},{status:409})}if(!token)return NextResponse.json({error:"Connect Meta first to authorize this ad account."},{status:409});
 try{
  const remote=await listMetaCampaigns(connection.adAccountId,token),end=new Date(),start=new Date(Date.now()-30*86400000),from=iso(start),to=iso(end);let synced=0,failed=0;const failures:any[]=[];
  for(const r of remote){
   const externalId=String(r.id),[existing]=await db.select().from(adCampaigns).where(and(eq(adCampaigns.platform,"META"),eq(adCampaigns.externalId,externalId))).limit(1);
   if(existing&&existing.clientId!==connection.clientId){failed++;failures.push({id:externalId,name:String(r.name||externalId),error:"Campaign belongs to another VIVIT client"});continue}
   const [campaign]=await db.insert(adCampaigns).values({clientId:connection.clientId,connectionId:connection.id,platform:"META",externalId,name:String(r.name||`Meta Campaign ${externalId}`).slice(0,160),status:String(r.status||"UNKNOWN"),campaignUrl:`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${connection.adAccountId}&selected_campaign_ids=${externalId}`,createdBy:userId}).onConflictDoUpdate({target:[adCampaigns.platform,adCampaigns.externalId],set:{connectionId:connection.id,name:String(r.name||`Meta Campaign ${externalId}`).slice(0,160),status:String(r.status||"UNKNOWN"),updatedAt:new Date()}}).returning();
   await db.execute(sql`update ad_campaigns set archived_at=null,archived_by=null where id=${campaign.id}`);
   try{
    const result=await syncWithRetry({platform:"META",campaignId:externalId,adAccountId:connection.adAccountId,accessToken:token,start:from,end:to});
    await persist(campaign,result.days);
    await db.update(adCampaigns).set({name:result.name||campaign.name,status:result.status||campaign.status,lastSyncAt:new Date(),updatedAt:new Date()}).where(eq(adCampaigns.id,campaign.id));
    if(result.summary)await db.execute(sql`update ad_campaigns set reported_metrics=${JSON.stringify(result.summary)}::jsonb,reported_period_start=${from}::date,reported_period_end=${to}::date,reported_result_type=${result.summary.resultType||null},reported_result_label=${result.summary.resultLabel||null} where id=${campaign.id}`);
    synced++;
   }catch(e:any){failed++;failures.push({id:externalId,name:String(r.name||externalId),error:String(e.message||"Sync failed").slice(0,300)})}
   await sleep(120);
  }
  const failureSummary=failures.length?failures.slice(0,2).map(x=>`${x.name}: ${x.error}`).join(" | ").slice(0,650):null;
  await db.update(adPlatformConnections).set({status:failed&&synced===0?"ERROR":"CONNECTED",lastSyncAt:synced?new Date():connection.lastSyncAt,syncError:failed?`${failed} campaign(s) failed${failureSummary?` · ${failureSummary}`:""}`:null,updatedAt:new Date()}).where(eq(adPlatformConnections.id,connection.id));
  await db.insert(auditLogs).values({userId,action:"meta_account_discovered_and_synced",entity:"ad_platform_connections",entityId:connection.id,newValues:JSON.stringify({campaigns:remote.length,synced,failed,failures:failures.slice(0,5)})});
  return NextResponse.json({success:true,discovered:remote.length,synced,failed,failures:failures.slice(0,10)});
 }catch(e:any){const message=String(e.message||"Meta account sync failed").slice(0,700);await db.update(adPlatformConnections).set({status:"ERROR",syncError:message,updatedAt:new Date()}).where(eq(adPlatformConnections.id,connection.id));return NextResponse.json({error:message},{status:400})}
}
