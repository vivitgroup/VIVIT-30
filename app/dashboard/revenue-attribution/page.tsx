export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, financeRecords, users, creativeTasks, salesLeads } from "@/lib/db";
import { eq, sum, count, and, inArray } from "drizzle-orm";
import { Role } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function RevenueAttributionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== Role.SUPER_ADMIN) redirect("/dashboard");

  const year = new Date().getFullYear();

  // Get all AMs
  const accountManagers = await db.select({ id: users.id, name: users.name }).from(users)
    .where(eq(users.role, "ACCOUNT_MANAGER"));

  // Revenue per AM (from clients they manage)
  const amStats = await Promise.all(accountManagers.map(async (am) => {
    const amClients = await db.select({ id: clients.id, companyName: clients.companyName, monthlyRetainer: clients.monthlyRetainer, mediaBudget: clients.mediaBudget, healthScore: clients.healthScore, churnRisk: clients.churnRisk })
      .from(clients).where(and(eq(clients.accountManagerId, am.id), eq(clients.isActive, true)));

    const clientIds = amClients.map(c => c.id);
    const [revenueAgg] = clientIds.length > 0
      ? await db.select({ total: sum(financeRecords.totalRevenue), paid: sum(financeRecords.paid) })
          .from(financeRecords).where(and(eq(financeRecords.year, year),inArray(financeRecords.clientId,clientIds)))
      : [{ total: 0, paid: 0 }];

    const [taskAgg] = await db.select({ total: count() }).from(creativeTasks)
      .where(eq(creativeTasks.assignedToId, am.id));

    const wonLeads = await db.select({ val: sum(salesLeads.estimatedValue) }).from(salesLeads)
      .where(and(eq(salesLeads.salesRepId, am.id), eq(salesLeads.stage, "WON")));

    const totalRevenue  = Number(revenueAgg?.total ?? 0);
    const totalPaid     = Number(revenueAgg?.paid ?? 0);
    const totalTasks    = Number(taskAgg?.total ?? 0);
    const wonValue      = Number(wonLeads[0]?.val ?? 0);
    const clientCount   = amClients.length;
    const highRisk      = amClients.filter(c => c.churnRisk === "HIGH").length;
    const avgHealth     = clientCount > 0 ? Math.round(amClients.reduce((s,c) => s + c.healthScore, 0) / clientCount) : 0;

    return { am, clients: amClients, totalRevenue, totalPaid, totalTasks, wonValue, clientCount, highRisk, avgHealth };
  }));

  // Sort by revenue
  amStats.sort((a,b) => b.totalRevenue - a.totalRevenue);
  const totalAgencyRevenue = amStats.reduce((s,a) => s+a.totalRevenue, 0);

  const RISK_COLOR: Record<string,string> = { LOW:"#10b981", MEDIUM:"#f59e0b", HIGH:"#ef4444" };

  return (
    <div className="max-w-7xl space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">💰 Revenue Attribution</h1>
        <p className="text-sm text-[#6B8FAF] mt-1">Revenue breakdown by Account Manager — {year}</p>
      </div>

      {/* Agency Total */}
      <div className="card" style={{background:"linear-gradient(135deg,rgba(0,55,100,0.4),rgba(0,119,182,0.15))",border:"1px solid rgba(0,119,182,0.3)"}}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-[#6B8FAF] font-semibold uppercase tracking-wider mb-1">Total Agency Revenue — {year}</p>
            <p className="text-5xl font-black grad-text">{formatCurrency(totalAgencyRevenue)}</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              {l:"Active AMs",   v:amStats.length,             c:"#244D87"},
              {l:"Total Clients",v:amStats.reduce((s,a)=>s+a.clientCount,0), c:"#00B4D8"},
              {l:"High Risk",    v:amStats.reduce((s,a)=>s+a.highRisk,0),    c:"#ef4444"},
            ].map(k=>(
              <div key={k.l} className="text-center">
                <p className="text-3xl font-black" style={{color:k.c}}>{k.v}</p>
                <p className="text-xs text-[#6B8FAF]">{k.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AM Cards */}
      <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
        {amStats.map((stat, i) => {
          const share = totalAgencyRevenue > 0 ? Math.round((stat.totalRevenue/totalAgencyRevenue)*100) : 0;
          const collRate = stat.totalRevenue > 0 ? Math.round((stat.totalPaid/stat.totalRevenue)*100) : 0;
          return (
            <div key={stat.am.id} className="card">
              <div className="flex items-start gap-5 flex-wrap">
                {/* Rank + Avatar */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-2xl font-black" style={{color:i===0?"#f59e0b":i===1?"#9ca3af":i===2?"#cd7f32":"#3D5577"}}>#{i+1}</span>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{background:"linear-gradient(135deg,#244D87,#00B4D8)"}}>
                    {stat.am.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div>
                    <p className="font-bold text-base">{stat.am.name}</p>
                    <p className="text-xs text-[#6B8FAF]">Account Manager</p>
                  </div>
                </div>

                {/* Revenue bar */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-bold text-xl" style={{color:"#244D87"}}>{formatCurrency(stat.totalRevenue)}</span>
                    <span className="text-[#6B8FAF]">{share}% of agency revenue</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/10">
                    <div className="h-3 rounded-full" style={{width:`${share}%`,background:"linear-gradient(90deg,#244D87,#00B4D8)",minWidth:share>0?"8px":"0"}}/>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-[#6B8FAF]">
                    <span>Collected: <strong className="text-green-400">{formatCurrency(stat.totalPaid)}</strong></span>
                    <span>Rate: <strong style={{color:collRate>=80?"#10b981":collRate>=60?"#f59e0b":"#ef4444"}}>{collRate}%</strong></span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 flex-shrink-0">
                  {[
                    {l:"Clients",     v:stat.clientCount, c:"#244D87"},
                    {l:"Avg Health",  v:`${stat.avgHealth}%`, c:stat.avgHealth>=75?"#10b981":stat.avgHealth>=50?"#f59e0b":"#ef4444"},
                    {l:"High Risk",   v:stat.highRisk,    c:stat.highRisk>0?"#ef4444":"#10b981"},
                    {l:"Won Deals",   v:formatCurrency(stat.wonValue).replace("$","$").replace(",000","k"), c:"#8b5cf6"},
                  ].map(k=>(
                    <div key={k.l} className="text-center p-2 rounded-xl bg-white/[0.03]">
                      <p className="text-lg font-bold" style={{color:k.c}}>{k.v}</p>
                      <p className="text-[10px] text-[#6B8FAF]">{k.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Client list */}
              {stat.clients.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-[#3D5577] font-semibold uppercase tracking-wider mb-2">Managed Clients</p>
                  <div className="flex flex-wrap gap-2">
                    {stat.clients.map(c => (
                      <Link key={c.id} href={`/dashboard/clients/${c.id}`}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all text-xs font-medium"
                        style={{border:`1px solid ${RISK_COLOR[c.churnRisk]}25`,background:`${RISK_COLOR[c.churnRisk]}08`,color:"#E8F4FD",textDecoration:"none"}}>
                        <span style={{color:RISK_COLOR[c.churnRisk]}}>●</span>
                        {c.companyName}
                        <span className="text-[#3D5577]">{formatCurrency(c.monthlyRetainer).replace(",000","k")}/mo</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {amStats.length === 0 && (
          <div className="card-vivit text-center py-12">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-lg font-semibold">No Account Managers yet</p>
            <p className="text-sm text-[#6B8FAF] mt-1">Add AMs in Settings and assign them to clients</p>
          </div>
        )}
      </div>

      {/* ═══ Feature 11: Commission Tracking for AMs ═══ */}
      <div className="card" style={{border:"1px solid rgba(16,185,129,0.2)"}}>
        <h2 className="font-semibold text-green-400 mb-4">💸 AM Commission Tracker — {new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"})}</h2>
        <p className="text-xs text-muted mb-4">Commission = 10% of collected revenue per client × account manager</p>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Account Manager</th><th>Clients</th><th>MTD Revenue</th><th>MTD Collected</th><th>Commission Rate</th><th>Commission Earned</th><th>Status</th></tr></thead>
            <tbody>
              {amStats.map((am:any)=>{
                const commission = Math.round((am.totalPaid ?? am.collected ?? 0) * 0.10);
                const isPaid = true; // Commission paid with payroll
                return(
                  <tr key={am.am.id}>
                    <td className="font-semibold">{am.am.name}</td>
                    <td>{am.clientCount ?? 0}</td>
                    <td>${(am.totalRevenue ?? am.revenue ?? 0).toLocaleString()}</td>
                    <td className="text-green-400 font-bold">${(am.totalPaid ?? am.collected ?? 0).toLocaleString()}</td>
                    <td className="text-center">10%</td>
                    <td className="font-black grad-text text-lg">${commission.toLocaleString()}</td>
                    <td>
                      <span className={"badge " + (isPaid?"badge-success":"badge-warning")}>
                        {isPaid ? "✅ Paid" : "⏳ Pending"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between">
          <span className="text-sm text-muted">Total Commission This Month</span>
          <span className="font-black text-green-400 text-lg">
            ${amStats.reduce((s:number,am:any)=>s+Math.round((am.totalPaid??am.collected??0)*0.10),0).toLocaleString()}
          </span>
        </div>
      </div>

    </div>
  );
}
