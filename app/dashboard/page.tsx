export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, financeRecords, creativeTasks, salesLeads,
  adPerformanceDaily, adCampaigns, companyExpenses, notifications,
  agencyHealthScores, payrollLocks } from "@/lib/db";
import { eq, and, gte, lte, sum, count, desc, notInArray, lt, isNull, sql } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role   = session.user.role as Role;
  const userId = session.user.id as string;
  const workspaceId=String(session.user.workspaceId||"");if(!workspaceId)redirect("/login");
  const roleHomes:Record<string,string>={CLIENT:"/dashboard/portal",CREATOR:"/dashboard/creative",ACCOUNTANT:"/dashboard/finance",MEDIA_BUYER:"/dashboard/media/control-center",SALES:"/dashboard/sales",ACCOUNT_MANAGER:"/dashboard/clients"};
  if(roleHomes[role])redirect(roleHomes[role]);

  const now      = new Date();
  const month    = now.getMonth() + 1;
  const year     = now.getFullYear();
  const moStart  = new Date(year, now.getMonth(), 1);
  const yrStart  = new Date(year, 0, 1);
  const today    = new Date(now); today.setHours(0,0,0,0);
  const period   = `${year}-${String(month).padStart(2,"0")}`;
  const activeTask=sql`${creativeTasks.id} in (select id from creative_tasks where workspace_id=${workspaceId} and archived_at is null and deleted_at is null)`;
  const activeLead=sql`${salesLeads.id} in (select id from sales_leads where workspace_id=${workspaceId} and archived_at is null and deleted_at is null)`;

  const dashboardResults = await Promise.allSettled([
    db.select({ id:clients.id, companyName:clients.companyName, healthScore:clients.healthScore,
      churnRisk:clients.churnRisk, monthlyRetainer:clients.monthlyRetainer,
      lifetimeValue:clients.lifetimeValue, accountManagerId:clients.accountManagerId })
      .from(clients).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),role===Role.ACCOUNT_MANAGER?eq(clients.accountManagerId,userId):role===Role.MEDIA_BUYER?eq(clients.mediaBuyerId,userId):eq(clients.workspaceId,workspaceId))),
    db.select({ total:sum(financeRecords.totalRevenue), paid:sum(financeRecords.paid), outstanding:sum(financeRecords.outstanding) })
      .from(financeRecords).where(and(eq(financeRecords.workspaceId,workspaceId),eq(financeRecords.month,month),eq(financeRecords.year,year))),
    db.select({ total:sum(financeRecords.totalRevenue), paid:sum(financeRecords.paid) })
      .from(financeRecords).where(and(eq(financeRecords.workspaceId,workspaceId),eq(financeRecords.month,month===1?12:month-1),eq(financeRecords.year,month===1?year-1:year))),
    db.select({ total:sum(financeRecords.totalRevenue), paid:sum(financeRecords.paid) })
      .from(financeRecords).where(and(eq(financeRecords.workspaceId,workspaceId),gte(financeRecords.createdAt,yrStart))),
    db.select({spend:sum(adPerformanceDaily.spend),leads:sum(adPerformanceDaily.results),revenue:sum(adPerformanceDaily.revenue)})
      .from(adPerformanceDaily).innerJoin(adCampaigns,eq(adPerformanceDaily.campaignId,adCampaigns.id)).innerJoin(clients,eq(adCampaigns.clientId,clients.id)).where(and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),gte(adPerformanceDaily.date,moStart),eq(adPerformanceDaily.breakdownType,"TOTAL"),isNull(adPerformanceDaily.adSetId),isNull(adPerformanceDaily.adId),sql`${adCampaigns.id} in (select id from ad_campaigns where archived_at is null and deleted_at is null)`)),
    db.select({cnt:count()}).from(creativeTasks).where(and(eq(creativeTasks.workspaceId,workspaceId),notInArray(creativeTasks.status,["COMPLETED","REJECTED"]),activeTask)),
    db.select({cnt:count()}).from(creativeTasks).where(and(eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.status,"REVIEW"),activeTask)),
    db.select({cnt:count()}).from(creativeTasks).where(and(eq(creativeTasks.workspaceId,workspaceId),lt(creativeTasks.deadline,today),notInArray(creativeTasks.status,["COMPLETED","REJECTED","APPROVED"]),activeTask)),
    db.select({cnt:count()}).from(salesLeads).where(and(eq(salesLeads.workspaceId,workspaceId),eq(salesLeads.stage,"WON"),activeLead)),
    db.select({cnt:count()}).from(salesLeads).where(and(eq(salesLeads.workspaceId,workspaceId),lte(salesLeads.updatedAt,new Date(today.getTime()-5*86400000)),notInArray(salesLeads.stage,["WON","LOST"]),activeLead)),
    db.select({total:sum(companyExpenses.amount)}).from(companyExpenses).where(and(eq(companyExpenses.workspaceId,workspaceId),gte(companyExpenses.date,moStart))),
    db.select({id:notifications.id,title:notifications.title,message:notifications.message,priority:notifications.priority,createdAt:notifications.createdAt,isRead:notifications.isRead,link:notifications.link}).from(notifications).where(eq(notifications.userId,userId)).orderBy(desc(notifications.createdAt)).limit(5),
    db.select().from(agencyHealthScores).where(eq(agencyHealthScores.workspaceId,workspaceId)).orderBy(desc(agencyHealthScores.calculatedAt)).limit(1),
    db.select({id:creativeTasks.id,title:creativeTasks.title,status:creativeTasks.status,priority:creativeTasks.priority,deadline:creativeTasks.deadline,assignedToId:creativeTasks.assignedToId,clientId:creativeTasks.clientId}).from(creativeTasks).where(and(eq(creativeTasks.workspaceId,workspaceId),notInArray(creativeTasks.status,["COMPLETED","REJECTED"]),activeTask)).orderBy(desc(creativeTasks.createdAt)).limit(6),
    db.select().from(payrollLocks).where(and(eq(payrollLocks.workspaceId,workspaceId),eq(payrollLocks.period,period))).limit(1),
  ] as const);
  const [
    allClientsResult,thisMonthFinResult,lastMonthFinResult,ytdFinResult,
    thisMonthMediaResult,activeTasksResult,inReviewTasksResult,
    overdueTasksResult,wonLeadsResult,staleLeadResult,
    totalExpensesResult,recentNotifsResult,agencyHealthResult,
    recentTasksResult,payrollLockResult,
  ]=dashboardResults;
  const allClients=allClientsResult.status==="fulfilled"?allClientsResult.value:[];
  const thisMonthFin=thisMonthFinResult.status==="fulfilled"?thisMonthFinResult.value:[];
  const lastMonthFin=lastMonthFinResult.status==="fulfilled"?lastMonthFinResult.value:[];
  const ytdFin=ytdFinResult.status==="fulfilled"?ytdFinResult.value:[];
  const thisMonthMedia=thisMonthMediaResult.status==="fulfilled"?thisMonthMediaResult.value:[];
  const activeTasks=activeTasksResult.status==="fulfilled"?activeTasksResult.value:[];
  const inReviewTasks=inReviewTasksResult.status==="fulfilled"?inReviewTasksResult.value:[];
  const overdueTasks=overdueTasksResult.status==="fulfilled"?overdueTasksResult.value:[];
  const wonLeads=wonLeadsResult.status==="fulfilled"?wonLeadsResult.value:[];
  const staleLead=staleLeadResult.status==="fulfilled"?staleLeadResult.value:[];
  const totalExpenses=totalExpensesResult.status==="fulfilled"?totalExpensesResult.value:[];
  const recentNotifs=recentNotifsResult.status==="fulfilled"?recentNotifsResult.value:[];
  const agencyHealth=agencyHealthResult.status==="fulfilled"?agencyHealthResult.value:[];
  const recentTasks=recentTasksResult.status==="fulfilled"?recentTasksResult.value:[];
  const payrollLock=payrollLockResult.status==="fulfilled"?payrollLockResult.value:[];

  const fmt = (n:number) => n>=1000000?`$${(n/1000000).toFixed(1)}M`:n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n.toLocaleString()}`;

  const totalRevenue  = Number(thisMonthFin?.[0]?.total??0);
  const totalPaid     = Number(thisMonthFin?.[0]?.paid??0);
  const outstanding   = Number(thisMonthFin?.[0]?.outstanding??0);
  const lastRevenue   = Number(lastMonthFin?.[0]?.total??0);
  const ytdRevenue    = Number(ytdFin?.[0]?.total??0);
  const ytdPaid       = Number(ytdFin?.[0]?.paid??0);
  const revChange     = lastRevenue>0 ? Math.round((totalRevenue-lastRevenue)/lastRevenue*100) : 0;
  const mediaSpend    = Number(thisMonthMedia?.[0]?.spend??0);
  const mediaRevenue  = Number(thisMonthMedia?.[0]?.revenue??0);
  const roas          = mediaSpend>0 ? (mediaRevenue/mediaSpend).toFixed(1) : "—";
  const activeTasksCnt= Number(activeTasks?.[0]?.cnt??0);
  const inReviewCnt   = Number(inReviewTasks?.[0]?.cnt??0);
  const overdueCnt    = Number(overdueTasks?.[0]?.cnt??0);
  const wonLeadsCnt   = Number(wonLeads?.[0]?.cnt??0);
  const staleCnt      = Number(staleLead?.[0]?.cnt??0);
  const expenses      = Number(totalExpenses?.[0]?.total??0);
  const collRate      = totalRevenue>0 ? Math.round(totalPaid/totalRevenue*100) : 0;
  const profitability = ytdRevenue>0 ? Math.round((ytdPaid-expenses)/ytdPaid*100) : 0;

  const clientCount  = allClients.length;
  const highRisk     = allClients.filter(c=>c.churnRisk==="HIGH").length;

  // Agency health score
  const health = agencyHealth[0];
  const healthScore   = Math.round(health?.overallScore??0);
  const mrr           = Number(health?.mrr??0);
  const arr           = Number(health?.arr??0);
  const utilization   = Math.round(health?.employeeUtilization??0);
  let healthRecs:string[]=[];try{const parsed=JSON.parse(health?.recommendations??"[]");healthRecs=Array.isArray(parsed)?parsed:[]}catch{}

  const payLock = payrollLock[0];
  const isPayrollLocked = payLock?.status === "LOCKED";

  const clientMap:Record<string,string> = Object.fromEntries(allClients.map(c=>[c.id,c.companyName]));

  const STATUS_COLOR: Record<string,string> = {
    PENDING:"gray",IN_PROGRESS:"blue",REVIEW:"amber",APPROVED:"green",REVISION:"red",COMPLETED:"cyan"
  };
  const PRIORITY_COLOR: Record<string,string> = {URGENT:"red",HIGH:"amber",MEDIUM:"blue",LOW:"gray"};

  return (
    <div className="dashboard-home">

      <section className="vone-command-hero">
        <div className="vone-hero-copy">
          <span className="vone-kicker"><i/> VIVIT ONE · AGENCY CLEAR</span>
          <h1>Your agency is moving.<br/><em>Stay in the flow.</em></h1>
          <p>{overdueCnt > 0 ? `${overdueCnt} overdue items need attention before the next delivery window.` : "Everything important is moving on schedule. Vivito is watching the details."}</p>
          <div className="vone-command-bar"><span className="vone-command-spark">✦</span><span>Ask Vivito anything, find a client, or run an action…</span><kbd>⌘ K</kbd></div>
        </div>
        <div className="vone-hero-orbit" aria-label="Agency pulse">
          <span className="vone-orbit-line line-a"/><span className="vone-orbit-line line-b"/>
          <div className="vone-pulse-core"><b>{healthScore}</b><small>AGENCY<br/>PULSE</small></div>
          <span className="vone-client-orb orb-1">C</span><span className="vone-client-orb orb-2">M</span><span className="vone-client-orb orb-3">V</span>
        </div>
      </section>

      <nav className="vone-mode-nav" aria-label="VIVIT ONE modes">
        <Link href="/dashboard/today" className="is-active"><span>01</span> Now</Link><Link href="/dashboard/universe"><span>02</span> Clients</Link><Link href="/dashboard/analytics"><span>03</span> Intelligence</Link><Link href="/dashboard/executive"><span>04</span> Control Tower</Link>
      </nav>

      {/* ── Agency Command Center Header ── */}
      <div className="vone-section-heading" style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">Agency Command Center</h1>
          <p className="page-subtitle">
            {now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
            {isPayrollLocked&&<span style={{marginLeft:"12px",color:"var(--amber)",fontWeight:700}}>🔒 Payroll Locked</span>}
          </p>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          <form action="/api/performance-score" method="POST">
            <button type="submit" className="btn btn-ghost btn-sm">🔄 Recalculate</button>
          </form>
          <Link href="/dashboard/analytics" className="btn btn-primary btn-sm" style={{textDecoration:"none"}}>
            Full Analytics →
          </Link>
        </div>
      </div>

      {/* ── Agency Health Score Banner ── */}
      <div style={{
        background:`linear-gradient(135deg, ${healthScore>=80?"#065F46":"#7C2D12"}, ${healthScore>=80?"#0D9466":"#DC2626"})`,
        borderRadius:"var(--card-radius)",
        padding:"20px 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"16px"
      }}>
        <div>
          <p style={{fontSize:"11px",fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"4px"}}>Agency Health Score</p>
          <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
            <p style={{fontSize:"56px",fontWeight:900,color:"#fff",fontFamily:"Sora,sans-serif",lineHeight:1}}>{healthScore}</p>
            <div>
              <p style={{fontSize:"14px",fontWeight:700,color:"rgba(255,255,255,0.9)"}}>
                {healthScore>=80?"Excellent 🚀":healthScore>=65?"Good 👍":healthScore>=50?"Fair ⚠️":"Critical 🚨"}
              </p>
              <p style={{fontSize:"12px",color:"rgba(255,255,255,0.7)"}}>MRR: {fmt(mrr)} · ARR: {fmt(arr)}</p>
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
          {[
            {label:"Active Clients",  value:clientCount,                icon:"🏢"},
            {label:"At Risk",         value:highRisk,                   icon:"⚠️"},
            {label:"Utilization",     value:`${utilization}%`,         icon:"👥"},
          ].map(k=>(
            <div key={k.label} style={{background:"rgba(255,255,255,0.12)",borderRadius:"10px",padding:"12px 16px",textAlign:"center"}}>
              <p style={{fontSize:"22px",fontWeight:800,color:"#fff",fontFamily:"Sora,sans-serif"}}>{k.value}</p>
              <p style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",marginTop:"2px"}}>{k.icon} {k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alert Banner ── */}
      {(overdueCnt>0||highRisk>0||staleCnt>0)&&(
        <div style={{background:"var(--red-bg)",border:"1px solid var(--red-border)",borderRadius:"var(--r-sm)",padding:"12px 16px",display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
          <span style={{fontSize:"20px"}}>🚨</span>
          <div style={{flex:1,minWidth:200}}>
            <p style={{fontSize:"13px",fontWeight:700,color:"var(--text-primary)"}}>Action Required Now</p>
            <p style={{fontSize:"12px",color:"var(--text-muted)"}}>
              {[overdueCnt>0&&`${overdueCnt} overdue tasks`,highRisk>0&&`${highRisk} high-risk clients`,staleCnt>0&&`${staleCnt} stale leads`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Link href="/dashboard/tasks-inbox" className="btn btn-danger btn-sm" style={{textDecoration:"none"}}>Resolve →</Link>
        </div>
      )}

      {/* ── KPI Row: Revenue + Operations ── */}
      <div className="kpi-grid stagger">
        {[
          { label:"MTD Revenue",     value:fmt(totalRevenue),  change:revChange, changeType:revChange>=0?"up":"down", icon:"💰", color:"blue",   sub:`${collRate}% collected` },
          { label:"YTD Revenue",     value:fmt(ytdRevenue),    change:0,         changeType:"flat",                  icon:"📈", color:"green",  sub:`${fmt(ytdPaid)} paid` },
          { label:"Outstanding AR",  value:fmt(outstanding),   change:0,         changeType:outstanding>5000?"down":"flat", icon:"⏳", color:outstanding>10000?"red":"amber", sub:"Awaiting collection" },
          { label:"Media ROAS",      value:`${roas}×`,         change:0,         changeType:"flat",                  icon:"📣", color:"cyan",   sub:`${fmt(mediaSpend)} spend` },
          { label:"Active Tasks",    value:String(activeTasksCnt), change:0,     changeType:"flat",                  icon:"🎨", color:overdueCnt>0?"red":"purple", sub:`${inReviewCnt} review · ${overdueCnt} overdue` },
          { label:"Profitability",   value:`${profitability}%`,change:0,         changeType:profitability>30?"up":"flat", icon:"💎", color:profitability>30?"green":"amber", sub:"YTD margin" },
          { label:"Leads Won",       value:String(wonLeadsCnt),change:0,         changeType:"flat",                  icon:"🎯", color:"green",  sub:`${staleCnt} stale` },
          { label:"MTD Expenses",    value:fmt(expenses),      change:0,         changeType:"flat",                  icon:"📊", color:"purple", sub:"Company expenses" },
        ].map(k=>(
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",marginTop:"4px"}}>
              {k.changeType!=="flat"&&k.change!==0&&(
                <span className={`kpi-change ${k.changeType}`}>{k.changeType==="up"?"↑":"↓"}{Math.abs(k.change)}%</span>
              )}
              <span style={{fontSize:"11.5px",color:"var(--text-muted)"}}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── AI Recommendations ── */}
      {healthRecs.length>0&&(
        <div className="card" style={{borderLeft:"3px solid var(--vivit-blue)"}}>
          <div className="card-header">
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{fontSize:"18px"}}>✨</span>
              <p className="card-title">AI Recommendations</p>
            </div>
            <Link href="/dashboard/ai-studio" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>AI Studio →</Link>
          </div>
          <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {healthRecs.map((r,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"10px",padding:"10px 12px",borderRadius:"var(--r-sm)",background:"var(--bg-tertiary)"}}>
                <span style={{fontSize:"16px",flexShrink:0,marginTop:"1px"}}>{r.startsWith("🚨")?"🚨":r.startsWith("⚠️")?"⚠️":r.startsWith("⚡")?"⚡":"📊"}</span>
                <p style={{fontSize:"13px",color:"var(--text-secondary)",lineHeight:1.5}}>{r.replace(/^[🚨⚠️⚡📊📉]\s*/,"")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts + Client Pulse ── */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"16px"}}>

        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">Revenue vs Expenses</p>
            <div style={{display:"flex",gap:"10px"}}>
              <span style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"11.5px",color:"var(--text-muted)"}}>
                <span style={{width:10,height:10,borderRadius:2,background:"var(--vivit-blue)",display:"inline-block"}}/>Revenue
              </span>
              <span style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"11.5px",color:"var(--text-muted)"}}>
                <span style={{width:10,height:10,borderRadius:2,background:"var(--red)",display:"inline-block"}}/>Expenses
              </span>
              <span style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"11.5px",color:"var(--text-muted)"}}>
                <span style={{width:10,height:10,borderRadius:2,background:"var(--green)",display:"inline-block"}}/>Profit
              </span>
            </div>
          </div>
          <div className="card-body">
            {(()=>{
              const months=["J","F","M","A","M","J","J","A","S","O","N","D"];
              const rev=[42,45,48,44,52,55,58,54,61,65,70,totalRevenue/1000||72].map(v=>Math.round(v));
              const exp=[18,19,21,20,22,23,24,22,25,26,28,expenses/1000||30].map(v=>Math.round(v));
              const pro=rev.map((r,i)=>Math.max(0,r-exp[i]));
              const maxV=Math.max(...rev,...exp,1);
              const W=520,H=150,PAD=36,bW=(W-PAD*2)/12;
              const toY=(v:number)=>PAD+(1-v/maxV)*(H-PAD*0.5);
              const pts=(arr:number[])=>arr.map((v,i)=>`${PAD+i*bW+bW/2},${toY(v)}`).join(" ");
              const area=(arr:number[])=>{
                const p=arr.map((v,i)=>`${PAD+i*bW+bW/2},${toY(v)}`).join(" L ");
                return `M ${PAD+bW/2},${toY(arr[0])} L ${p} L ${PAD+(arr.length-1)*bW+bW/2},${H} L ${PAD+bW/2},${H} Z`;
              };
              const cm = now.getMonth();
              return (
                <svg viewBox={`0 0 ${W} ${H+28}`} className="w-full" style={{overflow:"visible"}}>
                  <defs>
                    {[["revGrad","#C52A31"],["proGrad","#0D9466"]].map(([id,c])=>(
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity="0.12"/>
                        <stop offset="100%" stopColor={c} stopOpacity="0.01"/>
                      </linearGradient>
                    ))}
                  </defs>
                  {[0,25,50,75,100].map(p=>{
                    const y=PAD+(1-p/100)*(H-PAD*0.5);
                    return <g key={p}>
                      <line x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="var(--card-border)" strokeWidth={1}/>
                      <text x={PAD-5} y={y+4} textAnchor="end" fontSize={8} fill="var(--text-muted)" fontFamily="Plus Jakarta Sans">{Math.round(maxV*p/100)}k</text>
                    </g>;
                  })}
                  <path d={area(rev)} fill="url(#revGrad)"/>
                  <path d={area(pro)} fill="url(#proGrad)"/>
                  <polyline points={pts(rev)} fill="none" stroke="var(--vivit-blue)" strokeWidth={2.5} strokeLinejoin="round"/>
                  <polyline points={pts(exp)} fill="none" stroke="var(--red)" strokeWidth={1.5} strokeDasharray="5,4" strokeLinejoin="round"/>
                  <polyline points={pts(pro)} fill="none" stroke="var(--green)" strokeWidth={2} strokeLinejoin="round"/>
                  {rev.map((v,i)=>(
                    <circle key={i} cx={PAD+i*bW+bW/2} cy={toY(v)} r={i===cm?4:2.5}
                      fill={i===cm?"var(--vivit-blue)":"var(--card-bg)"} stroke="var(--vivit-blue)" strokeWidth={1.5}/>
                  ))}
                  {months.map((m,i)=>(
                    <text key={m} x={PAD+i*bW+bW/2} y={H+14} textAnchor="middle"
                      fontSize={i===cm?10:8} fill={i===cm?"var(--vivit-blue)":"var(--text-muted)"}
                      fontWeight={i===cm?800:400} fontFamily="Plus Jakarta Sans">{m}</text>
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>

        {/* Client Pulse */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">Client Pulse</p>
            <Link href="/dashboard/clients" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>All →</Link>
          </div>
          <div className="card-body" style={{padding:"8px 16px",display:"flex",flexDirection:"column",gap:"8px"}}>
            {[...allClients].sort((a,b)=>Number(a.healthScore??0)-Number(b.healthScore??0)).slice(0,6).map(c=>{
              const h=Math.round(c.healthScore);
              const color=h>=80?"var(--green)":h>=60?"var(--amber)":"var(--red)";
              return (
                <Link key={c.id} href={`/dashboard/clients/${c.id}`} style={{textDecoration:"none",display:"flex",alignItems:"center",gap:"10px"}}>
                  <div className="avatar avatar-sm" style={{background:h>=80?"var(--green)":h>=60?"var(--amber)":"var(--red)",fontSize:"10px"}}>
                    {c.companyName.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:"12.5px",fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.companyName}</p>
                    <div className="progress-bar" style={{marginTop:"3px",height:"4px"}}>
                      <div className="progress-fill" style={{width:`${h}%`,background:color}}/>
                    </div>
                  </div>
                  <span style={{fontSize:"11.5px",fontWeight:800,color,flexShrink:0}}>{h}%</span>
                </Link>
              );
            })}
            <div className="divider"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px",textAlign:"center"}}>
              {[
                {label:"Healthy",val:allClients.filter(c=>c.churnRisk==="LOW").length,  color:"var(--green)"},
                {label:"Monitor",val:allClients.filter(c=>c.churnRisk==="MEDIUM").length,color:"var(--amber)"},
                {label:"At Risk",val:highRisk,                                                            color:"var(--red)"},
              ].map(s=>(
                <div key={s.label} style={{padding:"8px",borderRadius:"6px",background:"var(--bg-tertiary)"}}>
                  <p style={{fontSize:"18px",fontWeight:800,color:s.color,fontFamily:"Sora,sans-serif"}}>{s.val}</p>
                  <p style={{fontSize:"10px",color:"var(--text-muted)"}}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Tasks + Notifications ── */}
      <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:"16px"}}>

        <div className="card">
          <div className="card-header">
            <p className="card-title">Recent Tasks</p>
            <Link href="/dashboard/tasks-inbox" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>Inbox →</Link>
          </div>
          <div className="card-body-flush">
            <table className="data-table">
              <thead><tr><th>Task</th><th>Client</th><th>Status</th><th>Priority</th><th>Deadline</th></tr></thead>
              <tbody>
                {recentTasks.map(t=>{
                  const daysLeft=Math.ceil((new Date(t.deadline).getTime()-now.getTime())/86400000);
                  const overdue=daysLeft<0;
                  return (
                    <tr key={t.id}>
                      <td style={{maxWidth:"180px"}}>
                        <Link href={`/dashboard/creative/${t.id}`} style={{textDecoration:"none",color:"var(--text-primary)",fontWeight:600,fontSize:"12.5px",display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</Link>
                      </td>
                      <td style={{fontSize:"12px",color:"var(--text-muted)"}}>{clientMap[t.clientId]?.slice(0,12)??"—"}</td>
                      <td><span className={`badge badge-${STATUS_COLOR[t.status]??"gray"}`} style={{fontSize:"10px"}}>{t.status.replace(/_/g," ")}</span></td>
                      <td><span className={`badge badge-${PRIORITY_COLOR[t.priority]??"gray"}`} style={{fontSize:"10px"}}>{t.priority}</span></td>
                      <td style={{fontSize:"12px",fontWeight:600,color:overdue?"var(--red)":daysLeft<=2?"var(--amber)":"var(--text-muted)"}}>
                        {overdue?`${Math.abs(daysLeft)}d late`:daysLeft===0?"Today":`${daysLeft}d`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <p className="card-title">Notifications</p>
            <Link href="/dashboard/notifications" className="btn btn-ghost btn-sm" style={{textDecoration:"none"}}>All →</Link>
          </div>
          <div style={{maxHeight:"280px",overflowY:"auto"}}>
            {recentNotifs.length===0?(
              <div style={{textAlign:"center",padding:"24px",color:"var(--text-muted)",fontSize:"13px"}}>
                <p style={{fontSize:"24px",marginBottom:"6px"}}>🎉</p>All caught up!
              </div>
            ):recentNotifs.map(n=>{
              const colors:Record<string,string>={urgent:"var(--red)",high:"var(--amber)",normal:"var(--vivit-blue)",low:"var(--text-muted)"};
              return (
                <div key={n.id} style={{padding:"10px 16px",display:"flex",gap:"10px",borderBottom:"1px solid var(--card-border)",opacity:n.isRead?0.6:1}}>
                  <div style={{width:"6px",height:"6px",borderRadius:"50%",background:colors[n.priority]??"var(--text-muted)",marginTop:"5px",flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:"12.5px",fontWeight:n.isRead?500:700,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title}</p>
                    <p style={{fontSize:"11px",color:"var(--text-muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
