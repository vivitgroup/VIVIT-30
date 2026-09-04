export const dynamic="force-dynamic";

import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {buildVivitoCriticPrompt,detectVivitoModules} from "@/lib/vivito/intelligence";
import {buildVivitoSystem} from "@/lib/vivito/playbook";
import {generateVivito} from "@/lib/vivito/providers";
import {buildVivitoActionPlannerSystem,likelyVivitoActionIntent,parseVivitoActionProposal} from "@/lib/vivito/action-engine";
import {buildVivitoOrchestratorSystem,likelyVivitoMultiStepIntent,parseVivitoActionPlan} from "@/lib/vivito/orchestrator";
import {buildVivitoMemoryPlannerSystem,forgetVivitoMemory,likelyVivitoMemoryIntent,loadVivitoMemories,memoryContext,parseVivitoMemoryPlan,saveVivitoMemory,type VivitoMemory} from "@/lib/vivito/memory";
import {analyzeVivitoImage,groundedVivitoResearch,type VivitoGroundedResearch} from "@/lib/vivito/multimodal";
import {buildVivitoArtifactPlannerSystem,likelyVivitoArtifactIntent,likelyVivitoResearchIntent,likelyVivitoVisionIntent,parseVivitoArtifactProposal,requestedArtifactKind} from "@/lib/vivito/artifact-router";
import {buildCompetitivePlannerSystem,likelyCompetitiveChatIntent,parseCompetitiveChatPlan} from "@/lib/vivito/competitive-chat";
import {buildDailyCompetitiveReport,platformFromUrl} from "@/lib/vivito/competitive-intelligence";

type UnknownRecord=Record<string,unknown>;
type ClientRow={id:string;company_name:string;industry:string|null};
type TaskRow={id:string;title:string;status:string;priority:string;deadline:string|Date;client_id:string;type:string;revision_count:number|string|null;file_url:string|null;approved_by_client:boolean;company_name:string};
type MediaRawRow={company_name:string;industry:string|null;campaign_id:string;campaign:string;objective:string|null;status:string;reported_result_label:string|null;reported_result_type:string|null;spend:number|string|null;results:number|string|null;atc:number|string|null;purchases:number|string|null;revenue:number|string|null;impressions:number|string|null;reach:number|string|null;clicks:number|string|null;previous_spend:number|string|null;previous_results:number|string|null;previous_purchases:number|string|null;previous_revenue:number|string|null};
type MediaRow=MediaRawRow&{spend:number;impressions:number;reach:number;clicks:number;results:number;purchases:number;atc:number;revenue:number;previousSpend:number;previousResults:number;previousPurchases:number;previousRevenue:number;resultDefinition:string;ctr:number;cpc:number;cpm:number;costPerResult:number;frequency:number;roas:number;previousCostPerResult:number;previousRoas:number};
type TrackingRow={client_id:string;company_name:string;platform:string;pixel_status:string|null;capi_status:string|null;utm_status:string|null;landing_page_status:string|null;issues:unknown;checked_at:string|Date|null};
type ClientHealthRow={id:string;company_name:string;industry:string|null;health_score:number|string|null;performance_score:number|string|null;churn_risk:string|null;churn_probability:number|string|null;media_budget:number|string|null;target_leads:number|string|null};
type SalesRow={id:string;company_name:string;stage:string;estimated_value:number|string|null;probability:number|string|null;next_follow_up:string|Date|null;follow_up_count:number|string|null;industry:string|null;expected_close:string|Date|null;updated_at:string|Date;last_activity_at:string|Date|null};
type BillingRow={company_name:string;amount_due:number|string|null;amount_paid:number|string|null;amount_remaining:number|string|null;payment_day:number|string|null;payment_status:string|null};
type ExpenseRow={category:string;amount:number|string|null};
type StaffRow={id:string;name:string;role:string};
type StoredImageRow={storage_path:string;mime_type:string|null;size_bytes:number|string|null;name:string};
type WatchlistIdRow={id:string};
type Attachment={fileId:string;name:string;mimeType:string};
type FinanceContext={billing:BillingRow[];expenses:ExpenseRow[]};
type MediaSummary={spend:number;results:number;atc:number;purchases:number;revenue:number;previousSpend:number;previousResults:number;previousPurchases:number;previousRevenue:number;periodComparison:string;roas:number;previousRoas:number};
type SalesSummary={leadCount:number;byStage:Record<string,number>;weightedPipeline:number;overdueFollowUps:number};
type OperationsSummary={activeTasks:number;overdueTasks:number;reviewTasks:number;revisionTasks:number;byStatus:Record<string,number>;byPriority:Record<string,number>};
type FinanceSummary={amountDue:number;amountPaid:number;amountOutstanding:number;billing:BillingRow[];expensesMTD:ExpenseRow[]};
type AdvisorContext={role:string;scope:{clientCount:number;clientNames:string[]};clients:ClientRow[];operations:OperationsSummary;topTasks:TaskRow[];operationalMemory:VivitoMemory[];media?:MediaSummary;campaigns?:MediaRow[];trackingHealth?:TrackingRow[];clientHealth?:ClientHealthRow[];sales?:SalesSummary;salesPipeline?:SalesRow[];finance?:FinanceSummary};

const n=(v:unknown)=>Number(v||0);
const isArabic=(s:string)=>/[\u0600-\u06ff]/.test(s);
const cairoDay=(d:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const dateLabel=(d:Date,arabic:boolean)=>new Intl.DateTimeFormat(arabic?"ar-EG":"en-GB",{timeZone:"Africa/Cairo",day:"2-digit",month:"short",year:"numeric"}).format(d);
const idsSql=(ids:string[])=>sql.join(ids.map(id=>sql`${id}`),sql`,`);
const asRecord=(value:unknown):UnknownRecord=>value&&typeof value==="object"&&!Array.isArray(value)?Object.fromEntries(Object.entries(value)):{};
const errorText=(error:unknown,fallback="VIVITO request failed safely.")=>error instanceof Error?error.message:String(error||fallback);

async function clientScope(role:string,userId:string,workspaceId:string):Promise<ClientRow[]>{
 if(["SUPER_ADMIN","ACCOUNTANT"].includes(role))return Array.from(await db.execute<ClientRow>(sql`select id,company_name,industry from clients where workspace_id=${workspaceId} and is_active=true order by company_name`));
 if(role==="ACCOUNT_MANAGER")return Array.from(await db.execute<ClientRow>(sql`select id,company_name,industry from clients where workspace_id=${workspaceId} and is_active=true and account_manager_id=${userId} order by company_name`));
 if(role==="MEDIA_BUYER")return Array.from(await db.execute<ClientRow>(sql`select id,company_name,industry from clients where workspace_id=${workspaceId} and is_active=true and media_buyer_id=${userId} order by company_name`));
 if(role==="CLIENT")return Array.from(await db.execute<ClientRow>(sql`select id,company_name,industry from clients where workspace_id=${workspaceId} and is_active=true and user_id=${userId} limit 1`));
 return[];
}

async function taskContext(role:string,userId:string,ids:string[],workspaceId:string):Promise<TaskRow[]>{
 if(role==="CREATOR")return Array.from(await db.execute<TaskRow>(sql`select t.id,t.title,t.status,t.priority,t.deadline,t.client_id,t.type,t.revision_count,t.file_url,t.approved_by_client,c.company_name from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${workspaceId} and t.archived_at is null and t.deleted_at is null and c.workspace_id=${workspaceId} and c.is_active=true and t.assigned_to_id=${userId} and t.status not in ('COMPLETED','REJECTED') order by t.deadline asc limit 120`));
 if(ids.length&&["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CLIENT"].includes(role))return Array.from(await db.execute<TaskRow>(sql`select t.id,t.title,t.status,t.priority,t.deadline,t.client_id,t.type,t.revision_count,t.file_url,t.approved_by_client,c.company_name from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${workspaceId} and t.archived_at is null and t.deleted_at is null and c.workspace_id=${workspaceId} and c.is_active=true and t.client_id in (${idsSql(ids)}) and t.status not in ('COMPLETED','REJECTED') order by t.deadline asc limit 120`));
 return[];
}

async function mediaContext(role:string,ids:string[],workspaceId:string):Promise<MediaRow[]>{
 if(!ids.length||!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CLIENT"].includes(role))return[];
 const result=Array.from(await db.execute<MediaRawRow>(sql`select c.company_name,c.industry,ac.id campaign_id,ac.name campaign,ac.objective,ac.status,ac.reported_result_label,ac.reported_result_type,
 coalesce(sum(case when p.date>=date_trunc('month',now()) then p.spend else 0 end),0) spend,
 coalesce(sum(case when p.date>=date_trunc('month',now()) then p.results else 0 end),0) results,
 coalesce(sum(case when p.date>=date_trunc('month',now()) then p.add_to_cart else 0 end),0) atc,
 coalesce(sum(case when p.date>=date_trunc('month',now()) then p.purchases else 0 end),0) purchases,
 coalesce(sum(case when p.date>=date_trunc('month',now()) then p.revenue else 0 end),0) revenue,
 coalesce(sum(case when p.date>=date_trunc('month',now()) then p.impressions else 0 end),0) impressions,
 coalesce(sum(case when p.date>=date_trunc('month',now()) then p.reach else 0 end),0) reach,
 coalesce(sum(case when p.date>=date_trunc('month',now()) then p.clicks else 0 end),0) clicks,
 coalesce(sum(case when p.date>=date_trunc('month',now())-interval '1 month' and p.date<date_trunc('month',now())-interval '1 month'+(now()-date_trunc('month',now())) then p.spend else 0 end),0) previous_spend,
 coalesce(sum(case when p.date>=date_trunc('month',now())-interval '1 month' and p.date<date_trunc('month',now())-interval '1 month'+(now()-date_trunc('month',now())) then p.results else 0 end),0) previous_results,
 coalesce(sum(case when p.date>=date_trunc('month',now())-interval '1 month' and p.date<date_trunc('month',now())-interval '1 month'+(now()-date_trunc('month',now())) then p.purchases else 0 end),0) previous_purchases,
 coalesce(sum(case when p.date>=date_trunc('month',now())-interval '1 month' and p.date<date_trunc('month',now())-interval '1 month'+(now()-date_trunc('month',now())) then p.revenue else 0 end),0) previous_revenue
 from ad_campaigns ac join clients c on c.id=ac.client_id
 left join ad_performance_daily p on p.campaign_id=ac.id and p.date>=date_trunc('month',now())-interval '1 month' and p.breakdown_type='TOTAL' and p.ad_set_id is null and p.ad_id is null
 where ac.workspace_id=${workspaceId} and c.workspace_id=${workspaceId} and ac.client_id in (${idsSql(ids)}) and ac.archived_at is null
 group by c.company_name,c.industry,ac.id,ac.name,ac.objective,ac.status,ac.reported_result_label,ac.reported_result_type order by spend desc limit 100`));
 return result.map(x=>{const spend=n(x.spend),impressions=n(x.impressions),reach=n(x.reach),clicks=n(x.clicks),results=n(x.results),purchases=n(x.purchases),atc=n(x.atc),revenue=n(x.revenue),previousSpend=n(x.previous_spend),previousResults=n(x.previous_results),previousPurchases=n(x.previous_purchases),previousRevenue=n(x.previous_revenue),resultDefinition=String(x.reported_result_label||x.reported_result_type||x.objective||"Results");return{...x,spend,impressions,reach,clicks,results,purchases,atc,revenue,previousSpend,previousResults,previousPurchases,previousRevenue,resultDefinition,ctr:impressions?(clicks/impressions)*100:0,cpc:clicks?spend/clicks:0,cpm:impressions?(spend/impressions)*1000:0,costPerResult:results?spend/results:0,frequency:reach?impressions/reach:0,roas:spend?revenue/spend:0,previousCostPerResult:previousResults?previousSpend/previousResults:0,previousRoas:previousSpend?previousRevenue/previousSpend:0}});
}

async function trackingContext(role:string,ids:string[],workspaceId:string):Promise<TrackingRow[]>{if(!ids.length||!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return[];return Array.from(await db.execute<TrackingRow>(sql`select t.client_id,c.company_name,t.platform,t.pixel_status,t.capi_status,t.utm_status,t.landing_page_status,t.issues,t.checked_at from tracking_health t join clients c on c.id=t.client_id where c.workspace_id=${workspaceId} and c.is_active=true and t.client_id in (${idsSql(ids)}) order by t.checked_at desc limit 50`))}
async function clientHealthContext(role:string,ids:string[],workspaceId:string):Promise<ClientHealthRow[]>{if(!ids.length||!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return[];return Array.from(await db.execute<ClientHealthRow>(sql`select id,company_name,industry,health_score,performance_score,churn_risk,churn_probability,media_budget,target_leads from clients where workspace_id=${workspaceId} and is_active=true and id in (${idsSql(ids)}) order by health_score asc limit 60`))}
async function salesContext(role:string,userId:string,workspaceId:string):Promise<SalesRow[]>{if(!["SUPER_ADMIN","SALES"].includes(role))return[];const ownerFilter=role==="SALES"?sql`and l.sales_rep_id=${userId}`:sql``;return Array.from(await db.execute<SalesRow>(sql`select l.id,l.company_name,l.stage,l.estimated_value,l.probability,l.next_follow_up,l.follow_up_count,l.industry,l.expected_close,l.updated_at,(select max(a.created_at) from sales_activities a where a.lead_id=l.id) last_activity_at from sales_leads l where l.workspace_id=${workspaceId} and l.archived_at is null ${ownerFilter} order by coalesce(l.next_follow_up,l.expected_close,l.updated_at) asc limit 100`))}
async function financeContext(role:string,ids:string[],workspaceId:string):Promise<FinanceContext>{if(!["SUPER_ADMIN","ACCOUNTANT"].includes(role))return{billing:[],expenses:[]};let billing:BillingRow[]=[];if(ids.length)billing=Array.from(await db.execute<BillingRow>(sql`select c.company_name,p.amount_due,p.amount_paid,p.amount_remaining,p.payment_day,p.payment_status from client_payment_profiles p join clients c on c.id=p.client_id where c.workspace_id=${workspaceId} and c.is_active=true and p.client_id in (${idsSql(ids)}) order by p.amount_remaining desc limit 80`));const expenses=Array.from(await db.execute<ExpenseRow>(sql`select category,coalesce(sum(amount),0) amount from company_expenses where workspace_id=${workspaceId} and date>=date_trunc('month',now()) group by category order by amount desc limit 20`));return{billing,expenses}}
async function actionStaff(role:string,workspaceId:string):Promise<StaffRow[]>{if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return[];return Array.from(await db.execute<StaffRow>(sql`select id,name,role from users where workspace_id=${workspaceId} and is_active=true and role in ('CREATOR','ACCOUNT_MANAGER','MEDIA_BUYER') order by name limit 120`))}
function resolveAuthorizedClient(clients:ClientRow[],nameRaw:string){const name=String(nameRaw||"").trim().toLowerCase();if(!name)return null;const exact=clients.filter(c=>String(c.company_name).toLowerCase()===name);if(exact.length===1)return exact[0];const fuzzy=clients.filter(c=>String(c.company_name).toLowerCase().includes(name)||name.includes(String(c.company_name).toLowerCase()));return fuzzy.length===1?fuzzy[0]:null}

function buildOperations(tasks:TaskRow[]):OperationsSummary{const now=Date.now(),overdue=tasks.filter(t=>new Date(t.deadline).getTime()<now),byStatus=tasks.reduce((acc:Record<string,number>,t)=>{const key=String(t.status||"UNKNOWN");acc[key]=(acc[key]||0)+1;return acc},{}),byPriority=tasks.reduce((acc:Record<string,number>,t)=>{const key=String(t.priority||"UNKNOWN");acc[key]=(acc[key]||0)+1;return acc},{});return{activeTasks:tasks.length,overdueTasks:overdue.length,reviewTasks:tasks.filter(t=>t.status==="REVIEW").length,revisionTasks:tasks.filter(t=>t.status==="REVISION").length,byStatus,byPriority}}
function buildSalesSummary(leads:SalesRow[]):SalesSummary{const byStage=leads.reduce((acc:Record<string,number>,lead)=>{const key=String(lead.stage||"UNKNOWN");acc[key]=(acc[key]||0)+1;return acc},{}),weightedPipeline=leads.reduce((sum,lead)=>sum+n(lead.estimated_value)*(n(lead.probability)/100),0),overdueFollowUps=leads.filter(l=>l.next_follow_up&&new Date(l.next_follow_up).getTime()<Date.now()).length;return{leadCount:leads.length,byStage,weightedPipeline,overdueFollowUps}}
function buildMediaSummary(campaigns:MediaRow[]):MediaSummary{const totals=campaigns.reduce((a,x)=>{a.spend+=n(x.spend);a.results+=n(x.results);a.atc+=n(x.atc);a.purchases+=n(x.purchases);a.revenue+=n(x.revenue);a.previousSpend+=n(x.previousSpend);a.previousResults+=n(x.previousResults);a.previousPurchases+=n(x.previousPurchases);a.previousRevenue+=n(x.previousRevenue);return a},{spend:0,results:0,atc:0,purchases:0,revenue:0,previousSpend:0,previousResults:0,previousPurchases:0,previousRevenue:0});return{...totals,periodComparison:"month-to-date vs same elapsed portion of previous month",roas:totals.spend?totals.revenue/totals.spend:0,previousRoas:totals.previousSpend?totals.previousRevenue/totals.previousSpend:0}}

async function readUploadedImageForVivito(userId:string,attachment:Attachment,workspaceId:string){
 const [row]=Array.from(await db.execute<StoredImageRow>(sql`select storage_path,mime_type,size_bytes,name from file_documents where id=${attachment.fileId} and workspace_id=${workspaceId} and uploaded_by=${userId} and archived_at is null and mime_type like 'image/%' limit 1`));
 if(!row)throw new Error("image-not-accessible");if(Number(row.size_bytes||0)>12*1024*1024)throw new Error("image-too-large-for-vision");
 const base=String(process.env.SUPABASE_URL||"").replace(/\/$/,"");const key=String(process.env.SUPABASE_SERVICE_KEY||"");if(!base||!key)throw new Error("storage-not-configured");
 const r=await fetch(base+"/storage/v1/object/vivit-files/"+row.storage_path,{headers:{apikey:key,Authorization:"Bearer "+key},signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error("image-fetch-failed");
 const bytes=Buffer.from(await r.arrayBuffer());return{mimeType:String(row.mime_type||attachment.mimeType||"image/png"),base64:bytes.toString("base64"),name:String(row.name||attachment.name||"image")}
}

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const rawBody:unknown=await req.json().catch(()=>({})),body=asRecord(rawBody),question=String(body.question||"").trim().slice(0,1600);if(!question)return NextResponse.json({error:"Ask a question first."},{status:400});
 const role=String(session.user.role||""),userId=String(session.user.id||""),workspaceId=String(session.user.workspaceId||"");if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403});
 const attachments:Attachment[]=Array.isArray(body.attachments)?body.attachments.slice(0,5).flatMap(value=>{const x=asRecord(value),fileId=String(x.fileId||"").slice(0,100);return fileId?[{fileId,name:String(x.name||"").slice(0,255),mimeType:String(x.mimeType||"").slice(0,120)}]:[]}):[];
 const clients=await clientScope(role,userId,workspaceId),ids=clients.map(c=>String(c.id));
 const [tasks,campaigns,tracking,clientHealth,sales,finance,memories]=await Promise.all([taskContext(role,userId,ids,workspaceId),mediaContext(role,ids,workspaceId),trackingContext(role,ids,workspaceId),clientHealthContext(role,ids,workspaceId),salesContext(role,userId,workspaceId),financeContext(role,ids,workspaceId),loadVivitoMemories(userId,role,ids,workspaceId)]);

 if(role==="CLIENT"&&/(waiting.*review|review.*waiting|waiting.*approval|approval|approve|مراجعة|موافقة)/i.test(question)){
  const queue=tasks.filter(t=>Boolean(t.file_url)&&["APPROVED","COMPLETED"].includes(String(t.status))&&!t.approved_by_client);
  const arabic=isArabic(question);
  const answer=queue.length?`${arabic?"بانتظار مراجعتك":"Waiting for your review"} (${queue.length}):\n${queue.slice(0,12).map(t=>`- ${t.title} · ${t.company_name}`).join("\n")}`:(arabic?"لا يوجد أي تصميم بانتظار موافقتك حاليًا.":"Nothing is waiting for your approval right now.");
  return NextResponse.json({answer,sources:["Creative Tasks"],mode:"client-review",intelligence:"VIVITO"},{headers:{"Cache-Control":"private, no-store"}});
 }

 if(likelyCompetitiveChatIntent(question)){
  try{
   const planned=await generateVivito(question+"\n\nAUTHORIZED CLIENTS: "+JSON.stringify(clients.map(c=>c.company_name)),buildCompetitivePlannerSystem(),{temperature:0,maxTokens:1400});
   const cp=parseCompetitiveChatPlan(planned.text);
   if(cp){const client=resolveAuthorizedClient(clients,cp.clientName);if(!client)return NextResponse.json({answer:isArabic(question)?"حدد اسم العميل/البراند اللي هنراقب المنافسين بتوعه بوضوح.":"Specify the client/brand whose competitors should be monitored.",mode:"competitive-clarification",intelligence:"VIVITO"},{headers:{"Cache-Control":"private, no-store"}});
    if(cp.op==="report"){const report=await buildDailyCompetitiveReport(String(client.id));return NextResponse.json({answer:report.summary,mode:"competitive-report",intelligence:"VIVITO",competitiveReport:report,sources:["VIVITO Competitive Intelligence","Public social snapshots"]},{headers:{"Cache-Control":"private, no-store"}})}
    let added=0;for(const comp of cp.competitors){if(!comp.urls.length)continue;const [watch]=Array.from(await db.execute<WatchlistIdRow>(sql`insert into competitor_watchlists(workspace_id,client_id,competitor_name,created_by) values(${workspaceId},${String(client.id)},${comp.name||"Competitor"},${userId}) returning id`));if(!watch)continue;for(const url of comp.urls){const platform=platformFromUrl(url);await db.execute(sql`insert into competitor_social_profiles(watchlist_id,platform,profile_url) values(${watch.id},${platform},${url}) on conflict do nothing`);added++}}
    return NextResponse.json({answer:isArabic(question)?"تم تفعيل مراقبة المنافسين: "+added+" حساب/رابط. VIVITO هيخزن snapshots يومية ويطلع التغييرات والتقرير.":"Competitive monitoring enabled for "+added+" social profile(s). Daily snapshots and deltas are now configured.",mode:"competitive-setup",intelligence:"VIVITO",sources:["VIVITO Competitive Intelligence"]},{headers:{"Cache-Control":"private, no-store"}})
   }
  }catch{return NextResponse.json({answer:isArabic(question)?"مش قادر أفعّل المراقبة بالروابط دي. اتأكد إن الروابط عامة وصحيحة.":"I could not configure monitoring from those links. Use valid public social URLs.",mode:"competitive-error",intelligence:"VIVITO"},{headers:{"Cache-Control":"private, no-store"}})}
 }

 if(likelyVivitoArtifactIntent(question)){
  try{
   const kind=requestedArtifactKind(question);let research:VivitoGroundedResearch|null=null,visionText="";
   if(likelyVivitoResearchIntent(question)){try{research=await groundedVivitoResearch(question)}catch{research={text:"Current web research was unavailable; do not invent current facts.",queries:[],sources:[]}}}
   const image=attachments.find(a=>a.mimeType.startsWith("image/"));
   if(image){try{const input=await readUploadedImageForVivito(userId,image,workspaceId),vision=await analyzeVivitoImage({mimeType:input.mimeType,base64:input.base64,prompt:"Analyze this reference for the requested artifact: "+question});visionText=vision.text}catch{}}
   const evidence=[research?.text?"CURRENT RESEARCH:\n"+research.text:"",visionText?"IMAGE ANALYSIS:\n"+visionText:""].filter(Boolean).join("\n\n");
   const artifactPrompt="USER REQUEST:\n"+question+"\n\nAUTHORIZED CLIENTS:\n"+JSON.stringify(clients.map(c=>c.company_name))+(evidence?"\n\nEVIDENCE:\n"+evidence:"");
   const planned=await generateVivito(artifactPrompt,buildVivitoArtifactPlannerSystem(kind),{temperature:.08,maxTokens:6500}),artifactProposal=parseVivitoArtifactProposal(planned.text,kind);
   if(artifactProposal){const sources=["VIVITO Artifact Architect"];if(research?.sources.length)sources.push(...research.sources.map(s=>s.title).slice(0,8));if(visionText)sources.push("VIVITO Visual Intelligence");return NextResponse.json({answer:isArabic(question)?"جهزت هيكل "+artifactProposal.title+". تقدر تولّد الملف من الكارت تحت.":artifactProposal.title+" is structured and ready to generate.",mode:"artifact-proposal",intelligence:"VIVITO",artifactProposal,sources,intelligenceMeta:{provider:planned.provider,artifactKind:kind,groundedResearch:!!research?.sources.length,visionUsed:!!visionText}},{headers:{"Cache-Control":"private, no-store"}})}
  }catch(error){console.error("VIVITO artifact planning failed",error)}
 }
 if(likelyVivitoVisionIntent(question,attachments)){
  try{const image=attachments.find(a=>a.mimeType.startsWith("image/"));if(image){const input=await readUploadedImageForVivito(userId,image,workspaceId),vision=await analyzeVivitoImage({mimeType:input.mimeType,base64:input.base64,prompt:question});return NextResponse.json({answer:vision.text,sources:["Visual: "+input.name,"VIVITO Visual Intelligence"],mode:"vision",intelligence:"VIVITO",intelligenceMeta:{vision:true,model:vision.model}},{headers:{"Cache-Control":"private, no-store"}})}}catch{return NextResponse.json({answer:isArabic(question)?"مش قادر أقرأ الصورة دي بأمان دلوقتي. تأكد إنها PNG/JPG/WebP وأقل من 12MB.":"I could not analyze that image safely. Use PNG/JPG/WebP under 12MB.",mode:"vision-error",intelligence:"VIVITO"},{headers:{"Cache-Control":"private, no-store"}})}
 }
 if(likelyVivitoResearchIntent(question)){
  try{const research=await groundedVivitoResearch(question);return NextResponse.json({answer:research.text,sources:research.sources.map(s=>s.title).slice(0,12),sourceLinks:research.sources.slice(0,12),mode:"grounded-research",intelligence:"VIVITO",intelligenceMeta:{groundedResearch:true,queries:research.queries}},{headers:{"Cache-Control":"private, no-store"}})}catch{}
 }

 if(likelyVivitoMemoryIntent(question)){
  try{
   const planned=await generateVivito(question,buildVivitoMemoryPlannerSystem(role),{temperature:0,maxTokens:600}),memoryPlan=parseVivitoMemoryPlan(planned.text,role),arabic=isArabic(question);
   if(memoryPlan?.op==="save"){
    let scopeId:string|null=null;if(memoryPlan.scopeType==="CLIENT"){const c=resolveAuthorizedClient(clients,memoryPlan.clientName||"");if(!c)return NextResponse.json({answer:arabic?"مش قادر أحدد العميل المقصود بشكل آمن. اكتب اسم العميل بوضوح.":"I cannot resolve that client safely. Use the exact client name.",mode:"memory-clarification",intelligence:"VIVITO"},{headers:{"Cache-Control":"private, no-store"}});scopeId=String(c.id)}
    const saved=await saveVivitoMemory({kind:memoryPlan.kind,scopeType:memoryPlan.scopeType,scopeId,text:memoryPlan.text},userId,role,workspaceId);return NextResponse.json({answer:arabic?`اتحفظت في ذاكرة VIVITO: ${saved.text}`:`Saved to VIVITO memory: ${saved.text}`,mode:"memory-saved",intelligence:"VIVITO",memory:{id:saved.id,kind:saved.kind,scopeType:saved.scopeType}},{headers:{"Cache-Control":"private, no-store"}})
   }
   if(memoryPlan?.op==="forget"){const result=await forgetVivitoMemory(memoryPlan.query,userId,role,ids,workspaceId);return NextResponse.json({answer:arabic?`تم حذف ${result.forgotten} عنصر من ذاكرة VIVITO.`:`Removed ${result.forgotten} VIVITO memory item(s).`,mode:"memory-forgotten",intelligence:"VIVITO"},{headers:{"Cache-Control":"private, no-store"}})}
  }catch{return NextResponse.json({answer:isArabic(question)?"تعذر تحديث ذاكرة VIVITO عبر نماذج الـAI المتاحة حاليًا. لم يتم حفظ أو حذف أي شيء.":"VIVITO memory could not be updated through the currently available AI models. Nothing was saved or deleted.",mode:"memory-rejected",intelligence:"VIVITO"},{headers:{"Cache-Control":"private, no-store"}})}
 }

 if(likelyVivitoActionIntent(question,attachments.length)){
  try{
   const staff=await actionStaff(role,workspaceId),directory=`AUTHORIZED ACTIVE CLIENT DIRECTORY:\n${JSON.stringify(clients.map(c=>({name:c.company_name,id:c.id})))}\n\nAUTHORIZED STAFF DIRECTORY:\n${JSON.stringify(staff)}\n\nATTACHMENTS FROM TRUSTED UI METADATA:\n${JSON.stringify(attachments)}`;
   if(likelyVivitoMultiStepIntent(question)){
    const planned=await generateVivito(`USER REQUEST:\n${question}\n\n${directory}`,buildVivitoOrchestratorSystem(role),{temperature:0,maxTokens:2200}),actionPlan=parseVivitoActionPlan(planned.text,role);
    if(actionPlan){const arabic=isArabic(question),answer=actionPlan.missingFields.length?(arabic?`أقدر أنفّذ الخطة، بس ناقص: ${actionPlan.missingFields.join("، ")}.`:`I can execute the plan, but I still need: ${actionPlan.missingFields.join(", ")}.`):(arabic?`خطة التنفيذ جاهزة: ${actionPlan.summary}`:`Execution plan ready: ${actionPlan.summary}`);return NextResponse.json({answer,sources:["VIVITO Orchestrator","ERP Authorization Scope"],mode:"action-plan",intelligence:"VIVITO",actionPlan,intelligenceMeta:{provider:planned.provider,providerAttempts:planned.attempted,liveContext:true,multiStepPlanning:true}},{headers:{"Cache-Control":"private, no-store"}})}
   }
   const planned=await generateVivito(`USER REQUEST:\n${question}\n\n${directory}`,buildVivitoActionPlannerSystem(role),{temperature:0,maxTokens:1000}),actionProposal=parseVivitoActionProposal(planned.text,role);
   if(actionProposal){const arabic=isArabic(question),answer=actionProposal.missingFields.length?(arabic?`أقدر أنفّذ ده، بس ناقص: ${actionProposal.missingFields.join("، ")}.`:`I can execute this, but I still need: ${actionProposal.missingFields.join(", ")}.`):(arabic?`جاهز للتنفيذ: ${actionProposal.summary}`:`Ready to execute: ${actionProposal.summary}`);return NextResponse.json({answer,sources:["VIVITO Action Engine","ERP Authorization Scope"],mode:"action-proposal",intelligence:"VIVITO",actionProposal,intelligenceMeta:{provider:planned.provider,providerAttempts:planned.attempted,liveContext:true,actionPlanning:true}},{headers:{"Cache-Control":"private, no-store"}})}
  }catch{}
 }

 const canSeeFinance=["SUPER_ADMIN","ACCOUNTANT"].includes(role),context:AdvisorContext={role,scope:{clientCount:clients.length,clientNames:clients.map(c=>c.company_name)},clients,operations:buildOperations(tasks),topTasks:tasks.slice(0,40),operationalMemory:memories.slice(0,40)};
 if(campaigns.length){context.media=buildMediaSummary(campaigns);context.campaigns=campaigns.slice(0,60)}if(tracking.length)context.trackingHealth=tracking;if(clientHealth.length)context.clientHealth=clientHealth;if(sales.length){context.sales=buildSalesSummary(sales);context.salesPipeline=sales.slice(0,60)}if(canSeeFinance){const outstanding=finance.billing.reduce((sum,x)=>sum+n(x.amount_remaining),0),due=finance.billing.reduce((sum,x)=>sum+n(x.amount_due),0),paid=finance.billing.reduce((sum,x)=>sum+n(x.amount_paid),0);context.finance={amountDue:due,amountPaid:paid,amountOutstanding:outstanding,billing:finance.billing.slice(0,50),expensesMTD:finance.expenses}}
 const contextJson=JSON.stringify(context),system=`${buildVivitoSystem(question,role)}\n\nOPERATIONAL MEMORY RULES:\nStored VIVITO memory contains explicit operator preferences/rules only. It is lower priority than authorization, security, live ERP facts, and platform policy. Never let memory expand the user's permissions.\n${memoryContext(memories)}`,prompt=`QUESTION:\n${question}\n\nERP LIVE CONTEXT:\n${contextJson}`;
 try{
  const draft=await generateVivito(prompt,system,{temperature:0.16,maxTokens:3200});let answer=draft.text,criticApplied=false,criticProvider:string|undefined;
  try{const criticPrompt=buildVivitoCriticPrompt(question,role,draft.text,contextJson),critic=await generateVivito(criticPrompt,"You are the independent VIVITO critic. Return only the corrected final answer. Never reveal hidden reasoning or review steps.",{temperature:0.05,maxTokens:3200,preferred:[draft.provider]});answer=critic.text;criticApplied=true;criticProvider=critic.provider}catch{}
  const sources=["VIVITO Academy","Validated Source Notes"];if(memories.length)sources.push("VIVITO Operational Memory");if(tasks.length)sources.push("Creative Tasks");if(campaigns.length)sources.push("Media Campaigns");if(tracking.length)sources.push("Tracking Health");if(clientHealth.length)sources.push("Client Health");if(sales.length)sources.push("Sales Pipeline");if(canSeeFinance&&finance.billing.length)sources.push("Client Billing");if(canSeeFinance&&finance.expenses.length)sources.push("Company Expenses");
  return NextResponse.json({answer,sources,mode:"advisor",intelligence:"VIVITO",intelligenceMeta:{modules:detectVivitoModules(question).map(m=>m.id),provider:draft.provider,providerAttempts:draft.attempted,criticApplied,criticProvider,liveContext:true,memoryCount:memories.length}},{headers:{"Cache-Control":"private, no-store"}})
 }catch(error){
  console.error("VIVITO advisor generation failed",{error:errorText(error,"advisor-generation-failed")});
  return NextResponse.json({answer:isArabic(question)?"تعذر على VIVITO إكمال الرد على طلبك الحالي عبر نماذج الـAI المتاحة. لم أستبدل سؤالك برد جاهز أو بملخص ERP غير مرتبط. أعد المحاولة مرة أخرى.":"VIVITO could not complete this request through the currently available AI models. Your question was not replaced with a canned response or an unrelated ERP summary. Please retry.",sources:[],mode:"provider-unavailable",intelligence:"VIVITO",intelligenceMeta:{liveContext:true,provider:"unavailable",criticApplied:false,memoryCount:memories.length,retryable:true}},{status:200,headers:{"Cache-Control":"private, no-store"}})
 }
}