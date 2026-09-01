import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8"),write=(p,s)=>fs.writeFileSync(p,s),must=(ok,msg)=>{if(!ok)throw new Error(msg)},replace=(s,a,b,msg)=>{must(s.includes(a),msg);return s.replace(a,b)};

// Client workspace: same date-range semantics and same canonical TOTAL rows as Media Control.
{
 const p="app/dashboard/clients/[id]/page.tsx";let s=read(p);
 s=s.replace(/const metric=\(x:CampaignRow\):CampaignMetric=>\{.*?\};\nfunction SocialIcon/s,`const metric=(x:CampaignRow,start:string,end:string):CampaignMetric=>{let r:Record<string,unknown>={};try{const parsed:unknown=typeof x.reported_metrics==="string"?JSON.parse(x.reported_metrics):{};r=asRecord(parsed)}catch{}const same=String(x.reported_period_start||"").slice(0,10)===start&&String(x.reported_period_end||"").slice(0,10)===end;return same&&Object.keys(r).length?{spend:numeric(r.spend),results:numeric(r.results),atc:numeric(r.addToCart),purchases:numeric(r.purchases),impressions:numeric(r.impressions),clicks:numeric(r.clicks),revenue:numeric(r.revenue)}:{spend:n(x.spend),results:n(x.results),atc:n(x.atc),purchases:n(x.purchases),impressions:n(x.impressions),clicks:n(x.clicks),revenue:n(x.revenue)}};\nfunction SocialIcon`);
 must(s.includes("const metric=(x:CampaignRow,start:string,end:string)"),"client metric patch failed");
 s=replace(s,'export default async function ClientWorkspace({params}:{params:Promise<{id:string}>}){','export default async function ClientWorkspace({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{from?:string;to?:string}>}){',"client signature missing");
 s=replace(s,'const role=String(s.user.role||""),uid=String(s.user.id||""),{id}=await params;if(![','const role=String(s.user.role||""),uid=String(s.user.id||""),{id}=await params,q=await searchParams,iso=(d:Date)=>d.toISOString().slice(0,10),dateOk=(v:string)=>/^\\d{4}-\\d{2}-\\d{2}$/.test(v)&&!Number.isNaN(new Date(v+"T00:00:00Z").getTime()),today=iso(new Date()),defaultFrom=iso(new Date(Date.now()-30*86400000)),to=dateOk(String(q.to||""))?String(q.to):today,from=dateOk(String(q.from||""))?String(q.from):defaultFrom,rangeDays=(new Date(to+"T00:00:00Z").getTime()-new Date(from+"T00:00:00Z").getTime())/86400000,rangeValid=rangeDays>=0&&rangeDays<=366;if(!rangeValid)redirect(`/dashboard/clients/${id}?from=${defaultFrom}&to=${today}`);if(![',"client range insertion missing");
 s=replace(s,"p.date>=date_trunc('month',now()) and p.breakdown_type='TOTAL'","p.date>=${from}::date and p.date<=${to}::date and p.breakdown_type='TOTAL'","client fixed MTD query missing");
 s=replace(s,'campaigns=campaignRows.map(x=>({...x,...metric(x)}))','campaigns=campaignRows.map(x=>({...x,...metric(x,from,to)}))',"client campaign map missing");
 s=s.replace('Media spend MTD','Media spend');
 s=replace(s,'<span>MEDIA · META REPORTED</span><h2>Active campaigns</h2></div><Link href="/dashboard/media/control-center">Media Control →</Link>','<span>MEDIA · CANONICAL RANGE</span><h2>Active campaigns</h2></div><form method="get" style={{display:"flex",gap:6,alignItems:"end",flexWrap:"wrap"}}><label className="form-label">FROM<input className="form-input" type="date" name="from" defaultValue={from}/></label><label className="form-label">TO<input className="form-input" type="date" name="to" defaultValue={to}/></label><button className="btn btn-secondary btn-sm" type="submit">Apply</button><Link href={`/dashboard/media/control-center?from=${from}&to=${to}`}>Media Control →</Link></form>',"client campaign header missing");
 write(p,s);
}

// Client portal: selectable date range using the same canonical daily TOTAL rows.
{
 const p="app/dashboard/portal/page.tsx";let s=read(p);
 s=replace(s,'export default async function PortalPage(){','export default async function PortalPage({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){',"portal signature missing");
 const old='const now=new Date(),monthStart=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-01`,today=now.toISOString().slice(0,10);';
 const neu='const now=new Date(),q=await searchParams,iso=(d:Date)=>d.toISOString().slice(0,10),dateOk=(v:string)=>/^\\d{4}-\\d{2}-\\d{2}$/.test(v)&&!Number.isNaN(new Date(v+"T00:00:00Z").getTime()),today=iso(now),defaultFrom=iso(new Date(Date.now()-30*86400000)),to=dateOk(String(q.to||""))?String(q.to):today,from=dateOk(String(q.from||""))?String(q.from):defaultFrom,rangeDays=(new Date(to+"T00:00:00Z").getTime()-new Date(from+"T00:00:00Z").getTime())/86400000;if(rangeDays<0||rangeDays>366)redirect(`/dashboard/portal?from=${defaultFrom}&to=${today}`);';
 s=replace(s,old,neu,"portal fixed MTD range missing");
 s=replace(s,'p.date>=${monthStart}::date and p.date<=${today}::date','p.date>=${from}::date and p.date<=${to}::date',"portal campaign range query missing");
 s=s.replace('Ad Spend MTD','Ad Spend');
 s=replace(s,'<span className="badge badge-blue">MTD</span><small>{lastSync?`Meta sync ${fmtDate(lastSync)}`:"Waiting for first sync"}</small>','<form method="get" style={{display:"flex",gap:6,alignItems:"end",flexWrap:"wrap"}}><label><small>From</small><input className="form-input" type="date" name="from" defaultValue={from}/></label><label><small>To</small><input className="form-input" type="date" name="to" defaultValue={to}/></label><button className="btn btn-secondary btn-sm" type="submit">Apply</button></form><span className="badge badge-blue">{from} → {to}</span><small>{lastSync?`Meta sync ${fmtDate(lastSync)}`:"Waiting for first sync"}</small>',"portal MTD badge missing");
 write(p,s);
}

// Main dashboard: remove legacy media_metrics source and use canonical campaign TOTAL rows.
{
 const p="app/dashboard/page.tsx";let s=read(p);
 s=replace(s,'  mediaMetrics, companyExpenses, notifications,','  adPerformanceDaily, adCampaigns, companyExpenses, notifications,',"dashboard mediaMetrics import missing");
 s=replace(s,'import { eq, and, gte, lte, sum, count, desc, notInArray, lt } from "drizzle-orm";','import { eq, and, gte, lte, sum, count, desc, notInArray, lt, isNull } from "drizzle-orm";',"dashboard drizzle import missing");
 const old='db.select({ spend:sum(mediaMetrics.adSpend), leads:sum(mediaMetrics.leads), revenue:sum(mediaMetrics.revenue) })\n      .from(mediaMetrics).where(and(eq(mediaMetrics.workspaceId,workspaceId),gte(mediaMetrics.date,moStart))),';
 const neu='db.select({spend:sum(adPerformanceDaily.spend),leads:sum(adPerformanceDaily.results),revenue:sum(adPerformanceDaily.revenue)})\n      .from(adPerformanceDaily).innerJoin(adCampaigns,eq(adPerformanceDaily.campaignId,adCampaigns.id)).innerJoin(clients,eq(adCampaigns.clientId,clients.id)).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),gte(adPerformanceDaily.date,moStart),eq(adPerformanceDaily.breakdownType,"TOTAL"),isNull(adPerformanceDaily.adSetId),isNull(adPerformanceDaily.adId),sqlCampaignActive())),'.replace('sqlCampaignActive()','eq(adCampaigns.archivedAt,null)');
 // archivedAt nullable equality differs by driver; use SQL-compatible isNull.
 const finalNeu=neu.replace('eq(adCampaigns.archivedAt,null)','isNull(adCampaigns.archivedAt)');
 s=replace(s,old,finalNeu,"dashboard legacy media query missing");
 write(p,s);
}

// Regression contract + build gate.
{
 const qa=`import fs from "node:fs";\nconst read=p=>fs.readFileSync(p,"utf8"),checks=[],check=(n,o)=>checks.push({n,o:Boolean(o)});\nconst client=read("app/dashboard/clients/[id]/page.tsx"),portal=read("app/dashboard/portal/page.tsx"),dash=read("app/dashboard/page.tsx"),media=read("app/api/media-control-v2/route.ts");\ncheck("Media Control canonical source",media.includes("adPerformanceDaily")&&media.includes('breakdownType,\"TOTAL\"')&&media.includes("isNull(adPerformanceDaily.adSetId)")&&media.includes("isNull(adPerformanceDaily.adId)"));\ncheck("Client workspace has selectable from/to",client.includes("searchParams")&&client.includes('name=\"from\"')&&client.includes('name=\"to\"'));\ncheck("Client workspace uses selected range",client.includes("p.date>=\\${from}::date")&&client.includes("p.date<=\\${to}::date"));\ncheck("Client workspace reported override requires exact same range",client.includes("reported_period_start")&&client.includes("===start")&&client.includes("===end"));\ncheck("Client workspace carries range to Media Control",client.includes("media/control-center?from=\\${from}&to=\\${to}"));\ncheck("Client portal has selectable from/to",portal.includes("searchParams")&&portal.includes('name=\"from\"')&&portal.includes('name=\"to\"'));\ncheck("Client portal uses selected range",portal.includes("p.date>=\\${from}::date")&&portal.includes("p.date<=\\${to}::date"));\ncheck("Main dashboard no longer uses legacy mediaMetrics",!dash.includes("mediaMetrics")&&dash.includes("adPerformanceDaily")&&dash.includes("adCampaigns"));\ncheck("Main dashboard uses TOTAL top-level rows",dash.includes('eq(adPerformanceDaily.breakdownType,\"TOTAL\")')&&dash.includes("isNull(adPerformanceDaily.adSetId)")&&dash.includes("isNull(adPerformanceDaily.adId)"));\nconst failed=checks.filter(x=>!x.o);for(const x of checks)console.log(\`${'${x.o?"PASS":"FAIL"}  ${x.n}'}\`);console.log(\`\\n${'${checks.length-failed.length}/${checks.length}'} campaign data consistency checks passed.\`);if(failed.length)process.exit(1);\n`;
 write("scripts/qa-campaign-data-consistency.mjs",qa);
 const p="package.json";let s=read(p);if(!s.includes('"qa:campaign-data-consistency"')){s=s.replace('"qa:tasks-archive": "node scripts/qa-tasks-archive.mjs",','"qa:tasks-archive": "node scripts/qa-tasks-archive.mjs",\n    "qa:campaign-data-consistency": "node scripts/qa-campaign-data-consistency.mjs",');s=s.replace('npm run qa:tasks-archive && npm run qa:lifecycle-coverage','npm run qa:tasks-archive && npm run qa:campaign-data-consistency && npm run qa:lifecycle-coverage');write(p,s)}
}
console.log("Campaign data consistency remediation applied.");
