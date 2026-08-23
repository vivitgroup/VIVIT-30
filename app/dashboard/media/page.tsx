// @ts-nocheck -- Drizzle's generated media shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, mediaMetrics } from "@/lib/db";
import { eq, gte, and, sum, desc, avg } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

async function addMetrics(fd: FormData) {
  "use server";
  const session=await auth();
  if(!session?.user||![Role.SUPER_ADMIN,Role.MEDIA_BUYER,Role.ACCOUNT_MANAGER].includes((session.user as any).role)) throw new Error("Unauthorized");
  const { db, mediaMetrics, clients } = await import("@/lib/db");
  const { eq, and } = await import("drizzle-orm");
  const role=(session.user as any).role as Role;
  const userId=String((session.user as any).id||"");
  const clientId = String(fd.get("clientId")||"");
  const platform = String(fd.get("platform")||"");
  const allowedPlatforms=["meta","instagram","tiktok","google","snapchat","linkedin","twitter"];
  if(!clientId||!allowedPlatforms.includes(platform)) throw new Error("Invalid client or platform");
  if(role!==Role.SUPER_ADMIN){
    const [owned]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,clientId),eq(clients.isActive,true),role===Role.MEDIA_BUYER?eq(clients.mediaBuyerId,userId):eq(clients.accountManagerId,userId))).limit(1);
    if(!owned) throw new Error("Forbidden");
  }
  const adSpend=Number(fd.get("adSpend")||0),leads=Number(fd.get("leads")||0),revenue=Number(fd.get("revenue")||0),budget=Number(fd.get("budget")||0);
  if(![adSpend,leads,revenue,budget].every(Number.isFinite)||adSpend<0||leads<0||!Number.isInteger(leads)||revenue<0||budget<0) throw new Error("Metrics must be valid non-negative numbers");
  const roas     = adSpend>0 ? revenue/adSpend : 0;
  const cpl      = leads>0   ? adSpend/leads   : 0;
  const agencyFee= adSpend*0.2;
  await db.insert(mediaMetrics).values({
    clientId, platform, date:new Date(),
    adSpend, leads, revenue, roas:parseFloat(roas.toFixed(2)),
    cpl:parseFloat(cpl.toFixed(2)), agencyFee,
    remainingBudget:budget,
    targetLeads:0, totalDue:adSpend+agencyFee,
  }).onConflictDoNothing();
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/media");
}

export default async function MediaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  const userId = (session.user as any).id as string;
  if (![Role.SUPER_ADMIN,Role.MEDIA_BUYER,Role.ACCOUNT_MANAGER].includes(role)) redirect("/dashboard");

  const now     = new Date();
  const mo1     = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const moStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allClients, thisMonth, lastMonth, platformMetrics] = await Promise.all([
    db.select({id:clients.id, companyName:clients.companyName, mediaBudget:clients.mediaBudget})
      .from(clients).where(and(eq(clients.isActive,true),role===Role.MEDIA_BUYER?eq(clients.mediaBuyerId,userId):role===Role.ACCOUNT_MANAGER?eq(clients.accountManagerId,userId):eq(clients.workspaceId,"default"))),
    db.select({
      clientId:mediaMetrics.clientId, platform:mediaMetrics.platform,
      spend:sum(mediaMetrics.adSpend), leads:sum(mediaMetrics.leads),
      revenue:sum(mediaMetrics.revenue), fee:sum(mediaMetrics.agencyFee),
    }).from(mediaMetrics).where(gte(mediaMetrics.date, moStart))
      .groupBy(mediaMetrics.clientId, mediaMetrics.platform),
    db.select({
      spend:sum(mediaMetrics.adSpend), leads:sum(mediaMetrics.leads), revenue:sum(mediaMetrics.revenue),
    }).from(mediaMetrics).where(and(gte(mediaMetrics.date,mo1),
      eq(mediaMetrics.date, new Date(now.getFullYear(), now.getMonth()-1, now.getDate())))),
    db.select({
      platform:mediaMetrics.platform,
      spend:sum(mediaMetrics.adSpend), leads:sum(mediaMetrics.leads), revenue:sum(mediaMetrics.revenue),
    }).from(mediaMetrics).where(gte(mediaMetrics.date, moStart))
      .groupBy(mediaMetrics.platform),
  ]);

  const allowedClientIds=allClients.map(c=>c.id);
  const visibleThisMonth=role===Role.SUPER_ADMIN?thisMonth:thisMonth.filter(m=>allowedClientIds.includes(m.clientId));
  const platformMap=new Map<string,{platform:string,spend:number,leads:number,revenue:number}>();
  for(const m of visibleThisMonth){
    const key=String(m.platform||"meta"),cur=platformMap.get(key)||{platform:key,spend:0,leads:0,revenue:0};
    cur.spend+=Number(m.spend||0);cur.leads+=Number(m.leads||0);cur.revenue+=Number(m.revenue||0);platformMap.set(key,cur);
  }
  const visiblePlatformMetrics=Array.from(platformMap.values());

  const clientMap = Object.fromEntries(allClients.map(c=>[c.id,c]));
  const fmt = (n:number) => new Intl.NumberFormat("en-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(Number(n||0));

  const totalSpend   = visibleThisMonth.reduce((s,m)=>s+Number(m.spend),0);
  const totalLeads   = visibleThisMonth.reduce((s,m)=>s+Number(m.leads),0);
  const totalRevenue = visibleThisMonth.reduce((s,m)=>s+Number(m.revenue),0);
  const totalFee     = visibleThisMonth.reduce((s,m)=>s+Number(m.fee),0);
  const avgRoas      = totalSpend>0?(totalRevenue/totalSpend).toFixed(1):"—";
  const avgCpl       = totalLeads>0?(totalSpend/totalLeads).toFixed(0):"—";

  const PLATFORMS: Record<string,{icon:string;color:string;bg:string}> = {
    meta:      {icon:"👥",color:"#1877F2",bg:"#EEF4FF"},
    instagram: {icon:"📸",color:"#E1306C",bg:"#FFF0F5"},
    tiktok:    {icon:"🎵",color:"#010101",bg:"#F0F0F0"},
    google:    {icon:"🔍",color:"#4285F4",bg:"#EEF3FF"},
    snapchat:  {icon:"👻",color:"#FFFC00",bg:"#FFFDE0"},
    linkedin:  {icon:"💼",color:"#0A66C2",bg:"#EEF6FF"},
    twitter:   {icon:"🐦",color:"#1DA1F2",bg:"#EEF8FF"},
  };

  // Group by client for the table
  const byClient = allClients.map(c=>{
    const mets = visibleThisMonth.filter(m=>m.clientId===c.id);
    const spend   = mets.reduce((s,m)=>s+Number(m.spend),0);
    const leads   = mets.reduce((s,m)=>s+Number(m.leads),0);
    const revenue = mets.reduce((s,m)=>s+Number(m.revenue),0);
    const roas    = spend>0?revenue/spend:0;
    const cpl     = leads>0?spend/leads:0;
    const budget  = Number(c.mediaBudget)||0;
    const pacing  = budget>0?Math.round(spend/budget*100):0;
    return { ...c, spend, leads, revenue, roas, cpl, pacing };
  }).filter(c=>c.spend>0).sort((a,b)=>b.spend-a.spend);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Media Buying</h1>
          <p className="page-subtitle">
            {now.toLocaleDateString("en-US",{month:"long",year:"numeric"})} · {allClients.length} clients · MTD performance
          </p>
        </div>
        <Link href="/dashboard/budget" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>Budget Pacing →</Link>
      </div>

      {/* KPI Row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"12px"}}>
        {[
          {label:"MTD Ad Spend",  value:fmt(totalSpend),   icon:"💸",color:"blue"},
          {label:"MTD Leads",     value:totalLeads.toLocaleString(), icon:"👥",color:"purple"},
          {label:"Avg ROAS",      value:`${avgRoas}×`,     icon:"📊",color:Number(avgRoas)>=3?"green":"amber"},
          {label:"Avg CPL",       value:avgCpl==="—"?"—":`${avgCpl} EGP`,      icon:"🎯",color:"cyan"},
          {label:"Agency Fee",    value:fmt(totalFee),     icon:"💼",color:"green"},
        ].map(k=>(
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize:"1.4rem"}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Platform Breakdown */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">Platform Performance — MTD</p>
        </div>
        <div className="card-body">
          {visiblePlatformMetrics.length===0 ? (
            <p style={{textAlign:"center",color:"var(--text-muted)",padding:"24px"}}>No media data this month. Log metrics below.</p>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"12px"}}>
              {visiblePlatformMetrics.map(p=>{
                const cfg = PLATFORMS[p.platform??"meta"]??PLATFORMS.meta;
                const spend   = Number(p.spend);
                const leads   = Number(p.leads);
                const revenue = Number(p.revenue);
                const roas    = spend>0?(revenue/spend).toFixed(1):"—";
                const cpl     = leads>0?(spend/leads).toFixed(0):"—";
                return (
                  <div key={p.platform} style={{
                    padding:"16px",borderRadius:"var(--radius-sm)",
                    background:cfg.bg,border:`1px solid ${cfg.color}22`
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
                      <span style={{fontSize:"20px"}}>{cfg.icon}</span>
                      <span style={{fontSize:"13px",fontWeight:700,color:cfg.color,textTransform:"capitalize"}}>{p.platform}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                      {[
                        {label:"Spend",  value:fmt(spend)},
                        {label:"Leads",  value:String(leads)},
                        {label:"ROAS",   value:`${roas}×`},
                        {label:"CPL",    value:cpl==="—"?"—":`${cpl} EGP`},
                      ].map(m=>(
                        <div key={m.label}>
                          <p style={{fontSize:"10px",color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{m.label}</p>
                          <p style={{fontSize:"15px",fontWeight:800,color:"var(--text-primary)",fontFamily:"Sora,sans-serif"}}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Client Performance Table */}
      {byClient.length>0&&(
        <div className="card">
          <div className="card-header">
            <p className="card-title">Client Breakdown — MTD</p>
          </div>
          <div className="card-body-flush">
            <table className="data-table">
              <thead><tr>
                <th>Client</th><th>Ad Spend</th><th>Leads</th><th>Revenue</th>
                <th>ROAS</th><th>CPL</th><th>Budget Pacing</th>
              </tr></thead>
              <tbody>
                {byClient.map(c=>{
                  const roasColor = c.roas>=3?"var(--green)":c.roas>=1.5?"var(--amber)":"var(--red)";
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/dashboard/clients/${c.id}`} style={{textDecoration:"none",fontWeight:700,fontSize:"13.5px",color:"var(--text-primary)"}}>
                          {c.companyName}
                        </Link>
                      </td>
                      <td style={{fontWeight:700}}>{fmt(c.spend)}</td>
                      <td style={{color:"var(--purple)",fontWeight:700}}>{c.leads.toLocaleString()}</td>
                      <td style={{color:"var(--green)",fontWeight:700}}>{fmt(c.revenue)}</td>
                      <td>
                        <span style={{
                          fontSize:"13px",fontWeight:800,fontFamily:"Sora,sans-serif",color:roasColor,
                          padding:"3px 10px",borderRadius:"12px",background:roasColor+"15"
                        }}>{c.roas.toFixed(1)}×</span>
                      </td>
                      <td style={{color:"var(--text-secondary)",fontWeight:600}}>{c.cpl.toFixed(0)} EGP</td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:"100px"}}>
                          <div className="progress-bar" style={{flex:1}}>
                            <div className="progress-fill" style={{
                              width:`${Math.min(c.pacing,100)}%`,
                              background:c.pacing>=100?"var(--red)":c.pacing>=80?"var(--amber)":"var(--green)"
                            }}/>
                          </div>
                          <span style={{fontSize:"11px",fontWeight:700,color:c.pacing>=100?"var(--red)":c.pacing>=80?"var(--amber)":"var(--green)",flexShrink:0}}>
                            {c.pacing}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Metrics Form */}
      <div className="card" style={{borderTop:"3px solid var(--vivit-blue)"}}>
        <div className="card-header">
          <p className="card-title">📊 Log Campaign Metrics</p>
        </div>
        <div className="card-body">
          <form action={addMetrics}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"12px"}}>
              <div>
                <label className="form-label">Client *</label>
                <select name="clientId" required className="form-select">
                  <option value="">Select client...</option>
                  {allClients.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Platform *</label>
                <select name="platform" required className="form-select">
                  {Object.entries(PLATFORMS).map(([k,v])=><option key={k} value={k}>{v.icon} {k.charAt(0).toUpperCase()+k.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Monthly Budget (EGP)</label>
                <input name="budget" type="number" min="0" placeholder="10,000" className="form-input"/>
              </div>
              <div>
                <label className="form-label">Ad Spend (EGP) *</label>
                <input name="adSpend" type="number" min="0" step="0.01" required placeholder="5,000" className="form-input"/>
              </div>
              <div>
                <label className="form-label">Leads Generated</label>
                <input name="leads" type="number" min="0" step="1" placeholder="250" className="form-input"/>
              </div>
              <div>
                <label className="form-label">Revenue Attributed (EGP)</label>
                <input name="revenue" type="number" min="0" step="0.01" placeholder="15,000" className="form-input"/>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Log Metrics →</button>
          </form>
        </div>
      </div>
    </div>
  );
}
