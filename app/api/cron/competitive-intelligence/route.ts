export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {db,sql,notifications} from "@/lib/db";
import {buildDailyCompetitiveReport} from "@/lib/vivito/competitive-intelligence";
import {renderCompetitorReportPdf,type CompetitorReportPayload} from "@/lib/vivito/competitor-report-pdf";

type DbRow=Record<string,unknown>;
const rows=(v:unknown):DbRow[]=>Array.from(v as Iterable<DbRow>);
const ageHours=(value:unknown)=>value?Math.max(0,(Date.now()-new Date(String(value)).getTime())/3600000):Infinity;
const cairoSaturday=()=>new Intl.DateTimeFormat("en-US",{timeZone:"Africa/Cairo",weekday:"short"}).format(new Date())==="Sat";
const due=(cadence:string,lastSent:unknown)=>cadence==="DAILY"?ageHours(lastSent)>=20:cadence==="EVERY_3_DAYS"?ageHours(lastSent)>=68:cairoSaturday()&&ageHours(lastSent)>=140;
const periodMs=(cadence:string)=>cadence==="DAILY"?24*3600000:cadence==="EVERY_3_DAYS"?72*3600000:7*24*3600000;
const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));

function groupPayload(postRows:DbRow[],summary:string,cadence:string,periodStart:Date,periodEnd:Date):CompetitorReportPayload{
 const map=new Map<string,{competitor:string;profileUrl:string;platform:string;newPosts:Array<Record<string,unknown>>}>();
 for(const row of postRows){const key=String(row.profile_id),item=map.get(key)||{competitor:String(row.competitor_name||"Competitor"),profileUrl:String(row.profile_url||""),platform:String(row.platform||"SOCIAL"),newPosts:[]};item.newPosts.push({url:String(row.canonical_url||""),postType:String(row.post_type||"POST"),likes:Number(row.likes||0),comments:Number(row.comments||0),views:Number(row.views||0),shares:Number(row.shares||0),caption:String(row.caption||"")});map.set(key,item)}
 return{summary,details:[...map.values()],periodStart:periodStart.toISOString(),periodEnd:periodEnd.toISOString(),cadence};
}

export async function GET(req:NextRequest){
 const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,""),secret=req.headers.get("x-cron-secret")||bearer||req.nextUrl.searchParams.get("secret");if(process.env.NODE_ENV==="production"&&(!process.env.CRON_SECRET||secret!==process.env.CRON_SECRET))return NextResponse.json({error:"Unauthorized"},{status:401});
 const clients=rows(await db.execute(sql`select distinct w.workspace_id,w.client_id,c.company_name,c.account_manager_id,c.media_buyer_id,c.report_frequency,c.report_last_sent_at from competitor_watchlists w join clients c on c.id=w.client_id and c.workspace_id=w.workspace_id where w.is_active=true and w.report_enabled=true and c.is_active=true and c.deleted_at is null`)),results:DbRow[]=[];
 for(const c of clients){
  const workspaceId=String(c.workspace_id),clientId=String(c.client_id),companyName=String(c.company_name||"Client"),cadence=String(c.report_frequency||"WEEKLY");
  try{
   // Collection happens every day regardless of report cadence so weekly/3-day reports do not miss activity.
   const daily=await buildDailyCompetitiveReport(clientId,workspaceId);
   if(!due(cadence,c.report_last_sent_at)){results.push({workspaceId,clientId,ok:true,collected:true,reportDue:false});continue}
   const periodEnd=new Date(),periodStart=new Date(periodEnd.getTime()-periodMs(cadence));
   const postRows=rows(await db.execute(sql`select w.competitor_name,p.id profile_id,p.platform,p.profile_url,cp.canonical_url,cp.post_type,cp.caption,cp.first_seen_at,s.likes,s.comments,s.shares,s.views from competitor_watchlists w join competitor_social_profiles p on p.watchlist_id=w.id join competitor_posts cp on cp.social_profile_id=p.id left join lateral (select likes,comments,shares,views from competitor_post_snapshots where competitor_post_id=cp.id order by captured_at desc limit 1) s on true where w.workspace_id=${workspaceId} and w.client_id=${clientId} and w.is_active=true and p.is_active=true and cp.first_seen_at>=${periodStart} and cp.first_seen_at<=${periodEnd} order by w.competitor_name,p.platform,cp.first_seen_at desc`));
   const payload=groupPayload(postRows,daily.summary,cadence,periodStart,periodEnd),runId=crypto.randomUUID(),approvalId=crypto.randomUUID();
   await db.transaction(async tx=>{
    await tx.execute(sql`insert into vivito_report_runs(id,workspace_id,client_id,report_type,cadence,period_start,period_end,report_json,generated_at) values(${runId}::uuid,${workspaceId},${clientId},'COMPETITOR_MONITORING',${cadence},${periodStart},${periodEnd},${JSON.stringify(payload)}::jsonb,now())`);
    await tx.execute(sql`insert into competitor_report_approvals(id,workspace_id,client_id,report_id,report_period_start,report_period_end,status,client_delivery_requested,created_at,updated_at) values(${approvalId}::uuid,${workspaceId},${clientId},${runId},${periodStart.toISOString().slice(0,10)},${periodEnd.toISOString().slice(0,10)},'PENDING',false,now(),now())`);
    await tx.execute(sql`update clients set report_last_sent_at=now(),report_next_due_at=case when ${cadence}='DAILY' then now()+interval '1 day' when ${cadence}='EVERY_3_DAYS' then now()+interval '3 days' else now()+interval '7 days' end,updated_at=now() where id=${clientId} and workspace_id=${workspaceId}`);
   });
   const targetRows=rows(await db.execute(sql`select distinct u.id,u.email,u.name from users u where u.workspace_id=${workspaceId} and u.is_active=true and u.approval_status='APPROVED' and (u.role='SUPER_ADMIN' or u.id=${String(c.account_manager_id||"")} or u.id=${String(c.media_buyer_id||"")} or u.id in (select assigned_to_id from creative_tasks where workspace_id=${workspaceId} and client_id=${clientId} and assigned_to_id is not null and deleted_at is null))`));
   for(const target of targetRows)await db.insert(notifications).values({userId:String(target.id),type:"GENERAL",priority:"normal",title:`📡 Vivito report — ${companyName}`,message:`${cadence.replaceAll("_"," ")} competitor report is ready. Client delivery requires approval by Super Admin, Account Manager or Media Buyer.`,link:`/api/vivito/competitive-report/${clientId}?runId=${runId}`}).onConflictDoNothing();
   if(targetRows.length&&process.env.RESEND_API_KEY){const pdf=renderCompetitorReportPdf(companyName,payload),attachment=Buffer.from(pdf).toString("base64");for(const target of targetRows){if(!target.email)continue;await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.RESEND_API_KEY}`},body:JSON.stringify({from:process.env.EMAIL_FROM||"VIVIT ERP <noreply@viviterp.com>",to:[String(target.email)],subject:`Vivito ${cadence.replaceAll("_"," ")} Competitor Report — ${companyName}`,html:`<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:24px"><h2>Vivito Competitor Report</h2><p><b>${esc(companyName)}</b></p><p>${esc(daily.summary)}</p><p>Client delivery is pending internal approval.</p></div>`,attachments:[{filename:`${companyName.replace(/[^a-z0-9_-]+/gi,"-")}-vivito-report.pdf`,content:attachment}]}) ,signal:AbortSignal.timeout(15000)}).catch(()=>null)}}
   await db.execute(sql`update vivito_report_runs set team_notified_at=now() where id=${runId}::uuid`);
   results.push({workspaceId,clientId,ok:true,collected:true,reportDue:true,runId,approvalId,targets:targetRows.length});
  }catch(e){results.push({workspaceId,clientId,ok:false,error:e instanceof Error?e.message:String(e)})}
 }
 return NextResponse.json({ok:true,clients:results.length,results},{headers:{"Cache-Control":"no-store"}});
}
