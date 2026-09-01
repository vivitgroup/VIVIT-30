import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8"),write=(p,s)=>fs.writeFileSync(p,s),must=(ok,msg)=>{if(!ok)throw new Error(msg)},replace=(s,a,b,msg)=>{must(s.includes(a),msg);return s.replace(a,b)};

{
 const p="app/dashboard/clients/[id]/page.tsx";let s=read(p);
 s=s.replace(/const metric=\(x:CampaignRow\):CampaignMetric=>\{.*?\};\nfunction SocialIcon/s,`const metric=(x:CampaignRow,start:string,end:string):CampaignMetric=>{let r:Record<string,unknown>={};try{const parsed:unknown=typeof x.reported_metrics==="string"?JSON.parse(x.reported_metrics):{};r=asRecord(parsed)}catch{}const same=String(x.reported_period_start||"").slice(0,10)===start&&String(x.reported_period_end||"").slice(0,10)===end;return same&&Object.keys(r).length?{spend:numeric(r.spend),results:numeric(r.results),atc:numeric(r.addToCart),purchases:numeric(r.purchases),impressions:numeric(r.impressions),clicks:numeric(r.clicks),revenue:numeric(r.revenue)}:{spend:n(x.spend),results:n(x.results),atc:n(x.atc),purchases:n(x.purchases),impressions:n(x.impressions),clicks:n(x.clicks),revenue:n(x.revenue)}};\nfunction SocialIcon`);
 must(s.includes("const metric=(x:CampaignRow,start:string,end:string)"),"client metric patch failed");
 s=replace(s,'export default async function ClientWorkspace({params}:{params:Promise<{id:string}>}){','export default async function ClientWorkspace({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{from?:string;to?:string}>}){',"client signature missing");
 s=replace(s,'const role=String(s.user.role||""),uid=String(s.user.id||""),{id}=await params;if(![','const role=String(s.user.role||""),uid=String(s.user.id||""),{id}=await params,q=await searchParams,iso=(d:Date)=>d.toISOString().slice(0,10),dateOk=(v:string)=>/^\\d{4}-\\d{2}-\\d{2}$/.test(v)&&!Number.isNaN(new Date(v+"T00:00:00Z").getTime()),today=iso(new Date()),defaultFrom=iso(new Date(Date.now()-30*86400000)),to=dateOk(String(q.to||""))?String(q.to):today,from=dateOk(String(q.from||""))?String(q.from):defaultFrom,rangeDays=(new Date(to+"T00:00:00Z").getTime()-new Date(from+"T00:00:00Z").getTime())/86400000,rangeValid=rangeDays>=0&&rangeDays<=366;if(!rangeValid)redirect(`/dashboard/clients/${id}?from=${defaultFrom}&to=${today}`);if(![',"client range insertion missing");
 s=replace(s,"p.date>=date_trunc('month',now()) and p.breakdown_type='TOTAL'","p.date>=${from}::date and p.date<=${to}::date and p.breakdown_type='TOTAL'","client fixed range query missing");
 s=replace(s,'campaigns=campaignRows.map(x=>({...x,...metric(x)}))','campaigns=campaignRows.map(x=>({...x,...metric(x,from,to)}))',"client campaign map missing");
 s=s.replace('Media spend MTD','Media spend');
 s=replace(s,'<span>MEDIA · META REPORTED</span><h2>Active campaigns</h2></div><Link href="/dashboard/media/control-center">Media Control →</Link>','<span>MEDIA · CANONICAL RANGE</span><h2>Active campaigns</h2></div><form method="get" style={{display:"flex",gap:6,alignItems:"end",flexWrap:"wrap"}}><label className="form-label">FROM<input className="form-input" type="date" name="from" defaultValue={from}/></label><label className="form-label">TO<input className="form-input" type="date" name="to" defaultValue={to}/></label><button className="btn btn-secondary btn-sm" type="submit">Apply</button><Link href={`/dashboard/media/control-center?from=${from}&to=${to}`}>Media Control →</Link></form>',"client campaign header missing");
 write(p,s);
}

{
 const p="app/dashboard/portal/page.tsx";let s=read(p);
 s=replace(s,'export default async function PortalPage(){','export default async function PortalPage({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){',"portal signature missing");
 const old='const now=new Date(),monthStart=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}-01`,today=now.toISOString().slice(0,10);';
 const neu='const now=new Date(),q=await searchParams,iso=(d:Date)=>d.toISOString().slice(0,10),dateOk=(v:string)=>/^\\d{4}-\\d{2}-\\d{2}$/.test(v)&&!Number.isNaN(new Date(v+"T00:00:00Z").getTime()),today=iso(now),defaultFrom=iso(new Date(Date.now()-30*86400000)),to=dateOk(String(q.to||""))?String(q.to):today,from=dateOk(String(q.from||""))?String(q.from):defaultFrom,rangeDays=(new Date(to+"T00:00:00Z").getTime()-new Date(from+"T00:00:00Z").getTime())/86400000;if(rangeDays<0||rangeDays>366)redirect(`/dashboard/portal?from=${defaultFrom}&to=${today}`);';
 s=replace(s,old,neu,"portal fixed range missing");
 s=replace(s,'p.date>=${monthStart}::date and p.date<=${today}::date','p.date>=${from}::date and p.date<=${to}::date',"portal campaign range query missing");
 s=s.replace('Ad Spend MTD','Ad Spend');
 s=replace(s,'<span className="badge badge-blue">MTD</span><small>{lastSync?`Meta sync ${fmtDate(lastSync)}`:"Waiting for first sync"}</small>','<form method="get" style={{display:"flex",gap:6,alignItems:"end",flexWrap:"wrap"}}><label><small>From</small><input className="form-input" type="date" name="from" defaultValue={from}/></label><label><small>To</small><input className="form-input" type="date" name="to" defaultValue={to}/></label><button className="btn btn-secondary btn-sm" type="submit">Apply</button></form><span className="badge badge-blue">{from} → {to}</span><small>{lastSync?`Meta sync ${fmtDate(lastSync)}`:"Waiting for first sync"}</small>',"portal range header missing");
 write(p,s);
}

{
 const p="app/dashboard/page.tsx";let s=read(p);
 s=replace(s,'  mediaMetrics, companyExpenses, notifications,','  adPerformanceDaily, adCampaigns, companyExpenses, notifications,',"dashboard media import missing");
 s=replace(s,'import { eq, and, gte, lte, sum, count, desc, notInArray, lt } from "drizzle-orm";','import { eq, and, gte, lte, sum, count, desc, notInArray, lt, isNull, sql } from "drizzle-orm";',"dashboard drizzle import missing");
 const old='db.select({ spend:sum(mediaMetrics.adSpend), leads:sum(mediaMetrics.leads), revenue:sum(mediaMetrics.revenue) })\n      .from(mediaMetrics).where(and(eq(mediaMetrics.workspaceId,workspaceId),gte(mediaMetrics.date,moStart))),';
 const neu='db.select({spend:sum(adPerformanceDaily.spend),leads:sum(adPerformanceDaily.results),revenue:sum(adPerformanceDaily.revenue)})\n      .from(adPerformanceDaily).innerJoin(adCampaigns,eq(adPerformanceDaily.campaignId,adCampaigns.id)).innerJoin(clients,eq(adCampaigns.clientId,clients.id)).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),gte(adPerformanceDaily.date,moStart),eq(adPerformanceDaily.breakdownType,"TOTAL"),isNull(adPerformanceDaily.adSetId),isNull(adPerformanceDaily.adId),sql`${adCampaigns.id} in (select id from ad_campaigns where archived_at is null and deleted_at is null)`)),';
 s=replace(s,old,neu,"dashboard legacy media query missing");
 write(p,s);
}

{
 const p="package.json";let s=read(p);if(!s.includes('"qa:campaign-data-consistency"')){s=s.replace('"qa:tasks-archive": "node scripts/qa-tasks-archive.mjs",','"qa:tasks-archive": "node scripts/qa-tasks-archive.mjs",\n    "qa:campaign-data-consistency": "node scripts/qa-campaign-data-consistency.mjs",');s=s.replace('npm run qa:tasks-archive && npm run qa:lifecycle-coverage','npm run qa:tasks-archive && npm run qa:campaign-data-consistency && npm run qa:lifecycle-coverage');write(p,s)}
}
console.log("Campaign data consistency remediation v2 applied.");
