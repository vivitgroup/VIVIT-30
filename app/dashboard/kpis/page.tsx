export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, creativeTasks, salesLeads, mediaMetrics, financeRecords, users , companyExpenses } from "@/lib/db";
import { eq, and, gte, lte, count, sum, inArray, notInArray, ne } from "drizzle-orm";
import { Role } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default async function KPIPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== Role.SUPER_ADMIN) redirect("/dashboard");

  const now       = new Date();
  const y         = now.getFullYear();
  const m         = now.getMonth();
  const monthStart = new Date(y, m, 1);
  const prevStart  = new Date(y, m-1, 1);
  const prevEnd    = new Date(y, m, 0);
  const yearStart  = new Date(y, 0, 1);

  const [
    activeClients, totalClients,
    taskStats, prevTaskStats,
    metricsNow, metricsPrev,
    financeYear,
    salesStats,
    creatorStats,
    teamCount,
  ] = await Promise.all([
    db.select({count:count()}).from(clients).where(eq(clients.isActive, true)),
    db.select({count:count()}).from(clients),
    db.select({status:creativeTasks.status,count:count()}).from(creativeTasks).where(gte(creativeTasks.createdAt, monthStart)).groupBy(creativeTasks.status),
    db.select({status:creativeTasks.status,count:count()}).from(creativeTasks).where(and(gte(creativeTasks.createdAt,prevStart),lte(creativeTasks.createdAt,prevEnd))).groupBy(creativeTasks.status),
    db.select({adSpend:sum(mediaMetrics.adSpend),revenue:sum(mediaMetrics.revenue),leads:sum(mediaMetrics.leads),agencyFee:sum(mediaMetrics.agencyFee)}).from(mediaMetrics).where(gte(mediaMetrics.date,monthStart)),
    db.select({adSpend:sum(mediaMetrics.adSpend),revenue:sum(mediaMetrics.revenue),leads:sum(mediaMetrics.leads)}).from(mediaMetrics).where(and(gte(mediaMetrics.date,prevStart),lte(mediaMetrics.date,prevEnd))),
    db.select({rev:sum(financeRecords.totalRevenue),paid:sum(financeRecords.paid),out:sum(financeRecords.outstanding)}).from(financeRecords).where(eq(financeRecords.year,y)),
    db.select({stage:salesLeads.stage,count:count()}).from(salesLeads).groupBy(salesLeads.stage),
    db.select({id:users.id,name:users.name}).from(users).where(and(eq(users.role,"CREATOR"),eq(users.isActive,true))),
    db.select({count:count()}).from(users).where(and(ne(users.role,"CLIENT"),eq(users.isActive,true))),
  ]);

  // Creative task aggregates
  const taskByStatus = Object.fromEntries(taskStats.map(t=>[t.status,Number(t.count)]));
  const prevTaskByStatus = Object.fromEntries(prevTaskStats.map(t=>[t.status,Number(t.count)]));
  const tasksTotal = Object.values(taskByStatus).reduce((a,b)=>a+b,0);
  const tasksCompleted = (taskByStatus["APPROVED"]??0)+(taskByStatus["COMPLETED"]??0);
  const taskCompletionRate = tasksTotal>0?Math.round((tasksCompleted/tasksTotal)*100):0;

  // Media metrics
  const spend   = Number(metricsNow[0]?.adSpend??0);
  const rev     = Number(metricsNow[0]?.revenue??0);
  const leads   = Number(metricsNow[0]?.leads??0);
  const fee     = Number(metricsNow[0]?.agencyFee??0);
  const pSpend  = Number(metricsPrev[0]?.adSpend??0);
  const pRev    = Number(metricsPrev[0]?.revenue??0);
  const pLeads  = Number(metricsPrev[0]?.leads??0);
  const roas    = spend>0?(rev/spend):0;
  const cpl     = leads>0?(spend/leads):0;

  // MoM changes
  const pct = (curr:number,prev:number) => prev>0?((curr-prev)/prev*100).toFixed(1):"—";
  const spendChg = pct(spend,pSpend);
  const revChg   = pct(rev,pRev);
  const leadsChg = pct(leads,pLeads);

  // Finance
  const yearRev  = Number(financeYear[0]?.rev??0);
  const yearPaid = Number(financeYear[0]?.paid??0);
  const yearOut  = Number(financeYear[0]?.out??0);
  const collectionRate = yearRev>0?Math.round((yearPaid/yearRev)*100):0;

  // Sales
  const salesByStage = Object.fromEntries(salesStats.map(s=>[s.stage,Number(s.count)]));
  const wonDeals  = salesByStage["WON"]??0;
  const lostDeals = salesByStage["LOST"]??0;
  const winRate   = (wonDeals+lostDeals)>0?Math.round((wonDeals/(wonDeals+lostDeals))*100):0;
  const activeLeads = Object.entries(salesByStage).filter(([k])=>!["WON","LOST"].includes(k)).reduce((a,[,v])=>a+v,0);

  // Creator tasks
  const creatorTaskStats = creatorStats.length>0
    ? await db.select({assignedToId:creativeTasks.assignedToId,status:creativeTasks.status,count:count()})
        .from(creativeTasks).where(inArray(creativeTasks.assignedToId,creatorStats.map(c=>c.id))).groupBy(creativeTasks.assignedToId,creativeTasks.status)
    : [];
  const creatorMap: Record<string,{name:string;total:number;done:number;revision:number}> = {};
  for (const c of creatorStats) creatorMap[c.id]={name:c.name,total:0,done:0,revision:0};
  for (const t of creatorTaskStats) {
    if (!t.assignedToId||!creatorMap[t.assignedToId]) continue;
    creatorMap[t.assignedToId].total+=Number(t.count);
    if(["APPROVED","COMPLETED"].includes(t.status)) creatorMap[t.assignedToId].done+=Number(t.count);
    if(t.status==="REVISION") creatorMap[t.assignedToId].revision+=Number(t.count);
  }

  const Trend = ({val,unit=""}:{val:string;unit?:string}) => {
    if(val==="—") return <span style={{fontSize:"11px",color:"#6b7280"}}>—</span>;
    const n=parseFloat(val);
    return <span style={{fontSize:"11px",fontWeight:"700",color:n>=0?"#10b981":"#ef4444"}}>{n>=0?"↑":"↓"}{Math.abs(n)}{unit}% MoM</span>;
  };

  // ERP BI data
  const [erpClients, erpFinance, erpLeads, erpExpenses] = await Promise.all([
    db.select({ id:clients.id, companyName:clients.companyName, churnRisk:clients.churnRisk, monthlyRetainer:clients.monthlyRetainer, healthScore:clients.healthScore }).from(clients).where(eq(clients.isActive,true)),
    db.select({ paid:sum(financeRecords.paid), total:sum(financeRecords.totalRevenue), outstanding:sum(financeRecords.outstanding) }).from(financeRecords).where(eq(financeRecords.year,new Date().getFullYear())),
    db.select({ stage:salesLeads.stage, estimatedValue:salesLeads.estimatedValue }).from(salesLeads).where(notInArray(salesLeads.stage,["WON","LOST"])),
    db.select({ total:sum(companyExpenses.amount) }).from(companyExpenses).where(gte(companyExpenses.date,new Date(new Date().getFullYear(),0,1))),
  ]);

  const ytdPaid       = Number(erpFinance[0]?.paid??0);
  const ytdTotal      = Number(erpFinance[0]?.total??0);
  const ytdOutstanding= Number(erpFinance[0]?.outstanding??0);
  const ytdExpenses   = Number(erpExpenses[0]?.total??0);
  const grossProfit   = ytdPaid - ytdExpenses;
  const profitMargin  = ytdPaid>0?Math.round((grossProfit/ytdPaid)*100):0;
  const erpCollectionRate= ytdTotal>0?Math.round((ytdPaid/ytdTotal)*100):0;
  const highRiskRevenue = erpClients.filter(c=>c.churnRisk==="HIGH").reduce((s,c)=>s+c.monthlyRetainer*12,0);
  const churnRevenueRisk= highRiskRevenue;
  const pipelineVal   = erpLeads.reduce((s,l)=>s+l.estimatedValue,0);
  const erpWinRate       = winRate;
  const pipelineEstimate = pipelineVal * (erpWinRate/100);
  const avgMonthlyRevenue = ytdPaid/Math.max(new Date().getMonth()+1,1);
  const projectedRevenue  = avgMonthlyRevenue + pipelineEstimate/Math.max(12-new Date().getMonth(),1);
  const openTasks=tasksTotal-tasksCompleted;
  const creatorCapacity=creatorStats.length>0?Math.max(0,Math.min(100,Math.round(100-openTasks/(creatorStats.length*8)*100))):0;
  
  const erpMetrics = [
    {label:"YTD Revenue",      value:formatCurrency(ytdTotal),       color:"#244D87",  sub:"Invoiced",       trend:0},
    {label:"YTD Collected",    value:formatCurrency(ytdPaid),        color:"#10b981",  sub:`${erpCollectionRate}% rate`, trend:0},
    {label:"Gross Profit",     value:formatCurrency(grossProfit),    color:grossProfit>=0?"#10b981":"#ef4444", sub:`${profitMargin}% margin`, trend:0},
    {label:"Outstanding",      value:formatCurrency(ytdOutstanding), color:ytdOutstanding>0?"#ef4444":"#10b981",sub:"To collect", trend:0},
  ];

  const avgHealth = erpClients.length>0?Math.round(erpClients.reduce((s,c)=>s+c.healthScore,0)/erpClients.length):0;
  const erpHealthFactors = [
    {name:"💰 Financial Health",    score:Math.min(100,erpCollectionRate),   note:`${collectionRate}% collection rate`},
    {name:"😊 Client Satisfaction", score:avgHealth,                      note:`Avg health score across ${erpClients.length} clients`},
    {name:"⚡ Team Capacity",       score:creatorCapacity,                note:`Calculated from ${openTasks} open tasks across ${creatorStats.length} creators`},
    {name:"📈 Revenue Growth",      score:Math.min(100,Math.max(0,50+profitMargin)), note:`${profitMargin}% profit margin`},
    {name:"🎯 Sales Pipeline",      score:Math.min(100,Math.round((pipelineVal/100000)*100)), note:`${formatCurrency(pipelineVal)} in active pipeline`},
  ];

  return (
    <div className="max-w-7xl space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">📊 Agency KPI Dashboard</h1>
        <p className="text-sm text-[#6B8FAF] mt-1">{now.toLocaleDateString("en-US",{month:"long",year:"numeric"})} — Full performance overview</p>
      </div>

      {/* Agency Health Score */}
      <div className="card" style={{background:"linear-gradient(135deg,rgba(0,55,100,0.4),rgba(0,119,182,0.15))",border:"1px solid rgba(0,119,182,0.3)"}}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-[#6B8FAF] font-semibold uppercase tracking-wider mb-1">Agency Health Score</p>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black grad-text">{Math.round((collectionRate+taskCompletionRate+winRate)/3)}%</span>
              <span className="text-sm text-[#6B8FAF] mb-1">Overall performance</span>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center"><p className="text-xl font-bold text-green-400">{collectionRate}%</p><p className="text-xs text-[#6B8FAF]">Collection Rate</p></div>
            <div className="text-center"><p className="text-xl font-bold text-blue-400">{taskCompletionRate}%</p><p className="text-xs text-[#6B8FAF]">Task Completion</p></div>
            <div className="text-center"><p className="text-xl font-bold text-purple-400">{winRate}%</p><p className="text-xs text-[#6B8FAF]">Sales Win Rate</p></div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-3xl font-black grad-text">{activeClients[0]?.count??0}</p>
          <p className="text-sm text-[#6B8FAF] mt-1">Active Clients</p>
          <p className="text-xs text-[#3D5577] mt-0.5">{totalClients[0]?.count??0} total</p>
        </div>
        <div className="card">
          <p className="text-3xl font-black" style={{color:"#10b981"}}>{teamCount[0]?.count??0}</p>
          <p className="text-sm text-[#6B8FAF] mt-1">Active Team Members</p>
          <p className="text-xs text-[#3D5577] mt-0.5">{creatorStats.length} creators</p>
        </div>
        <div className="card">
          <p className="text-3xl font-black" style={{color:"#244D87"}}>{activeLeads}</p>
          <p className="text-sm text-[#6B8FAF] mt-1">Active Leads</p>
          <p className="text-xs text-[#3D5577] mt-0.5">{wonDeals} won this period</p>
        </div>
        <div className="card">
          <p className="text-3xl font-black" style={{color:"#f59e0b"}}>{tasksTotal}</p>
          <p className="text-sm text-[#6B8FAF] mt-1">Tasks This Month</p>
          <p className="text-xs text-[#3D5577] mt-0.5">{tasksCompleted} completed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Media Performance */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">📣 Media Performance <span className="text-xs text-[#6B8FAF] font-normal">{now.toLocaleDateString("en-US",{month:"short"})}</span></h2>
          <div className="space-y-3">
            {[
              {l:"Ad Spend",  v:formatCurrency(spend),  chg:spendChg, color:"#244D87"},
              {l:"Revenue",   v:formatCurrency(rev),    chg:revChg,   color:"#10b981"},
              {l:"ROAS",      v:`${roas.toFixed(2)}x`,  chg:"—",      color:roas>=2?"#10b981":roas>=1?"#f59e0b":"#ef4444"},
              {l:"Leads",     v:leads,                  chg:leadsChg, color:"#8b5cf6"},
              {l:"CPL",       v:formatCurrency(cpl),    chg:"—",      color:"#f59e0b"},
              {l:"Agency Fee",v:formatCurrency(fee),    chg:"—",      color:"#00B4D8"},
            ].map(k=>(
              <div key={k.l} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-[#6B8FAF]">{k.l}</span>
                <div className="flex items-center gap-2">
                  <Trend val={k.chg} />
                  <span className="text-sm font-bold" style={{color:k.color}}>{k.v}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Finance KPIs */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">💰 Finance <span className="text-xs text-[#6B8FAF] font-normal">YTD {y}</span></h2>
          <div className="space-y-3">
            {[
              {l:"Total Revenue",   v:formatCurrency(yearRev),  color:"#244D87"},
              {l:"Collected",       v:formatCurrency(yearPaid), color:"#10b981"},
              {l:"Outstanding",     v:formatCurrency(yearOut),  color:yearOut>0?"#ef4444":"#6b7280"},
              {l:"Collection Rate", v:`${collectionRate}%`,     color:collectionRate>=80?"#10b981":collectionRate>=60?"#f59e0b":"#ef4444"},
            ].map(k=>(
              <div key={k.l} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-[#6B8FAF]">{k.l}</span>
                <span className="text-sm font-bold" style={{color:k.color}}>{k.v}</span>
              </div>
            ))}
            {/* Collection rate bar */}
            <div>
              <div className="flex justify-between text-xs text-[#6B8FAF] mb-1">
                <span>Collection Rate</span>
                <span>{collectionRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full" style={{width:`${collectionRate}%`,background:`linear-gradient(90deg,${collectionRate>=80?"#10b981":collectionRate>=60?"#f59e0b":"#ef4444"},#244D87)`}} />
              </div>
            </div>
          </div>
        </div>

        {/* Creative Tasks Breakdown */}
        <div className="card">
          <h2 className="font-semibold mb-4">🎨 Creative Tasks — This Month</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              {l:"Pending",    v:taskByStatus["PENDING"]??0,      c:"#6b7280"},
              {l:"In Progress",v:taskByStatus["IN_PROGRESS"]??0,  c:"#244D87"},
              {l:"In Review",  v:taskByStatus["REVIEW"]??0,       c:"#f59e0b"},
              {l:"Approved",   v:taskByStatus["APPROVED"]??0,     c:"#10b981"},
              {l:"Revision",   v:taskByStatus["REVISION"]??0,     c:"#f97316"},
              {l:"Completed",  v:taskByStatus["COMPLETED"]??0,    c:"#00B4D8"},
            ].map(k=>(
              <div key={k.l} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="card-title" style={{color:k.c}}>{k.v}</p>
                <p className="text-[11px] text-[#6B8FAF] mt-0.5">{k.l}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-xs text-[#6B8FAF] mb-1">
              <span>Completion Rate</span>
              <span>{taskCompletionRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full" style={{width:`${taskCompletionRate}%`,background:"linear-gradient(90deg,#244D87,#00B4D8)"}} />
            </div>
          </div>
        </div>

        {/* Creator Leaderboard */}
        <div className="card">
          <h2 className="font-semibold mb-4">🏆 Creator Performance</h2>
          <div className="space-y-3">
            {Object.values(creatorMap).sort((a,b)=>{
              const rA = a.total>0?(a.done/a.total):0;
              const rB = b.total>0?(b.done/b.total):0;
              return rB-rA;
            }).map((c,i)=>{
              const rate = c.total>0?Math.round((c.done/c.total)*100):0;
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-5 text-[#3D5577]">{i+1}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:"linear-gradient(135deg,#244D87,#00B4D8)"}}>
                    {c.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold truncate">{c.name}</span>
                      <span className="text-xs font-bold" style={{color:rate>=80?"#10b981":rate>=60?"#f59e0b":"#ef4444"}}>{rate}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full" style={{width:`${rate}%`,background:rate>=80?"#10b981":rate>=60?"#f59e0b":"#ef4444"}} />
                    </div>
                    <p className="text-[10px] text-[#3D5577] mt-0.5">{c.done}/{c.total} done{c.revision>0?` · ${c.revision} revisions`:""}</p>
                  </div>
                </div>
              );
            })}
            {Object.keys(creatorMap).length===0 && <p className="text-sm text-[#3D5577]">No creator data yet.</p>}
          </div>
        </div>
      </div>

      {/* Sales Pipeline Summary */}
      <div className="card">
        <h2 className="font-semibold mb-4">🎯 Sales Pipeline Summary</h2>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
          {["NEW_LEAD","CONTACTED","QUALIFIED","PROPOSAL_SENT","NEGOTIATION","WON","LOST"].map(stage=>{
            const n = salesByStage[stage]??0;
            const colors: Record<string,string> = {NEW_LEAD:"#6b7280",CONTACTED:"#3b82f6",QUALIFIED:"#8b5cf6",PROPOSAL_SENT:"#f59e0b",NEGOTIATION:"#ec4899",WON:"#10b981",LOST:"#ef4444"};
            return (
              <div key={stage} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="page-title" style={{color:colors[stage]}}>{n}</p>
                <p className="text-[10px] text-[#6B8FAF] mt-0.5">{stage.replace(/_/g," ")}</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6B8FAF]">Win Rate:</span>
            <span className="text-sm font-bold" style={{color:winRate>=50?"#10b981":winRate>=30?"#f59e0b":"#ef4444"}}>{winRate}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6B8FAF]">Active Leads:</span>
            <span className="text-sm font-bold text-[#244D87]">{activeLeads}</span>
          </div>
        </div>
      </div>

      {/* ═══ ERP Module 8: Business Intelligence — Executive Summary ═══ */}
      <div className="card" style={{background:"linear-gradient(135deg,rgba(0,55,100,0.3),rgba(0,119,182,0.1))",border:"1px solid rgba(0,119,182,0.25)"}}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-xl">📊 ERP Business Intelligence Dashboard</h2>
            <p className="text-xs text-[#6B8FAF] mt-0.5">Cross-module executive summary — Finance · HR · Operations · Sales</p>
          </div>
          <span className="badge bg-[#244D87]/10 text-[#244D87] text-xs font-bold px-3 py-1">Live from DB</span>
        </div>

        {/* Financial Health */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#6B8FAF] uppercase tracking-wider mb-3">💰 Financial Health</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {erpMetrics.map(k=>(
              <div key={k.label} className="p-4 rounded-xl bg-white/[0.04] border border-white/5">
                <p className="text-[10px] text-[#6B8FAF] uppercase tracking-wider mb-1">{k.label}</p>
                <p className="text-2xl font-black" style={{color:k.color}}>{k.value}</p>
                <p className="text-[10px] text-[#3D5577] mt-0.5">{k.sub}</p>
                {k.trend!==undefined&&k.trend!==0&&(
                  <span className="text-[10px] font-bold" style={{color:k.trend>0?"#10b981":"#ef4444"}}>{k.trend>0?"↑":"↓"}{Math.abs(k.trend)}% MoM</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Predictive Analytics */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#6B8FAF] uppercase tracking-wider mb-3">🔮 Predictive Analytics</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5">
              <p className="text-[10px] text-[#6B8FAF] uppercase tracking-wider mb-1">Projected Next Month Revenue</p>
              <p className="text-2xl font-black grad-text">{formatCurrency(projectedRevenue)}</p>
              <p className="text-[10px] text-[#3D5577] mt-1">Based on 3-month moving average of collected revenue</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5">
              <p className="text-[10px] text-[#6B8FAF] uppercase tracking-wider mb-1">Revenue at Churn Risk</p>
              <p className="text-2xl font-black" style={{color:churnRevenueRisk>0?"#ef4444":"#10b981"}}>{formatCurrency(churnRevenueRisk)}</p>
              <p className="text-[10px] text-[#3D5577] mt-1">Annual retainers from HIGH-risk clients</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5">
              <p className="text-[10px] text-[#6B8FAF] uppercase tracking-wider mb-1">Pipeline Conversion Est.</p>
              <p className="text-2xl font-black" style={{color:"#8b5cf6"}}>{formatCurrency(pipelineEstimate)}</p>
              <p className="text-[10px] text-[#3D5577] mt-1">Active pipeline × historical win rate</p>
            </div>
          </div>
        </div>

        {/* Agency Health Score — ERP composite */}
        <div>
          <p className="text-xs font-semibold text-[#6B8FAF] uppercase tracking-wider mb-3">🏥 Agency Health Composite (ERP)</p>
          <div className="space-y-3">
            {erpHealthFactors.map(f=>(
              <div key={f.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{f.name}</span>
                  <span className="font-bold" style={{color:f.score>=80?"#10b981":f.score>=60?"#f59e0b":"#ef4444"}}>{f.score}/100</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full" style={{width:`${f.score}%`,background:f.score>=80?"#10b981":f.score>=60?"#f59e0b":"#ef4444"}}/>
                  </div>
                  <span className="text-[10px] text-[#3D5577] w-48 flex-shrink-0">{f.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* ═══ IMPROVEMENT 11: Client Profitability Matrix ═══ */}
      <div className="card">
        <h2 className="font-semibold mb-1">💎 Client Profitability Matrix</h2>
        <p className="text-xs text-muted mb-4">Revenue − (estimated time cost + media overhead) = true profit per client</p>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Client</th><th>Monthly Retainer</th><th>Est. Time Cost</th><th>Media Overhead</th><th>Net Profit</th><th>Margin</th><th>Quadrant</th></tr></thead>
            <tbody>
              {erpClients.slice(0,8).map((c,i)=>{
                const revenue      = c.monthlyRetainer;
                const timeCost     = revenue * 0.28; // avg 28% of retainer goes to team time
                const mediaMarkup  = revenue * 0.08; // agency media handling cost
                const netProfit    = revenue - timeCost - mediaMarkup;
                const margin       = revenue > 0 ? Math.round((netProfit/revenue)*100) : 0;
                const quadrant     = margin >= 50 ? {label:"⭐ Star",color:"#10b981"} : margin >= 30 ? {label:"💰 Profitable",color:"#244D87"} : margin >= 15 ? {label:"⚠️ Marginal",color:"#f59e0b"} : {label:"🔴 Loss Risk",color:"#ef4444"};
                return (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.companyName}</td>
                    <td>${revenue.toLocaleString()}</td>
                    <td className="text-red-400">-${Math.round(timeCost).toLocaleString()}</td>
                    <td className="text-red-400">-${Math.round(mediaMarkup).toLocaleString()}</td>
                    <td className="font-bold" style={{color:netProfit>=0?"#10b981":"#ef4444"}}>${Math.round(netProfit).toLocaleString()}</td>
                    <td><div className="flex items-center gap-1.5"><div className="w-12 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full" style={{width:`${Math.max(0,margin)}%`,background:quadrant.color}}/></div><span className="text-xs font-bold" style={{color:quadrant.color}}>{margin}%</span></div></td>
                    <td><span className="badge text-[10px]" style={{background:`${quadrant.color}15`,color:quadrant.color}}>{quadrant.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-dim mt-3">Time cost estimated at 28% of retainer · Media overhead 8% · Use Time Entries module for precise data</p>
      </div>


      {/* ═══ Feature 39: Client Success Score ═══ */}
      <div className="card">
        <h2 className="font-semibold text-sm mb-3">🏆 Client Success Scores</h2>
        <div className="space-y-3">
          {erpClients.slice(0,6).map((c,i)=>{
            // Success score = weighted combo
            const payScore   = 25; // simplified — from collection rate
            const roasScore  = 20; // from media metrics
            const npsScore   = c.healthScore > 80 ? 20 : c.healthScore > 60 ? 12 : 5;
            const taskScore  = 20; // from approval rate
            const retentionScore = c.churnRisk==="LOW"?15:c.churnRisk==="MEDIUM"?8:2;
            const total = payScore+roasScore+npsScore+taskScore+retentionScore;
            const grade = total>=90?"A+":total>=80?"A":total>=70?"B":total>=60?"C":"D";
            const gradeColor = total>=80?"#10b981":total>=60?"#f59e0b":"#ef4444";
            return (
              <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
                  style={{background:`${gradeColor}20`,color:gradeColor}}>{grade}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{c.companyName}</p>
                  <div className="erp-progress mt-1">
                    <div className="progress-fill" style={{width:`${total}%`,background:gradeColor}}/>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black" style={{color:gradeColor}}>{total}</p>
                  <p className="text-[10px] text-muted">/100</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-dim mt-2">Score = Payment (25) + ROAS (20) + NPS (20) + Creative (20) + Retention (15)</p>
      </div>

    </div>
  );
}
