export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, mediaMetrics } from "@/lib/db";
import { eq, gte, and, sum, desc, inArray } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

export default async function BudgetPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role as Role;
  if (![Role.SUPER_ADMIN,Role.MEDIA_BUYER,Role.ACCOUNT_MANAGER].includes(role)) redirect("/dashboard");

  const now     = new Date();
  const moStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysElapsed  = now.getDate();
  const daysRemaining = daysInMonth - daysElapsed;

  const userId=String(session.user.id||"");
  const clientScope=role===Role.ACCOUNT_MANAGER
    ? and(eq(clients.isActive,true),eq(clients.accountManagerId,userId))
    : role===Role.MEDIA_BUYER
      ? and(eq(clients.isActive,true),eq(clients.mediaBuyerId,userId))
      : eq(clients.isActive,true);
  const allClients=await db.select({id:clients.id,companyName:clients.companyName,mediaBudget:clients.mediaBudget,targetLeads:clients.targetLeads})
    .from(clients).where(clientScope);
  const clientIds=allClients.map(c=>c.id);
  const mtdMetrics=clientIds.length?await db.select({clientId:mediaMetrics.clientId,spend:sum(mediaMetrics.adSpend),leads:sum(mediaMetrics.leads)})
    .from(mediaMetrics).where(and(gte(mediaMetrics.date,moStart),inArray(mediaMetrics.clientId,clientIds)))
    .groupBy(mediaMetrics.clientId):[];

  const metricMap = Object.fromEntries(mtdMetrics.map(m=>[m.clientId,m]));
  const fmt = (n:number) => new Intl.NumberFormat("en-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(Number(n||0));
  const month = now.toLocaleDateString("en-US",{month:"long",year:"numeric"});

  const budgetData = allClients.map(c=>{
    const m       = metricMap[c.id];
    const spent   = Number(m?.spend??0);
    const budget  = Number(c.mediaBudget??0);
    const pacing  = budget>0 ? Math.round(spent/budget*100) : 0;
    const dailyAvg  = daysElapsed>0 ? spent/daysElapsed : 0;
    const projected = dailyAvg * daysInMonth;
    const daysLeft  = budget>0 && dailyAvg>0 ? Math.round((budget-spent)/dailyAvg) : daysRemaining;
    const leads     = Number(m?.leads??0);
    const targetL   = Number(c.targetLeads??0);
    const leadPct   = targetL>0 ? Math.round(leads/targetL*100) : 0;
    return { ...c, spent, budget, pacing, dailyAvg, projected, daysLeft, leads, leadPct };
  }).filter(c=>c.budget>0).sort((a,b)=>b.pacing-a.pacing);

  const totalBudget  = budgetData.reduce((s,c)=>s+c.budget,0);
  const totalSpent   = budgetData.reduce((s,c)=>s+c.spent,0);
  const overBudget   = budgetData.filter(c=>c.pacing>=100).length;
  const nearBudget   = budgetData.filter(c=>c.pacing>=80&&c.pacing<100).length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Budget Pacing</h1>
          <p className="page-subtitle">{month} · Day {daysElapsed} of {daysInMonth} · {daysRemaining} days remaining</p>
        </div>
        <Link href="/dashboard/media" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>Media Details →</Link>
      </div>

      {/* Overall gauge */}
      <div className="card" style={{background:"var(--vivit-gradient)",border:"none"}}>
        <div className="card-body" style={{padding:"24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"20px",textAlign:"center"}}>
            {[
              {label:"Total Budget",  value:fmt(totalBudget), sub:"Monthly allocation"},
              {label:"Total Spent",   value:fmt(totalSpent),  sub:`${Math.round(totalSpent/totalBudget*100)||0}% of budget`},
              {label:"Remaining",     value:fmt(totalBudget-totalSpent), sub:`${daysRemaining} days left`},
              {label:"At Risk",       value:`${overBudget+nearBudget}`, sub:`${overBudget} over · ${nearBudget} near limit`},
            ].map(k=>(
              <div key={k.label}>
                <p style={{fontSize:"26px",fontWeight:900,color:"#fff",fontFamily:"Sora,sans-serif",lineHeight:1}}>{k.value}</p>
                <p style={{fontSize:"12px",fontWeight:700,color:"rgba(255,255,255,0.85)",marginTop:"4px"}}>{k.label}</p>
                <p style={{fontSize:"11px",color:"rgba(255,255,255,0.6)",marginTop:"1px"}}>{k.sub}</p>
              </div>
            ))}
          </div>
          {/* Overall progress */}
          <div style={{marginTop:"20px"}}>
            <div style={{height:"8px",background:"rgba(255,255,255,0.15)",borderRadius:"999px",overflow:"hidden"}}>
              <div style={{height:"100%",background:"rgba(255,255,255,0.9)",borderRadius:"999px",width:`${Math.min(Math.round(totalSpent/totalBudget*100)||0,100)}%`,transition:"width 0.8s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px"}}>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,0.7)"}}>0%</span>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,0.7)"}}>Ideal: {Math.round(daysElapsed/daysInMonth*100)}%</span>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,0.7)"}}>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Client Budget Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:"14px"}}>
        {budgetData.map(c=>{
          const status = c.pacing>=100?"over":c.pacing>=80?"near":"ok";
          const barColor = status==="over"?"var(--red)":status==="near"?"var(--amber)":"var(--green)";
          const daysTillEmpty = c.dailyAvg>0&&c.budget>c.spent ? Math.round((c.budget-c.spent)/c.dailyAvg) : null;
          return (
            <div key={c.id} className="card" style={{borderTop:`3px solid ${barColor}`}}>
              <div className="card-header" style={{padding:"14px 16px"}}>
                <div>
                  <Link href={`/dashboard/clients/${c.id}`} style={{textDecoration:"none",fontWeight:700,fontSize:"14px",color:"var(--text-primary)"}}>
                    {c.companyName}
                  </Link>
                  <p style={{fontSize:"11.5px",color:"var(--text-muted)",marginTop:"1px"}}>{fmt(c.budget)} monthly budget</p>
                </div>
                <span className={`badge ${status==="over"?"badge-red":status==="near"?"badge-amber":"badge-green"}`} style={{fontSize:"11px"}}>
                  {status==="over"?"🔴 Over":status==="near"?"🟡 Near":"🟢 OK"}
                </span>
              </div>
              <div className="card-body" style={{padding:"14px 16px"}}>
                {/* Spend progress */}
                <div style={{marginBottom:"14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                    <span style={{fontSize:"12px",fontWeight:600,color:"var(--text-secondary)"}}>Ad Spend</span>
                    <span style={{fontSize:"13px",fontWeight:800,color:barColor,fontFamily:"Sora,sans-serif"}}>{c.pacing}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width:`${Math.min(c.pacing,100)}%`,background:barColor}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:"5px"}}>
                    <span style={{fontSize:"11px",color:"var(--text-muted)"}}>{fmt(c.spent)} spent</span>
                    <span style={{fontSize:"11px",color:"var(--text-muted)"}}>{fmt(c.budget-c.spent)} left</span>
                  </div>
                </div>
                {/* Leads progress */}
                {c.targetLeads>0&&(
                  <div style={{marginBottom:"14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                      <span style={{fontSize:"12px",fontWeight:600,color:"var(--text-secondary)"}}>Lead Target</span>
                      <span style={{fontSize:"12px",fontWeight:700,color:c.leadPct>=100?"var(--green)":c.leadPct>=70?"var(--amber)":"var(--red)"}}>{c.leads}/{c.targetLeads}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width:`${Math.min(c.leadPct,100)}%`,background:c.leadPct>=100?"var(--green)":c.leadPct>=70?"var(--amber)":"var(--red)"}}/>
                    </div>
                  </div>
                )}
                {/* Stats row */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                  <div style={{padding:"8px 10px",borderRadius:"var(--r-sm)",background:"var(--bg-tertiary)"}}>
                    <p style={{fontSize:"10.5px",color:"var(--text-muted)",fontWeight:600}}>Daily Avg</p>
                    <p style={{fontSize:"14px",fontWeight:800,color:"var(--text-primary)",fontFamily:"Sora,sans-serif"}}>{fmt(c.dailyAvg)}</p>
                  </div>
                  <div style={{padding:"8px 10px",borderRadius:"var(--r-sm)",background:"var(--bg-tertiary)"}}>
                    <p style={{fontSize:"10.5px",color:"var(--text-muted)",fontWeight:600}}>{c.pacing<100?"Days left":"Status"}</p>
                    <p style={{fontSize:"14px",fontWeight:800,color:c.pacing>=100?"var(--red)":"var(--text-primary)",fontFamily:"Sora,sans-serif"}}>
                      {c.pacing>=100?"Over budget":daysTillEmpty!=null?`${daysTillEmpty}d`:"—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {budgetData.length===0&&(
        <div className="card"><div className="empty-state">
          <p className="empty-state-icon">📊</p>
          <p className="empty-state-title">No budget data</p>
          <p className="empty-state-desc">Log media metrics to see budget pacing for your clients.</p>
          <Link href="/dashboard/media" className="btn btn-primary btn-sm" style={{textDecoration:"none",marginTop:"8px"}}>Log Metrics →</Link>
        </div></div>
      )}
    </div>
  );
}
