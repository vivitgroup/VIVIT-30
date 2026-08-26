export const dynamic="force-dynamic";

import { NextRequest,NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db,sql } from "@/lib/db";
import { buildVivitoCriticPrompt,detectVivitoModules } from "@/lib/vivito/intelligence";
import { buildVivitoSystem } from "@/lib/vivito/playbook";
import { generateVivito } from "@/lib/vivito/providers";
import {buildVivitoActionPlannerSystem,likelyVivitoActionIntent,parseVivitoActionProposal} from "@/lib/vivito/action-engine";

const W="default";
const n=(v:unknown)=>Number(v||0);
const isArabic=(s:string)=>/[\u0600-\u06ff]/.test(s);
const cairoDay=(d:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const dateLabel=(d:Date,arabic:boolean)=>new Intl.DateTimeFormat(arabic?"ar-EG":"en-GB",{timeZone:"Africa/Cairo",day:"2-digit",month:"short",year:"numeric"}).format(d);
const rows=(value:any)=>Array.from(value as any) as any[];
const idsSql=(ids:string[])=>sql.join(ids.map(id=>sql`${id}`),sql`,`);

async function clientScope(role:string,userId:string):Promise<any[]>{
  let result:any;
  if(["SUPER_ADMIN","ACCOUNTANT"].includes(role)){
    result=await db.execute(sql`select id,company_name,industry from clients where workspace_id=${W} and is_active=true order by company_name`);
  }else if(role==="ACCOUNT_MANAGER"){
    result=await db.execute(sql`select id,company_name,industry from clients where workspace_id=${W} and is_active=true and account_manager_id=${userId} order by company_name`);
  }else if(role==="MEDIA_BUYER"){
    result=await db.execute(sql`select id,company_name,industry from clients where workspace_id=${W} and is_active=true and media_buyer_id=${userId} order by company_name`);
  }else if(role==="CLIENT"){
    result=await db.execute(sql`select id,company_name,industry from clients where workspace_id=${W} and is_active=true and user_id=${userId} limit 1`);
  }else return[];
  return rows(result);
}

async function taskContext(role:string,userId:string,ids:string[]):Promise<any[]>{
  let result:any;
  if(role==="CREATOR"){
    result=await db.execute(sql`select t.id,t.title,t.status,t.priority,t.deadline,t.client_id,t.type,t.revision_count,c.company_name from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${W} and t.archived_at is null and t.deleted_at is null and c.workspace_id=${W} and c.is_active=true and t.assigned_to_id=${userId} and t.status not in ('COMPLETED','REJECTED') order by t.deadline asc limit 120`);
  }else if(ids.length&&["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CLIENT"].includes(role)){
    result=await db.execute(sql`select t.id,t.title,t.status,t.priority,t.deadline,t.client_id,t.type,t.revision_count,c.company_name from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${W} and t.archived_at is null and t.deleted_at is null and c.workspace_id=${W} and c.is_active=true and t.client_id in (${idsSql(ids)}) and t.status not in ('COMPLETED','REJECTED') order by t.deadline asc limit 120`);
  }else return[];
  return rows(result);
}

async function mediaContext(role:string,ids:string[]):Promise<any[]>{
  if(!ids.length||!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CLIENT"].includes(role))return[];
  const result=await db.execute(sql`select c.company_name,c.industry,ac.id campaign_id,ac.name campaign,ac.objective,ac.status,ac.reported_result_label,ac.reported_result_type,
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
    where ac.workspace_id=${W} and c.workspace_id=${W} and ac.client_id in (${idsSql(ids)}) and ac.archived_at is null
    group by c.company_name,c.industry,ac.id,ac.name,ac.objective,ac.status,ac.reported_result_label,ac.reported_result_type
    order by spend desc limit 100`);
  return rows(result).map((x:any)=>{
    const spend=n(x.spend),impressions=n(x.impressions),reach=n(x.reach),clicks=n(x.clicks),results=n(x.results),purchases=n(x.purchases),atc=n(x.atc),revenue=n(x.revenue);
    const previousSpend=n(x.previous_spend),previousResults=n(x.previous_results),previousPurchases=n(x.previous_purchases),previousRevenue=n(x.previous_revenue);
    const resultDefinition=String(x.reported_result_label||x.reported_result_type||x.objective||"Results");
    return{...x,spend,impressions,reach,clicks,results,purchases,atc,revenue,previousSpend,previousResults,previousPurchases,previousRevenue,resultDefinition,
      ctr:impressions?(clicks/impressions)*100:0,cpc:clicks?spend/clicks:0,cpm:impressions?(spend/impressions)*1000:0,costPerResult:results?spend/results:0,frequency:reach?impressions/reach:0,roas:spend?revenue/spend:0,
      previousCostPerResult:previousResults?previousSpend/previousResults:0,previousRoas:previousSpend?previousRevenue/previousSpend:0};
  });
}

async function trackingContext(role:string,ids:string[]):Promise<any[]>{
  if(!ids.length||!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return[];
  const result=await db.execute(sql`select t.client_id,c.company_name,t.platform,t.pixel_status,t.capi_status,t.utm_status,t.landing_page_status,t.issues,t.checked_at from tracking_health t join clients c on c.id=t.client_id where c.workspace_id=${W} and c.is_active=true and t.client_id in (${idsSql(ids)}) order by t.checked_at desc limit 50`);
  return rows(result);
}

async function clientHealthContext(role:string,ids:string[]):Promise<any[]>{
  if(!ids.length||!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return[];
  const result=await db.execute(sql`select id,company_name,industry,health_score,performance_score,churn_risk,churn_probability,media_budget,target_leads from clients where workspace_id=${W} and is_active=true and id in (${idsSql(ids)}) order by health_score asc limit 60`);
  return rows(result);
}

async function salesContext(role:string,userId:string):Promise<any[]>{
  if(!["SUPER_ADMIN","SALES"].includes(role))return[];
  const ownerFilter=role==="SALES"?sql`and l.sales_rep_id=${userId}`:sql``;
  const result=await db.execute(sql`select l.id,l.company_name,l.stage,l.estimated_value,l.probability,l.next_follow_up,l.follow_up_count,l.industry,l.expected_close,l.updated_at,(select max(a.created_at) from sales_activities a where a.lead_id=l.id) last_activity_at from sales_leads l where l.workspace_id=${W} and l.archived_at is null ${ownerFilter} order by coalesce(l.next_follow_up,l.expected_close,l.updated_at) asc limit 100`);
  return rows(result);
}

async function financeContext(role:string,ids:string[]):Promise<{billing:any[];expenses:any[]}>{
  if(!["SUPER_ADMIN","ACCOUNTANT"].includes(role))return{billing:[],expenses:[]};
  let billing:any[]=[];
  if(ids.length){
    billing=rows(await db.execute(sql`select c.company_name,p.amount_due,p.amount_paid,p.amount_remaining,p.payment_day,p.payment_status from client_payment_profiles p join clients c on c.id=p.client_id where c.workspace_id=${W} and c.is_active=true and p.client_id in (${idsSql(ids)}) order by p.amount_remaining desc limit 80`));
  }
  const expenses=rows(await db.execute(sql`select category,coalesce(sum(amount),0) amount from company_expenses where workspace_id=${W} and date>=date_trunc('month',now()) group by category order by amount desc limit 20`));
  return{billing,expenses};
}

async function actionStaff(role:string){
  if(!["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role))return[];
  return rows(await db.execute(sql`select id,name,role from users where workspace_id=${W} and is_active=true and role in ('CREATOR','ACCOUNT_MANAGER','MEDIA_BUYER') order by name limit 120`));
}

function taskAnswer(question:string,tasks:any[]){
  const arabic=isArabic(question),q=question.toLowerCase(),today=cairoDay(new Date());
  const todayTasks=tasks.filter(t=>cairoDay(new Date(t.deadline))===today);
  const overdue=tasks.filter(t=>new Date(t.deadline).getTime()<Date.now()&&cairoDay(new Date(t.deadline))!==today);
  const soon=[...tasks].filter(t=>new Date(t.deadline)>=new Date()).sort((a,b)=>+new Date(a.deadline)-+new Date(b.deadline)).slice(0,10);
  const line=(t:any)=>`• ${t.title} — ${t.company_name||"Client"} — ${dateLabel(new Date(t.deadline),arabic)} — ${String(t.status).replace(/_/g," ")}`;
  if(/today|النهارده|اليوم|انهاردة|انهارده/.test(q))return todayTasks.length?`${arabic?"تاسكات النهارده":"Tasks due today"} (${todayTasks.length}):\n${todayTasks.map(line).join("\n")}`:(arabic?"مفيش تاسكات ديدلاينها النهارده.":"No tasks are due today.");
  if(/overdue|late|متأخر|متاخر|فات/.test(q))return overdue.length?`${arabic?"التاسكات المتأخرة":"Overdue tasks"} (${overdue.length}):\n${overdue.slice(0,12).map(line).join("\n")}`:(arabic?"مفيش تاسكات متأخرة حاليًا.":"There are no overdue tasks right now.");
  if(!tasks.length)return arabic?"مفيش تاسكات نشطة متاحة في نطاق دورك حاليًا.":"There are no active tasks available in your role scope right now.";
  return `${arabic?`عندك ${tasks.length} تاسك نشطة. أقرب الديدلاينز:`:`You have ${tasks.length} active tasks. Nearest deadlines:`}\n${soon.map(line).join("\n")}`;
}

function buildOperations(tasks:any[]){
  const now=Date.now();
  const overdue=tasks.filter(t=>new Date(t.deadline).getTime()<now);
  const byStatus=tasks.reduce((acc:Record<string,number>,t:any)=>{const key=String(t.status||"UNKNOWN");acc[key]=(acc[key]||0)+1;return acc;},{});
  const byPriority=tasks.reduce((acc:Record<string,number>,t:any)=>{const key=String(t.priority||"UNKNOWN");acc[key]=(acc[key]||0)+1;return acc;},{});
  return{activeTasks:tasks.length,overdueTasks:overdue.length,reviewTasks:tasks.filter(t=>t.status==="REVIEW").length,revisionTasks:tasks.filter(t=>t.status==="REVISION").length,byStatus,byPriority};
}

function buildSalesSummary(leads:any[]){
  const byStage=leads.reduce((acc:Record<string,number>,lead:any)=>{const key=String(lead.stage||"UNKNOWN");acc[key]=(acc[key]||0)+1;return acc;},{});
  const weightedPipeline=leads.reduce((sum,lead)=>sum+n(lead.estimated_value)*(n(lead.probability)/100),0);
  const overdueFollowUps=leads.filter(l=>l.next_follow_up&&new Date(l.next_follow_up).getTime()<Date.now()).length;
  return{leadCount:leads.length,byStage,weightedPipeline,overdueFollowUps};
}

function buildMediaSummary(campaigns:any[]){
  const totals=campaigns.reduce((a:any,x:any)=>{a.spend+=n(x.spend);a.results+=n(x.results);a.atc+=n(x.atc);a.purchases+=n(x.purchases);a.revenue+=n(x.revenue);a.previousSpend+=n(x.previousSpend);a.previousResults+=n(x.previousResults);a.previousPurchases+=n(x.previousPurchases);a.previousRevenue+=n(x.previousRevenue);return a;},{spend:0,results:0,atc:0,purchases:0,revenue:0,previousSpend:0,previousResults:0,previousPurchases:0,previousRevenue:0});
  return{...totals,periodComparison:"month-to-date vs same elapsed portion of previous month",roas:totals.spend?totals.revenue/totals.spend:0,previousRoas:totals.previousSpend?totals.previousRevenue/totals.previousSpend:0};
}

export async function POST(req:NextRequest){
  const session=await auth();
  if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({}));
  const question=String(body.question||"").trim().slice(0,1600);
  if(!question)return NextResponse.json({error:"Ask a question first."},{status:400});

  const role=String((session.user as any).role||"");
  const userId=String((session.user as any).id||"");
  const attachments=Array.isArray(body.attachments)?body.attachments.slice(0,5).map((x:any)=>({fileId:String(x?.fileId||"").slice(0,100),name:String(x?.name||"").slice(0,255),mimeType:String(x?.mimeType||"").slice(0,120)})).filter((x:any)=>x.fileId):[];
  const clients=await clientScope(role,userId);
  const ids=clients.map((c:any)=>String(c.id));
  const [tasks,campaigns,tracking,clientHealth,sales,finance]=await Promise.all([
    taskContext(role,userId,ids),mediaContext(role,ids),trackingContext(role,ids),clientHealthContext(role,ids),salesContext(role,userId),financeContext(role,ids),
  ]);

  if(likelyVivitoActionIntent(question,attachments.length)){
    try{
      const staff=await actionStaff(role);
      const actionPrompt=`USER REQUEST:\n${question}\n\nAUTHORIZED ACTIVE CLIENT DIRECTORY:\n${JSON.stringify(clients.map((c:any)=>({name:c.company_name,id:c.id})))}\n\nAUTHORIZED STAFF DIRECTORY:\n${JSON.stringify(staff)}\n\nATTACHMENTS FROM TRUSTED UI METADATA:\n${JSON.stringify(attachments)}`;
      const planned=await generateVivito(actionPrompt,buildVivitoActionPlannerSystem(role),{temperature:0,maxTokens:1000});
      const actionProposal=parseVivitoActionProposal(planned.text,role);
      if(actionProposal){
        const arabic=isArabic(question);
        const answer=actionProposal.missingFields.length
          ?(arabic?`أقدر أنفّذ ده، بس ناقص: ${actionProposal.missingFields.join("، ")}.`:`I can execute this, but I still need: ${actionProposal.missingFields.join(", ")}.`)
          :(arabic?`جاهز للتنفيذ: ${actionProposal.summary}`:`Ready to execute: ${actionProposal.summary}`);
        return NextResponse.json({answer,sources:["VIVITO Action Engine","ERP Authorization Scope"],mode:"action-proposal",intelligence:"VIVITO",actionProposal,intelligenceMeta:{provider:planned.provider,providerAttempts:planned.attempted,liveContext:true,actionPlanning:true}},{headers:{"Cache-Control":"private, no-store"}});
      }
    }catch{}
  }

  const canSeeFinance=["SUPER_ADMIN","ACCOUNTANT"].includes(role);
  const context:any={
    role,
    scope:{clientCount:clients.length,clientNames:clients.map((c:any)=>c.company_name)},
    clients,
    operations:buildOperations(tasks),
    topTasks:tasks.slice(0,40),
  };
  if(campaigns.length){context.media=buildMediaSummary(campaigns);context.campaigns=campaigns.slice(0,60);}
  if(tracking.length)context.trackingHealth=tracking;
  if(clientHealth.length)context.clientHealth=clientHealth;
  if(sales.length){context.sales=buildSalesSummary(sales);context.salesPipeline=sales.slice(0,60);}
  if(canSeeFinance){
    const outstanding=finance.billing.reduce((sum,x)=>sum+n(x.amount_remaining),0);
    const due=finance.billing.reduce((sum,x)=>sum+n(x.amount_due),0);
    const paid=finance.billing.reduce((sum,x)=>sum+n(x.amount_paid),0);
    context.finance={amountDue:due,amountPaid:paid,amountOutstanding:outstanding,billing:finance.billing.slice(0,50),expensesMTD:finance.expenses};
  }

  const contextJson=JSON.stringify(context);
  const system=buildVivitoSystem(question,role);
  const prompt=`QUESTION:\n${question}\n\nERP LIVE CONTEXT:\n${contextJson}`;

  try{
    const draft=await generateVivito(prompt,system,{temperature:0.16,maxTokens:3200});
    let answer=draft.text;
    let criticApplied=false;
    let criticProvider:string|undefined;
    try{
      const criticPrompt=buildVivitoCriticPrompt(question,role,draft.text,contextJson);
      const critic=await generateVivito(criticPrompt,"You are the independent VIVITO critic. Return only the corrected final answer. Never reveal hidden reasoning or review steps.",{temperature:0.05,maxTokens:3200,preferred:[draft.provider]});
      answer=critic.text;
      criticApplied=true;
      criticProvider=critic.provider;
    }catch{}

    const sources=["VIVITO Academy","Validated Source Notes"];
    if(tasks.length)sources.push("Creative Tasks");
    if(campaigns.length)sources.push("Media Campaigns");
    if(tracking.length)sources.push("Tracking Health");
    if(clientHealth.length)sources.push("Client Health");
    if(sales.length)sources.push("Sales Pipeline");
    if(canSeeFinance&&finance.billing.length)sources.push("Client Billing");
    if(canSeeFinance&&finance.expenses.length)sources.push("Company Expenses");

    return NextResponse.json({
      answer,sources,mode:"advisor",intelligence:"VIVITO",
      intelligenceMeta:{modules:detectVivitoModules(question).map(m=>m.id),provider:draft.provider,providerAttempts:draft.attempted,criticApplied,criticProvider,liveContext:true},
    },{headers:{"Cache-Control":"private, no-store"}});
  }catch{
    const base=taskAnswer(question,tasks);
    const media=context.media?`\n\nLive media snapshot: ${Math.round(n(context.media.spend)).toLocaleString("en-EG")} EGP spend MTD · ${n(context.media.results)} reported results · ${n(context.media.purchases)} purchases.`:"";
    const salesText=context.sales?`\n\nSales snapshot: ${n(context.sales.leadCount)} active leads · ${n(context.sales.overdueFollowUps)} overdue follow-ups.`:"";
    const financeText=canSeeFinance&&context.finance?`\n\nFinance snapshot: ${Math.round(n(context.finance.amountOutstanding)).toLocaleString("en-EG")} EGP outstanding.`:"";
    return NextResponse.json({answer:`${base}${media}${salesText}${financeText}`,sources:["ERP Live Context"],mode:"erp-fallback",intelligence:"VIVITO",intelligenceMeta:{liveContext:true,provider:"unavailable",criticApplied:false}},{status:200,headers:{"Cache-Control":"private, no-store"}});
  }
}