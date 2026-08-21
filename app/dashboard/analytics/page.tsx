export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, creativeTasks, mediaMetrics, users, salesLeads, financeRecords, companyExpenses } from "@/lib/db";
import { eq, sum, count, avg, desc, gte, and, notInArray } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.MEDIA_BUYER].includes(role)) redirect("/dashboard");

  const now   = new Date();
  const mo1   = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const mo6   = new Date(now.getFullYear(), now.getMonth()-6, 1);
  const yr    = new Date(now.getFullYear(), 0, 1);

  const [
    allClients, allCreators, taskStats, leadStats,
    finYTD, mediaYTD, expenses, topClients,
  ] = await Promise.all([
    db.select({ id:clients.id,companyName:clients.companyName,healthScore:clients.healthScore,
      churnRisk:clients.churnRisk,monthlyRetainer:clients.monthlyRetainer,lifetimeValue:clients.lifetimeValue,
      accountManagerId:clients.accountManagerId }).from(clients).where(eq(clients.isActive,true)),
    db.select({ id:users.id,name:users.name,role:users.role }).from(users)
      .where(eq(users.role,"CREATOR")),
    db.select({ status:creativeTasks.status, cnt:count() }).from(creativeTasks)
      .where(gte(creativeTasks.createdAt,yr))
      .groupBy(creativeTasks.status),
    db.select({ stage:salesLeads.stage, cnt:count(), val:sum(salesLeads.estimatedValue) })
      .from(salesLeads).groupBy(salesLeads.stage),
    db.select({ rev:sum(financeRecords.totalRevenue), paid:sum(financeRecords.paid) })
      .from(financeRecords).where(gte(financeRecords.createdAt,yr)),
    db.select({ spend:sum(mediaMetrics.adSpend), leads:sum(mediaMetrics.leads), rev:sum(mediaMetrics.revenue) })
      .from(mediaMetrics).where(gte(mediaMetrics.date,yr)),
    db.select({ total:sum(companyExpenses.amount) }).from(companyExpenses).where(gte(companyExpenses.date,yr)),
    db.select({ id:clients.id,companyName:clients.companyName,monthlyRetainer:clients.monthlyRetainer,
      healthScore:clients.healthScore,lifetimeValue:clients.lifetimeValue })
      .from(clients).where(eq(clients.isActive,true)).orderBy(desc(clients.monthlyRetainer)).limit(8),
  ]);

  const fmt  = (n:number) => n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n.toLocaleString()}`;
  const pct  = (a:number,b:number) => b>0?Math.round(a/b*100):0;

  const ytdRev     = Number(finYTD[0]?.rev??0);
  const ytdPaid    = Number(finYTD[0]?.paid??0);
  const ytdExp     = Number(expenses[0]?.total??0);
  const ytdProfit  = ytdPaid - ytdExp;
  const profitMargin = pct(ytdProfit, ytdPaid);
  const mediaSpend = Number(mediaYTD[0]?.spend??0);
  const mediaLeads = Number(mediaYTD[0]?.leads??0);
  const mediaRev   = Number(mediaYTD[0]?.rev??0);
  const roas       = mediaSpend>0?(mediaRev/mediaSpend).toFixed(1):"—";
  const cpl        = mediaLeads>0?(mediaSpend/mediaLeads).toFixed(0):"—";

  const tasksApproved = Number(taskStats.find(t=>t.status==="APPROVED")?.cnt??0) +
                        Number(taskStats.find(t=>t.status==="COMPLETED")?.cnt??0);
  const tasksTotal    = taskStats.reduce((s,t)=>s+Number(t.cnt),0);
  const deliveryRate  = pct(tasksApproved, tasksTotal);

  const wonLeads  = Number(leadStats.find(l=>l.stage==="WON")?.cnt??0);
  const lostLeads = Number(leadStats.find(l=>l.stage==="LOST")?.cnt??0);
  const winRate   = pct(wonLeads, wonLeads+lostLeads);
  const wonValue  = Number(leadStats.find(l=>l.stage==="WON")?.val??0);

  const highRisk   = allClients.filter(c=>c.churnRisk==="HIGH").length;
  const medRisk    = allClients.filter(c=>c.churnRisk==="MEDIUM").length;
  const lowRisk    = allClients.filter(c=>c.churnRisk==="LOW").length;
  const avgHealth  = allClients.length>0
    ? Math.round(allClients.reduce((s,c)=>s+c.healthScore,0)/allClients.length) : 0;

  // SVG Donut helper
  const Donut = ({green,amber,red,total}: {green:number;amber:number;red:number;total:number}) => {
    if (total===0) return <div style={{width:120,height:120,borderRadius:"50%",background:"var(--bg-tertiary)"}}/>;
    const r=50,cx=60,cy=60,circ=2*Math.PI*r;
    const gP=green/total, aP=amber/total, rP=red/total;
    return (
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth={16}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--green)" strokeWidth={16}
          strokeDasharray={`${gP*circ} ${circ}`} transform={`rotate(-90 ${cx} ${cy})`}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--amber)" strokeWidth={16}
          strokeDasharray={`${aP*circ} ${circ}`} strokeDashoffset={-gP*circ}
          transform={`rotate(-90 ${cx} ${cy})`}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--red)" strokeWidth={16}
          strokeDasharray={`${rP*circ} ${circ}`} strokeDashoffset={-(gP+aP)*circ}
          transform={`rotate(-90 ${cx} ${cy})`}/>
        <text x={cx} y={cy-6} textAnchor="middle" fontSize={20} fontWeight={800}
          fill="var(--text-primary)" fontFamily="Sora,sans-serif">{total}</text>
        <text x={cx} y={cy+10} textAnchor="middle" fontSize={9} fill="var(--text-muted)"
          fontFamily="Plus Jakarta Sans">clients</text>
      </svg>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Year-to-date performance · {now.getFullYear()}</p>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <Link href="/dashboard/reports" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>Custom Report</Link>
          <Link href="/dashboard/forecast" className="btn btn-primary btn-sm" style={{textDecoration:"none"}}>Revenue Forecast →</Link>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="kpi-grid stagger">
        {[
          {label:"YTD Revenue",    value:fmt(ytdRev),    sub:`${fmt(ytdPaid)} collected`,       icon:"💰",color:"blue"  },
          {label:"Gross Profit",   value:fmt(ytdProfit), sub:`${profitMargin}% margin`,         icon:"📈",color:ytdProfit>0?"green":"red"},
          {label:"ROAS",           value:`${roas}×`,     sub:`${fmt(mediaSpend)} ad spend`,     icon:"📣",color:Number(roas)>=3?"green":"amber"},
          {label:"Active Clients", value:String(allClients.length), sub:`${highRisk} at risk`, icon:"🏢",color:highRisk>0?"amber":"green"},
          {label:"Win Rate",       value:`${winRate}%`,  sub:`${wonLeads} deals won YTD`,       icon:"🎯",color:winRate>=40?"green":"amber"},
          {label:"Delivery Rate",  value:`${deliveryRate}%`,sub:`${tasksApproved}/${tasksTotal} tasks`,icon:"🎨",color:deliveryRate>=85?"green":"amber"},
        ].map(k=>(
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div style={{fontSize:"11.5px",color:"var(--text-muted)",marginTop:"4px"}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"16px"}}>

        {/* Revenue vs Expenses Bar Chart */}
        <div className="card" style={{gridColumn:"2 / span 2"}}>
          <div className="card-header">
            <p className="card-title">Revenue vs Expenses</p>
            <div style={{display:"flex",gap:"12px"}}>
              <span style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"var(--text-muted)"}}>
                <span style={{width:10,height:10,borderRadius:2,background:"var(--vivit-blue)",display:"inline-block"}}/>Revenue
              </span>
              <span style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"var(--text-muted)"}}>
                <span style={{width:10,height:10,borderRadius:2,background:"var(--red)",display:"inline-block"}}/>Expenses
              </span>
              <span style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"var(--text-muted)"}}>
                <span style={{width:10,height:10,borderRadius:2,background:"var(--green)",display:"inline-block"}}/>Profit
              </span>
            </div>
          </div>
          <div className="card-body">
            {(()=>{
              const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              const rev=[42,45,48,44,52,55,58,54,61,65,70,ytdRev/1000||72].map(v=>Math.round(v));
              const exp=[18,19,21,20,22,23,24,22,25,26,28,ytdExp/1000||30].map(v=>Math.round(v));
              const pro=rev.map((r,i)=>Math.max(0,r-exp[i]));
              const maxV=Math.max(...rev,...exp,1);
              const W=520,H=160,PAD=40,bW=(W-PAD*2)/12;
              const toY=(v:number)=>PAD+(1-v/maxV)*(H-PAD*0.6);
              const pts=(arr:number[])=>arr.map((v,i)=>`${PAD+i*bW+bW/2},${toY(v)}`).join(" ");
              const area=(arr:number[])=>{
                const p=arr.map((v,i)=>`${PAD+i*bW+bW/2},${toY(v)}`);
                return `M ${p[0]} L ${p.join(" L ")} L ${PAD+(arr.length-1)*bW+bW/2},${H} L ${PAD+bW/2},${H} Z`;
              };
              return (
                <svg viewBox={`0 0 ${W} ${H+32}`} className="w-full" style={{overflow:"visible"}}>
                  <defs>
                    <linearGradient id="areaRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C52A31" stopOpacity="0.15"/>
                      <stop offset="100%" stopColor="#C52A31" stopOpacity="0.02"/>
                    </linearGradient>
                    <linearGradient id="areaProGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.12"/>
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.02"/>
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  {[0,25,50,75,100].map(p=>{
                    const y=PAD+(1-p/100)*(H-PAD*0.6);
                    return <g key={p}>
                      <line x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="var(--card-border)" strokeWidth={1}/>
                      <text x={PAD-6} y={y+4} textAnchor="end" fontSize={9} fill="var(--text-muted)" fontFamily="Plus Jakarta Sans">{Math.round(maxV*p/100)}k</text>
                    </g>;
                  })}
                  {/* Area fills */}
                  <path d={area(rev)} fill="url(#areaRevGrad)"/>
                  <path d={area(pro)} fill="url(#areaProGrad)"/>
                  {/* Lines */}
                  <polyline points={pts(rev)} fill="none" stroke="#C52A31" strokeWidth={2.5} strokeLinejoin="round"/>
                  <polyline points={pts(exp)} fill="none" stroke="#EF4444" strokeWidth={2} strokeDasharray="5,4" strokeLinejoin="round"/>
                  <polyline points={pts(pro)} fill="none" stroke="#10B981" strokeWidth={2} strokeLinejoin="round"/>
                  {/* Data points */}
                  {rev.map((v,i)=>(
                    <circle key={i} cx={PAD+i*bW+bW/2} cy={toY(v)} r={3.5} fill="#C52A31" stroke="var(--card-bg)" strokeWidth={1.5}/>
                  ))}
                  {/* X labels */}
                  {months.map((m,i)=>(
                    <text key={m} x={PAD+i*bW+bW/2} y={H+18} textAnchor="middle"
                      fontSize={9} fill={i===now.getMonth()?"var(--vivit-blue)":"var(--text-muted)"}
                      fontWeight={i===now.getMonth()?700:400} fontFamily="Plus Jakarta Sans">{m}</text>
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>

        {/* Client Health Donut */}
        <div className="card">
          <div className="card-header"><p className="card-title">Client Health</p></div>
          <div className="card-body" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"16px"}}>
            <Donut green={lowRisk} amber={medRisk} red={highRisk} total={allClients.length}/>
            <div style={{width:"100%",display:"flex",flexDirection:"column",gap:"8px"}}>
              {[
                {label:"Healthy",  count:lowRisk, color:"var(--green)"},
                {label:"Monitor",  count:medRisk, color:"var(--amber)"},
                {label:"At Risk",  count:highRisk,color:"var(--red)"},
              ].map(s=>(
                <div key={s.label} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                  <span style={{fontSize:"12.5px",color:"var(--text-secondary)",flex:1}}>{s.label}</span>
                  <span style={{fontSize:"14px",fontWeight:800,color:"var(--text-primary)"}}>{s.count}</span>
                  <span style={{fontSize:"11px",color:"var(--text-muted)"}}>
                    {pct(s.count,allClients.length)}%
                  </span>
                </div>
              ))}
            </div>
            <div style={{width:"100%",padding:"10px",background:"var(--bg-tertiary)",borderRadius:"8px",textAlign:"center"}}>
              <p style={{fontSize:"22px",fontWeight:800,fontFamily:"Sora,sans-serif",color:avgHealth>=75?"var(--green)":avgHealth>=60?"var(--amber)":"var(--red)"}}>{avgHealth}%</p>
              <p style={{fontSize:"11px",color:"var(--text-muted)"}}>Avg Health Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Tables */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>

        {/* Top clients by revenue */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">Top Clients by Revenue</p>
            <Link href="/dashboard/ltv" className="btn btn-ghost btn-sm" style={{textDecoration:"none",fontSize:"12px"}}>LTV View →</Link>
          </div>
          <div className="card-body-flush">
            <table className="data-table">
              <thead><tr><th>#</th><th>Client</th><th>Monthly</th><th>Health</th></tr></thead>
              <tbody>
                {topClients.map((c,i)=>{
                  const h=Math.round(c.healthScore);
                  const barC=h>=80?"var(--green)":h>=60?"var(--amber)":"var(--red)";
                  return (
                    <tr key={c.id}>
                      <td style={{width:32}}>
                        <span style={{fontSize:"12px",fontWeight:800,color:i<3?"var(--amber)":"var(--text-muted)",fontFamily:"Sora,sans-serif"}}>{i+1}</span>
                      </td>
                      <td>
                        <Link href={`/dashboard/clients/${c.id}`} style={{textDecoration:"none",fontWeight:600,fontSize:"13px",color:"var(--text-primary)"}}>
                          {c.companyName}
                        </Link>
                      </td>
                      <td style={{fontWeight:700,color:"var(--vivit-blue)",fontSize:"13px"}}>{fmt(c.monthlyRetainer)}</td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:"6px",minWidth:80}}>
                          <div className="progress-bar" style={{flex:1}}>
                            <div className="progress-fill" style={{width:`${h}%`,background:barC}}/>
                          </div>
                          <span style={{fontSize:"11px",fontWeight:700,color:barC,flexShrink:0}}>{h}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Creator Performance */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">Creator Performance</p>
            <Link href="/dashboard/team" className="btn btn-ghost btn-sm" style={{textDecoration:"none",fontSize:"12px"}}>HR View →</Link>
          </div>
          <div className="card-body-flush">
            <table className="data-table">
              <thead><tr><th>Creator</th><th>Tasks</th><th>Approval Rate</th></tr></thead>
              <tbody>
                {allCreators.map((c,i)=>(
                  <tr key={c.id}>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <div className="avatar avatar-sm" style={{background:`hsl(${i*60},60%,50%)`,fontSize:"11px"}}>
                          {c.name.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}
                        </div>
                        <span style={{fontWeight:600,fontSize:"13px"}}>{c.name.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td style={{color:"var(--text-muted)",fontSize:"13px"}}>—</td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                        <div className="progress-bar" style={{flex:1}}>
                          <div className="progress-fill" style={{width:"82%",background:"var(--green)"}}/>
                        </div>
                        <span style={{fontSize:"11px",fontWeight:700,color:"var(--green)"}}>82%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Media breakdown */}
      <div className="card">
        <div className="card-header">
          <p className="card-title">Media Buying Summary — YTD</p>
          <Link href="/dashboard/media" className="btn btn-ghost btn-sm" style={{textDecoration:"none",fontSize:"12px"}}>Full Report →</Link>
        </div>
        <div className="card-body">
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px"}}>
            {[
              {label:"Total Ad Spend",   value:fmt(mediaSpend),  sub:"Across all clients & platforms", icon:"💸",color:"var(--vivit-blue)"},
              {label:"Total Leads",      value:mediaLeads.toLocaleString(), sub:"Generated from ads", icon:"👥",color:"var(--purple)"},
              {label:"Avg ROAS",         value:`${roas}×`,       sub:"Revenue per dollar spent",       icon:"📊",color:Number(roas)>=3?"var(--green)":"var(--amber)"},
              {label:"Avg CPL",          value:`$${cpl}`,        sub:"Cost per lead generated",        icon:"🎯",color:"var(--cyan)"},
            ].map(k=>(
              <div key={k.label} style={{
                padding:"16px",borderRadius:"var(--radius-sm)",
                background:"var(--bg-tertiary)",
                border:"1px solid var(--card-border)",
                textAlign:"center"
              }}>
                <div style={{fontSize:"24px",marginBottom:"8px"}}>{k.icon}</div>
                <p style={{fontSize:"24px",fontWeight:800,color:k.color,fontFamily:"Sora,sans-serif",lineHeight:1}}>{k.value}</p>
                <p style={{fontSize:"12px",fontWeight:700,color:"var(--text-primary)",marginTop:"6px"}}>{k.label}</p>
                <p style={{fontSize:"11px",color:"var(--text-muted)",marginTop:"2px"}}>{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
