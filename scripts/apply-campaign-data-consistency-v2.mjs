import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8"),write=(p,s)=>fs.writeFileSync(p,s),must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const one=(p,a,b,msg)=>{let s=read(p);must(s.includes(a),msg);s=s.replace(a,b);write(p,s)};

// Client workspace: deterministic date range + exclude soft-deleted campaigns.
one("app/dashboard/clients/[id]/page.tsx",
  "today=iso(new Date()),defaultFrom=iso(new Date(Date.now()-30*86400000))",
  "current=new Date(),today=iso(current),defaultFrom=iso(new Date(current.getTime()-30*86400000))",
  "client date purity pattern missing");
one("app/dashboard/clients/[id]/page.tsx",
  "where a.client_id=${id} and a.archived_at is null group by",
  "where a.client_id=${id} and a.archived_at is null and a.deleted_at is null group by",
  "client campaign lifecycle filter missing");

// Client Portal: same range semantics and active-only records.
one("app/dashboard/portal/page.tsx",
  "defaultFrom=iso(new Date(Date.now()-30*86400000))",
  "defaultFrom=iso(new Date(now.getTime()-30*86400000))",
  "portal date purity pattern missing");
{
 const p="app/dashboard/portal/page.tsx";let s=read(p);
 s=s.replace("c.archived_at is null group by","c.archived_at is null and c.deleted_at is null group by");
 s=s.replace("creative_tasks where id=${taskId} and client_id=${client.id} and workspace_id=${workspaceId} and archived_at is null limit 1","creative_tasks where id=${taskId} and client_id=${client.id} and workspace_id=${workspaceId} and archived_at is null and deleted_at is null limit 1");
 s=s.replace("creative_tasks where workspace_id=${workspaceId} and client_id=${client.id} and archived_at is null order by","creative_tasks where workspace_id=${workspaceId} and client_id=${client.id} and archived_at is null and deleted_at is null order by");
 s=s.replace("creative_tasks t where t.id=e.task_id and t.client_id=${client.id} and t.archived_at is null)","creative_tasks t where t.id=e.task_id and t.client_id=${client.id} and t.archived_at is null and t.deleted_at is null)");
 must(s.includes("c.archived_at is null and c.deleted_at is null"),"portal campaign lifecycle patch failed");
 write(p,s);
}

// Main dashboard: lifecycle-safe operational counters as well as canonical media totals.
{
 const p="app/dashboard/page.tsx";let s=read(p);
 const anchor='  const period   = `${year}-${String(month).padStart(2,"0")}`;';
 must(s.includes(anchor),"dashboard period anchor missing");
 s=s.replace(anchor,anchor+'\n  const activeTask=sql`${creativeTasks.id} in (select id from creative_tasks where workspace_id=${workspaceId} and archived_at is null and deleted_at is null)`;\n  const activeLead=sql`${salesLeads.id} in (select id from sales_leads where workspace_id=${workspaceId} and archived_at is null and deleted_at is null)`;');
 s=s.replace('and(eq(creativeTasks.workspaceId,workspaceId),notInArray(creativeTasks.status,["COMPLETED","REJECTED"]))','and(eq(creativeTasks.workspaceId,workspaceId),notInArray(creativeTasks.status,["COMPLETED","REJECTED"]),activeTask)');
 s=s.replace('and(eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.status,"REVIEW"))','and(eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.status,"REVIEW"),activeTask)');
 s=s.replace('and(eq(creativeTasks.workspaceId,workspaceId),lt(creativeTasks.deadline,today),notInArray(creativeTasks.status,["COMPLETED","REJECTED","APPROVED"]))','and(eq(creativeTasks.workspaceId,workspaceId),lt(creativeTasks.deadline,today),notInArray(creativeTasks.status,["COMPLETED","REJECTED","APPROVED"]),activeTask)');
 s=s.replace('and(eq(salesLeads.workspaceId,workspaceId),eq(salesLeads.stage,"WON"))','and(eq(salesLeads.workspaceId,workspaceId),eq(salesLeads.stage,"WON"),activeLead)');
 s=s.replace('and(eq(salesLeads.workspaceId,workspaceId),lte(salesLeads.updatedAt,new Date(today.getTime()-5*86400000)),notInArray(salesLeads.stage,["WON","LOST"]))','and(eq(salesLeads.workspaceId,workspaceId),lte(salesLeads.updatedAt,new Date(today.getTime()-5*86400000)),notInArray(salesLeads.stage,["WON","LOST"]),activeLead)');
 must(s.includes("activeTask")&&s.includes("activeLead"),"dashboard lifecycle counters patch failed");write(p,s);
}

// Media Control V2 and VIVITO: never surface soft-deleted campaigns.
{
 const p="app/api/media-control-v2/route.ts";let s=read(p);
 s=s.replace("where archived_at is null)`","where archived_at is null and deleted_at is null)`");
 s=s.replace("where archived_at is not null)`","where archived_at is not null and deleted_at is null)`");
 must(s.includes("archived_at is null and deleted_at is null")&&s.includes("archived_at is not null and deleted_at is null"),"media control lifecycle filters failed");write(p,s);
}
one("app/api/assistant/route.ts","and ac.archived_at is null\n group by","and ac.archived_at is null and ac.deleted_at is null\n group by","Vivito campaign filter missing");

// Analytics: replace legacy media_metrics with canonical TOTAL/root campaign rows.
{
 const p="app/dashboard/analytics/page.tsx";let s=read(p);
 s=s.replace("creativeTasks,mediaMetrics,salesLeads","creativeTasks,salesLeads");
 s=s.replace("archived_at is null)`","archived_at is null and deleted_at is null)`");
 const old="db.select({spend:sum(mediaMetrics.adSpend),revenue:sum(mediaMetrics.revenue),leads:sum(mediaMetrics.leads),impressions:sum(mediaMetrics.impressions),clicks:sum(mediaMetrics.clicks)}).from(mediaMetrics).where(and(eq(mediaMetrics.workspaceId,workspaceId),gte(mediaMetrics.date,monthStart)))";
 const neu="db.execute<{spend:number|string|null;revenue:number|string|null;leads:number|string|null;impressions:number|string|null;clicks:number|string|null}>(sql`select coalesce(sum(p.spend),0) spend,coalesce(sum(p.revenue),0) revenue,coalesce(sum(p.results),0) leads,coalesce(sum(p.impressions),0) impressions,coalesce(sum(p.clicks),0) clicks from ad_performance_daily p join ad_campaigns a on a.id=p.campaign_id where a.workspace_id=${workspaceId} and a.archived_at is null and a.deleted_at is null and p.date>=${monthStart} and p.breakdown_type='TOTAL' and p.ad_set_id is null and p.ad_id is null`).then(r=>Array.from(r))";
 must(s.includes(old),"analytics legacy media query missing");s=s.replace(old,neu);write(p,s);
}

// Monthly summary: canonical source with exact month bounds.
{
 const p="app/api/monthly-summary/[clientId]/route.ts";let s=read(p);
 s=s.replace("db,clients,mediaMetrics,creativeTasks","db,clients,creativeTasks");
 const old="db.select().from(mediaMetrics).where(and(eq(mediaMetrics.workspaceId,workspaceId),eq(mediaMetrics.clientId,clientId),gte(mediaMetrics.date,monthStart),lte(mediaMetrics.date,monthEnd)))";
 const neu="db.execute<{platform:string;adSpend:number|string|null;leads:number|string|null;purchases:number|string|null;revenue:number|string|null}>(sql`select a.platform,coalesce(sum(p.spend),0) \"adSpend\",coalesce(sum(p.results),0) leads,coalesce(sum(p.purchases),0) purchases,coalesce(sum(p.revenue),0) revenue from ad_performance_daily p join ad_campaigns a on a.id=p.campaign_id where a.workspace_id=${workspaceId} and a.client_id=${clientId} and a.archived_at is null and a.deleted_at is null and p.date>=${monthStart} and p.date<=${monthEnd} and p.breakdown_type='TOTAL' and p.ad_set_id is null and p.ad_id is null group by a.platform`).then(r=>Array.from(r))";
 must(s.includes(old),"monthly summary legacy media query missing");s=s.replace(old,neu);write(p,s);
}

// PDF report: same canonical source and exact selected month.
{
 const p="app/api/pdf-report/[clientId]/route.ts";let s=read(p);
 s=s.replace("db,clients,financeRecords,mediaMetrics,contacts,workspaces","db,clients,financeRecords,contacts,workspaces,sql");
 s=s.replace("eq,and,gte,lte,sum","eq,and");
 const old="db.select({spend:sum(mediaMetrics.adSpend),leads:sum(mediaMetrics.leads),revenue:sum(mediaMetrics.revenue)}).from(mediaMetrics).where(and(eq(mediaMetrics.workspaceId,workspaceId),eq(mediaMetrics.clientId,clientId),gte(mediaMetrics.date,monthStart),lte(mediaMetrics.date,monthEnd)))";
 const neu="db.execute<{spend:number|string|null;leads:number|string|null;revenue:number|string|null}>(sql`select coalesce(sum(p.spend),0) spend,coalesce(sum(p.results),0) leads,coalesce(sum(p.revenue),0) revenue from ad_performance_daily p join ad_campaigns a on a.id=p.campaign_id where a.workspace_id=${workspaceId} and a.client_id=${clientId} and a.archived_at is null and a.deleted_at is null and p.date>=${monthStart} and p.date<=${monthEnd} and p.breakdown_type='TOTAL' and p.ad_set_id is null and p.ad_id is null`).then(r=>Array.from(r))";
 must(s.includes(old),"PDF legacy media query missing");s=s.replace(old,neu);write(p,s);
}

// Client health: weighted portfolio ROAS from canonical totals; no fabricated 2.5 fallback.
{
 const p="app/api/performance-score/route.ts";let s=read(p);
 s=s.replace("clientFeedback,mediaMetrics,users","clientFeedback,users");
 s=s.replace("eq,and,gte,lt,sum,count,avg,desc","eq,and,gte,lt,sum,count,desc");
 const old="const[roasAgg]=await db.select({avgRoas:avg(mediaMetrics.roas)}).from(mediaMetrics).where(and(eq(mediaMetrics.workspaceId,workspaceId),eq(mediaMetrics.clientId,clientId),gte(mediaMetrics.date,mo3ago)));";
 const neu="const[roasAgg]=Array.from(await db.execute<{spend:number|string|null;revenue:number|string|null}>(sql`select coalesce(sum(p.spend),0) spend,coalesce(sum(p.revenue),0) revenue from ad_performance_daily p join ad_campaigns a on a.id=p.campaign_id where a.workspace_id=${workspaceId} and a.client_id=${clientId} and a.archived_at is null and a.deleted_at is null and p.date>=${mo3ago} and p.breakdown_type='TOTAL' and p.ad_set_id is null and p.ad_id is null`));";
 must(s.includes(old),"health legacy media query missing");s=s.replace(old,neu);
 must(s.includes("roas=Number(roasAgg?.avgRoas??2.5),roasScore=Math.min(100,Math.round((roas/3)*100))"),"health ROAS fallback missing");
 s=s.replace("roas=Number(roasAgg?.avgRoas??2.5),roasScore=Math.min(100,Math.round((roas/3)*100))","mediaSpend=Number(roasAgg?.spend||0),mediaRevenue=Number(roasAgg?.revenue||0),roas=mediaSpend>0?mediaRevenue/mediaSpend:0,roasScore=mediaSpend>0?Math.min(100,Math.round((roas/3)*100)):75");write(p,s);
}

// Public metrics API: canonical source and mathematically correct aggregate ROAS.
write("app/api/v1/metrics/route.ts",`export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {db,apiKeys,sql} from "@/lib/db";
import {eq,and} from "drizzle-orm";
import crypto from "crypto";
const READ_PERMISSIONS=new Set(["read","read_write","admin"]);
async function authenticateAPIKey(req:NextRequest){const raw=req.headers.get("x-api-key")??req.headers.get("authorization")?.replace(/^Bearer\\s+/i,"");if(!raw)return null;const keyHash=crypto.createHash("sha256").update(raw).digest("hex");const [key]=await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash,keyHash),eq(apiKeys.isActive,true))).limit(1);if(!key||!READ_PERMISSIONS.has(String(key.permissions||"")))return null;await db.update(apiKeys).set({lastUsedAt:new Date()}).where(eq(apiKeys.id,key.id));return key}
type MetricRow={platform:string;adSpend:number|string|null;leads:number|string|null;revenue:number|string|null};
export async function GET(req:NextRequest){const key=await authenticateAPIKey(req);if(!key)return NextResponse.json({error:"Invalid API key"},{status:401});const now=new Date(),monthStart=new Date(now.getFullYear(),now.getMonth(),1),rows=Array.from(await db.execute<MetricRow>(sql\`select a.platform,coalesce(sum(p.spend),0) "adSpend",coalesce(sum(p.results),0) leads,coalesce(sum(p.revenue),0) revenue from ad_performance_daily p join ad_campaigns a on a.id=p.campaign_id join clients c on c.id=a.client_id where a.workspace_id=\${key.workspaceId} and c.workspace_id=\${key.workspaceId} and c.is_active=true and a.archived_at is null and a.deleted_at is null and p.date>=\${monthStart} and p.breakdown_type='TOTAL' and p.ad_set_id is null and p.ad_id is null group by a.platform\`)),data=rows.map(x=>{const adSpend=Number(x.adSpend||0),revenue=Number(x.revenue||0);return{platform:x.platform,adSpend,leads:Number(x.leads||0),revenue,roas:adSpend?revenue/adSpend:0}});return NextResponse.json({data,period:"MTD",source:"ad_performance_daily:TOTAL"},{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}})}
`);

// Monthly Reports UI and bulk send: workspace isolation + canonical campaign totals.
{
 const p="app/dashboard/monthly-reports/page.tsx";let s=read(p);
 s=s.replace('type SessionUser={role?:Role|string;id?:string};','type SessionUser={role?:Role|string;id?:string;workspaceId?:string};');
 s=s.replace('const userId=String(sessionUser.id||"");','const userId=String(sessionUser.id||""),workspaceId=String(sessionUser.workspaceId||"");if(!workspaceId)redirect("/login");');
 s=s.replace('? and(eq(clients.isActive, true), eq(clients.accountManagerId, userId))\n      : eq(clients.isActive, true))','? and(eq(clients.workspaceId,workspaceId),eq(clients.isActive, true), eq(clients.accountManagerId, userId))\n      : and(eq(clients.workspaceId,workspaceId),eq(clients.isActive, true)))');
 s=s.replace('const {db,clients,contacts,financeRecords,mediaMetrics}=await import("@/lib/db");','const {db,clients,contacts,financeRecords,sql}=await import("@/lib/db");');
 s=s.replace('const {eq,and,gte,sum}=await import("drizzle-orm");','const {eq,and}=await import("drizzle-orm");');
 s=s.replace('if(!current?.user||![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER].includes(currentRole!))throw new Error("Unauthorized");','if(!current?.user||![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER].includes(currentRole!))throw new Error("Unauthorized");const currentWorkspaceId=String(currentUser?.workspaceId||"");if(!currentWorkspaceId)throw new Error("Workspace unavailable");');
 s=s.replace('? and(eq(clients.isActive,true),eq(clients.accountManagerId,currentUserId))\n      : eq(clients.isActive,true));','? and(eq(clients.workspaceId,currentWorkspaceId),eq(clients.isActive,true),eq(clients.accountManagerId,currentUserId))\n      : and(eq(clients.workspaceId,currentWorkspaceId),eq(clients.isActive,true)));');
 s=s.replace('db.select().from(financeRecords).where(and(eq(financeRecords.clientId,c.id),eq(financeRecords.month,pMonth),eq(financeRecords.year,pYear)))','db.select().from(financeRecords).where(and(eq(financeRecords.workspaceId,currentWorkspaceId),eq(financeRecords.clientId,c.id),eq(financeRecords.month,pMonth),eq(financeRecords.year,pYear)))');
 const old='db.select({spend:sum(mediaMetrics.adSpend),leads:sum(mediaMetrics.leads),rev:sum(mediaMetrics.revenue)}).from(mediaMetrics).where(and(eq(mediaMetrics.clientId,c.id),gte(mediaMetrics.date,monthStart2)))';
 const neu='db.execute<{spend:number|string|null;leads:number|string|null;rev:number|string|null}>(sql`select coalesce(sum(p.spend),0) spend,coalesce(sum(p.results),0) leads,coalesce(sum(p.revenue),0) rev from ad_performance_daily p join ad_campaigns a on a.id=p.campaign_id where a.workspace_id=${currentWorkspaceId} and a.client_id=${c.id} and a.archived_at is null and a.deleted_at is null and p.date>=${monthStart2} and p.date<${new Date(pYear,pMonth,1)} and p.breakdown_type=\'TOTAL\' and p.ad_set_id is null and p.ad_id is null`).then(r=>Array.from(r))';
 must(s.includes(old),"monthly bulk email legacy query missing");s=s.replace(old,neu);write(p,s);
}

// Strong regression contract: no old campaign KPI source on user/report/VIVITO surfaces.
write("scripts/qa-campaign-data-consistency.mjs",`import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8"),checks=[],check=(n,o)=>checks.push({n,o:Boolean(o)});
const client=read("app/dashboard/clients/[id]/page.tsx"),portal=read("app/dashboard/portal/page.tsx"),dash=read("app/dashboard/page.tsx"),media=read("app/api/media-control-v2/route.ts"),analytics=read("app/dashboard/analytics/page.tsx"),monthly=read("app/api/monthly-summary/[clientId]/route.ts"),pdf=read("app/api/pdf-report/[clientId]/route.ts"),monthlyPage=read("app/dashboard/monthly-reports/page.tsx"),v1=read("app/api/v1/metrics/route.ts"),health=read("app/api/performance-score/route.ts"),assistant=read("app/api/assistant/route.ts");
check("Media Control canonical source",media.includes("adPerformanceDaily")&&media.includes('breakdownType,"TOTAL"')&&media.includes("isNull(adPerformanceDaily.adSetId)")&&media.includes("isNull(adPerformanceDaily.adId)"));
check("Client workspace selectable range",client.includes('name="from"')&&client.includes('name="to"')&&client.includes("p.date>=\${from}::date")&&client.includes("p.date<=\${to}::date"));
check("Client portal selectable range",portal.includes('name="from"')&&portal.includes('name="to"')&&portal.includes("p.date>=\${from}::date")&&portal.includes("p.date<=\${to}::date"));
check("Client surfaces TOTAL root rows",client.includes("p.breakdown_type='TOTAL'")&&client.includes("p.ad_set_id is null")&&client.includes("p.ad_id is null")&&portal.includes("p.breakdown_type='TOTAL'")&&portal.includes("p.ad_set_id is null")&&portal.includes("p.ad_id is null"));
check("Client surfaces exclude deleted campaigns",client.includes("a.deleted_at is null")&&portal.includes("c.deleted_at is null"));
check("Main dashboard canonical and lifecycle safe",!dash.includes("mediaMetrics")&&dash.includes("adPerformanceDaily")&&dash.includes("activeTask")&&dash.includes("activeLead")&&dash.includes("archived_at is null and deleted_at is null"));
check("Analytics canonical source",!analytics.includes("mediaMetrics")&&analytics.includes("ad_performance_daily")&&analytics.includes("breakdown_type='TOTAL'")&&analytics.includes("deleted_at is null"));
check("Monthly summary canonical source",!monthly.includes("mediaMetrics")&&monthly.includes("ad_performance_daily")&&monthly.includes("breakdown_type='TOTAL'")&&monthly.includes("deleted_at is null"));
check("PDF report canonical source",!pdf.includes("mediaMetrics")&&pdf.includes("ad_performance_daily")&&pdf.includes("breakdown_type='TOTAL'")&&pdf.includes("deleted_at is null"));
check("Bulk monthly email canonical and workspace scoped",!monthlyPage.includes("mediaMetrics")&&monthlyPage.includes("ad_performance_daily")&&monthlyPage.includes("currentWorkspaceId")&&monthlyPage.includes("clients.workspaceId"));
check("API v1 metrics canonical weighted ROAS",!v1.includes("mediaMetrics")&&v1.includes("ad_performance_daily")&&v1.includes("revenue/adSpend")&&v1.includes("breakdown_type='TOTAL'"));
check("Health score canonical no fake ROAS",!health.includes("mediaMetrics")&&health.includes("ad_performance_daily")&&!health.includes("avgRoas??2.5"));
check("VIVITO excludes deleted campaigns",assistant.includes("ac.archived_at is null and ac.deleted_at is null"));
check("Media Control excludes deleted campaigns",media.includes("archived_at is null and deleted_at is null")&&media.includes("archived_at is not null and deleted_at is null"));
const failed=checks.filter(x=>!x.o);for(const x of checks)console.log(\`${x.o?"PASS":"FAIL"}  \${x.n}\`);console.log(\`\\n\${checks.length-failed.length}/\${checks.length} campaign data consistency checks passed.\`);if(failed.length)process.exit(1);
`);
console.log("Campaign KPI consistency remediation applied.");
