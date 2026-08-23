export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, financeRecords } from "@/lib/db";
import { eq, sum, count } from "drizzle-orm";
import { Role } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function LTVPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (![Role.SUPER_ADMIN,Role.ACCOUNTANT].includes((session.user as any).role)) redirect("/dashboard");

  const [allClients, revenueByClient] = await Promise.all([
    db.select().from(clients).where(eq(clients.isActive, true)).orderBy(clients.companyName),
    db.select({clientId:financeRecords.clientId,totalPaid:sum(financeRecords.paid),months:count()})
      .from(financeRecords).groupBy(financeRecords.clientId),
  ]);
  const revenueMap = new Map(revenueByClient.map(row => [row.clientId, row]));

  // LTV per client (all-time paid revenue)
  const ltvData = allClients.map((c) => {
    const agg = revenueMap.get(c.id);

    const ltv     = Number(agg?.totalPaid ?? 0);
    const months  = Number(agg?.months ?? 0);
    const avgMonthly = months > 0 ? ltv / months : c.monthlyRetainer;

    // Contract months remaining
    const contractMonthsLeft = c.contractEnd
      ? Math.max(0, Math.ceil((new Date(c.contractEnd).getTime() - Date.now()) / (30*24*60*60*1000)))
      : 12;

    // Predicted LTV (current LTV + expected future value)
    const predictedLTV = ltv + (avgMonthly * contractMonthsLeft * (c.churnRisk==="HIGH" ? 0.4 : c.churnRisk==="MEDIUM" ? 0.7 : 0.9));

    return { client: c, ltv, months, avgMonthly, contractMonthsLeft, predictedLTV };
  });

  ltvData.sort((a,b) => b.ltv - a.ltv);
  const totalLTV = ltvData.reduce((s,d) => s+d.ltv, 0);
  const avgLTV   = ltvData.length > 0 ? Math.round(totalLTV / ltvData.length) : 0;
  const top20pct = ltvData.slice(0, Math.max(1, Math.ceil(ltvData.length * 0.2)));
  const top20rev = top20pct.reduce((s,d) => s+d.ltv, 0);
  const top20pct_share = totalLTV > 0 ? Math.round((top20rev/totalLTV)*100) : 0;

  const RISK_COLOR: Record<string,string> = { LOW:"#10b981", MEDIUM:"#f59e0b", HIGH:"#ef4444" };
  const maxLTV = Math.max(...ltvData.map(d=>d.ltv), 1);

  return (
    <div className="max-w-6xl space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">📈 Client Lifetime Value</h1>
        <p className="text-sm text-[#6B8FAF] mt-1">All-time revenue per client + predicted future value</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {l:"Total LTV",     v:formatCurrency(totalLTV),  c:"#244D87", icon:"💰"},
          {l:"Average LTV",   v:formatCurrency(avgLTV),    c:"#00B4D8", icon:"📊"},
          {l:"Top 20% Share", v:`${top20pct_share}%`,      c:"#f59e0b", icon:"🏆"},
          {l:"Active Clients",v:allClients.length,          c:"#10b981", icon:"🏢"},
        ].map(k=>(
          <div key={k.l} className="card">
            <div className="text-2xl mb-2">{k.icon}</div>
            <p className="text-2xl font-black" style={{color:k.c}}>{k.v}</p>
            <p className="text-xs text-[#6B8FAF] mt-1">{k.l}</p>
          </div>
        ))}
      </div>

      {top20pct_share > 0 && (
        <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:"14px",padding:"14px 18px"}}>
          <p className="font-semibold text-yellow-400 text-sm">🏆 Top 20% rule: {top20pct.map(d=>d.client.companyName).join(", ")} generate {top20pct_share}% of total revenue</p>
          <p className="text-xs text-[#6B8FAF] mt-1">Prioritize these clients for retention and upsells.</p>
        </div>
      )}

      {/* LTV Table */}
      <div className="card-vivit !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 font-semibold flex items-center justify-between">
          <span>Client LTV Ranking</span>
          <span className="text-xs text-[#6B8FAF]">{ltvData.length} clients</span>
        </div>
        <div>
          {ltvData.map((d, i) => {
            const barPct = Math.round((d.ltv/maxLTV)*100);
            return (
              <div key={d.client.id} className="px-5 py-4 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-bold text-[#3D5577] w-6 flex-shrink-0">#{i+1}</span>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:"linear-gradient(135deg,#244D87,#00B4D8)"}}>
                    {d.client.companyName.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <Link href={`/dashboard/clients/${d.client.id}`} className="font-semibold text-sm hover:text-[#00B4D8] transition-colors" style={{textDecoration:"none",color:"#E8F4FD"}}>
                      {d.client.companyName}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-semibold" style={{color:RISK_COLOR[d.client.churnRisk]}}>● {d.client.churnRisk} RISK</span>
                      <span className="text-[11px] text-[#3D5577]">{d.months} months · {formatCurrency(d.avgMonthly)}/mo avg</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 mt-1.5">
                      <div className="h-1.5 rounded-full" style={{width:`${barPct}%`,background:"linear-gradient(90deg,#244D87,#00B4D8)"}}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 flex-shrink-0 text-right">
                    <div>
                      <p className="text-base font-bold" style={{color:"#244D87"}}>{formatCurrency(d.ltv)}</p>
                      <p className="text-[10px] text-[#6B8FAF]">LTV to date</p>
                    </div>
                    <div>
                      <p className="text-base font-bold" style={{color:"#00B4D8"}}>{formatCurrency(d.predictedLTV)}</p>
                      <p className="text-[10px] text-[#6B8FAF]">Predicted LTV</p>
                    </div>
                    <div>
                      <p className="text-base font-bold" style={{color:d.contractMonthsLeft>90?"#10b981":d.contractMonthsLeft>30?"#f59e0b":"#ef4444"}}>{d.contractMonthsLeft}mo</p>
                      <p className="text-[10px] text-[#6B8FAF]">Contract left</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
