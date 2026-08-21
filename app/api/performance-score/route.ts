export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, financeRecords, creativeTasks, clientFeedback,
  mediaMetrics, users, agencyHealthScores, commissions,
  salaryRecommendations, kpiScores } from "@/lib/db";
import { eq, and, gte, sum, count, avg, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── 5-Factor Client Health Score ─────────────────────────────
async function calcClientHealth(clientId: string) {
  const now = new Date();
  const mo3ago = new Date(now.getFullYear(), now.getMonth()-3, 1);

  const [finAgg]  = await db.select({ paid:sum(financeRecords.paid), total:sum(financeRecords.totalRevenue) })
    .from(financeRecords).where(and(eq(financeRecords.clientId,clientId),gte(financeRecords.createdAt,mo3ago)));
  const [roasAgg] = await db.select({ avgRoas:avg(mediaMetrics.roas) })
    .from(mediaMetrics).where(and(eq(mediaMetrics.clientId,clientId),gte(mediaMetrics.date,mo3ago)));
  const [taskAgg]  = await db.select({ cnt:count() }).from(creativeTasks)
    .where(and(eq(creativeTasks.clientId,clientId),gte(creativeTasks.createdAt,mo3ago)));
  const [approvedAgg] = await db.select({ cnt:count() }).from(creativeTasks)
    .where(and(eq(creativeTasks.clientId,clientId),gte(creativeTasks.createdAt,mo3ago),eq(creativeTasks.status,"APPROVED")));
  const [npsFb] = await db.select({ score:clientFeedback.score }).from(clientFeedback)
    .where(eq(clientFeedback.clientId,clientId)).orderBy(desc(clientFeedback.createdAt)).limit(1);
  const [cl] = await db.select({ contractEnd:clients.contractEnd }).from(clients).where(eq(clients.id,clientId));

  const payRate     = Number(finAgg?.total??0)>0 ? Math.min(100,Math.round(Number(finAgg?.paid??0)/Number(finAgg?.total)*100)) : 80;
  const roas        = Number(roasAgg?.avgRoas??2.5);
  const roasScore   = Math.min(100,Math.round((roas/3)*100));
  const total       = Number(taskAgg?.cnt??0);
  const delivScore  = total>0 ? Math.round(Number(approvedAgg?.cnt??0)/total*100) : 75;
  const npsScore    = npsFb ? Math.round(Number(npsFb.score)/10*100) : 75;
  const daysLeft    = cl?.contractEnd ? Math.ceil((new Date(cl.contractEnd).getTime()-now.getTime())/86400000) : 180;
  const contractScore = daysLeft>=90?100:daysLeft>=30?60:daysLeft>=0?30:10;

  const score = Math.round(payRate*0.25+roasScore*0.25+delivScore*0.20+npsScore*0.15+contractScore*0.15);
  const churnProb = Math.max(0,Math.min(0.99,parseFloat(((100-score)/100*1.2).toFixed(2))));
  const risk: "LOW"|"MEDIUM"|"HIGH" = churnProb>=0.60?"HIGH":churnProb>=0.35?"MEDIUM":"LOW";

  return { score, churnProb, risk };
}

// ── Agency Health Score Engine ─────────────────────────────
async function calcAgencyHealth(workspaceId: string = "default") {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const mo1ago = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const moStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yrStart = new Date(now.getFullYear(), 0, 1);

  const [allClients] = await db.select({ cnt:count() }).from(clients).where(eq(clients.isActive,true));
  const [atRisk]     = await db.select({ cnt:count() }).from(clients)
    .where(and(eq(clients.isActive,true),eq(clients.churnRisk,"HIGH")));

  const [mtdFin] = await db.select({ paid:sum(financeRecords.paid), total:sum(financeRecords.totalRevenue) })
    .from(financeRecords).where(gte(financeRecords.createdAt,moStart));
  const [lastFin] = await db.select({ paid:sum(financeRecords.paid) })
    .from(financeRecords).where(and(gte(financeRecords.createdAt,mo1ago),
      eq(financeRecords.createdAt,new Date(now.getFullYear(),now.getMonth()-1,now.getDate()))));
  const [ytdFin] = await db.select({ paid:sum(financeRecords.paid), total:sum(financeRecords.totalRevenue) })
    .from(financeRecords).where(gte(financeRecords.createdAt,yrStart));

  const allStaff = await db.select({ id:users.id }).from(users)
    .where(and(eq(users.isActive,true),eq(users.role,"CREATOR")));

  const totalRevMTD   = Number(mtdFin?.total??0);
  const collectedMTD  = Number(mtdFin?.paid??0);
  const prevCollected = Number(lastFin?.paid??0);
  const ytdPaid       = Number(ytdFin?.paid??0);
  const ytdTotal      = Number(ytdFin?.total??0);

  const collectionRate   = totalRevMTD>0 ? Math.round(collectedMTD/totalRevMTD*100) : 0;
  const revenueGrowth    = prevCollected>0 ? Math.round((collectedMTD-prevCollected)/prevCollected*100) : 0;
  const clientCount      = Number(allClients?.cnt??0);
  const atRiskCount      = Number(atRisk?.cnt??0);
  const clientRetention  = clientCount>0 ? Math.round((clientCount-atRiskCount)/clientCount*100) : 100;

  // Utilization (active tasks / (creators * 6) * 100)
  const [activeTasks] = await db.select({ cnt:count() }).from(creativeTasks)
    .where(eq(creativeTasks.status,"IN_PROGRESS"));
  const utilization = allStaff.length>0
    ? Math.min(100, Math.round(Number(activeTasks?.cnt??0)/(allStaff.length*6)*100)) : 0;

  // P&L
  const profitability = ytdTotal>0 ? Math.round((ytdPaid-ytdTotal*0.6)/ytdTotal*100) : 0;

  // Cash flow score (collection rate based)
  const cashFlowScore = collectionRate;

  // MRR/ARR
  const allRetainers = await db.select({ ret:sum(clients.monthlyRetainer) }).from(clients).where(eq(clients.isActive,true));
  const mrr = Number(allRetainers[0]?.ret??0);
  const arr = mrr * 12;

  // Weighted agency health score
  const overallScore = Math.round(
    revenueGrowth*0.2 + profitability*0.2 + clientRetention*0.2 +
    cashFlowScore*0.15 + collectionRate*0.15 + utilization*0.10
  );

  const recommendations: string[] = [];
  if (collectionRate < 80) recommendations.push("🚨 Collection rate below 80% — escalate overdue invoices immediately");
  if (atRiskCount > 0) recommendations.push(`⚠️ ${atRiskCount} client(s) at high churn risk — schedule retention calls`);
  if (utilization > 90) recommendations.push("⚡ Team utilization above 90% — consider hiring or redistributing workload");
  if (revenueGrowth < 0) recommendations.push("📉 Revenue declining MoM — review sales pipeline and upsell opportunities");

  // Upsert agency health score
  await db.insert(agencyHealthScores).values({
    workspaceId:"default",
    period,
    overallScore: Math.max(0, Math.min(100, overallScore)),
    revenueGrowth: Math.max(-100, Math.min(200, revenueGrowth)),
    profitability: Math.max(-100, Math.min(100, profitability)),
    clientRetention,
    cashFlow: cashFlowScore,
    collectionRate,
    employeeUtilization: utilization,
    mrr: mrr.toString(),
    arr: arr.toString(),
    activeClients: clientCount,
    atRiskClients: atRiskCount,
    breakdown: JSON.stringify({ collectionRate,revenueGrowth,profitability,clientRetention,utilization }),
    recommendations: JSON.stringify(recommendations),
  }).onConflictDoUpdate({
    target: [agencyHealthScores.period],
    set: { overallScore:Math.max(0,Math.min(100,overallScore)), collectionRate, revenueGrowth, profitability, clientRetention, employeeUtilization:utilization, mrr:mrr.toString(), arr:arr.toString(), activeClients:clientCount, atRiskClients:atRiskCount, recommendations:JSON.stringify(recommendations), breakdown:JSON.stringify({collectionRate,revenueGrowth,profitability,clientRetention,utilization}), calculatedAt:new Date() },
  });

  return { overallScore:Math.max(0,Math.min(100,overallScore)), mrr, arr, clientCount, atRiskCount, collectionRate, utilization, recommendations };
}

// ── Commission Engine ─────────────────────────────────────────
async function calcCommissions(period: string) {
  const [yr, mo] = period.split("-").map(Number);

  // Get all finance records paid this period
  const paidRecords = await db.select({
    clientId: financeRecords.clientId,
    paid: financeRecords.paid,
    commissionRate: financeRecords.commissionRate,
  }).from(financeRecords).where(and(
    eq(financeRecords.month, mo),
    eq(financeRecords.year, yr),
    eq(financeRecords.invoiceStatus, "PAID" as any),
  ));

  // Get AMs per client
  const allClients = await db.select({ id:clients.id, accountManagerId:clients.accountManagerId }).from(clients);
  const clientAMMap = Object.fromEntries(allClients.map(c=>[c.id, c.accountManagerId]));

  // Aggregate per AM
  const amCommissions: Record<string,{collected:number;rate:number}> = {};
  for (const r of paidRecords) {
    const amId = clientAMMap[r.clientId];
    if (!amId) continue;
    if (!amCommissions[amId]) amCommissions[amId] = { collected:0, rate:Number(r.commissionRate??10)/100 };
    amCommissions[amId].collected += Number(r.paid??0);
  }

  // Upsert commissions
  for (const [userId, data] of Object.entries(amCommissions)) {
    const commAmt = data.collected * data.rate;
    await db.insert(commissions).values({
      workspaceId: "default",
      userId, period,
      revenueCollected: data.collected.toString(),
      commissionRate: data.rate,
      commissionAmount: commAmt.toString(),
      type: "ACCOUNT_MANAGER",
    }).onConflictDoNothing();
  }

  return Object.keys(amCommissions).length;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error:"Unauthorized" },{status:401});

  const body = await req.json().catch(()=>({}));
  const targetId = body.clientId as string|undefined;

  const allClients = await db.select({ id:clients.id, companyName:clients.companyName })
    .from(clients).where(eq(clients.isActive,true));
  const toProcess  = targetId ? allClients.filter(c=>c.id===targetId) : allClients;

  const results: any[] = [];
  for (const cl of toProcess) {
    const { score, churnProb, risk } = await calcClientHealth(cl.id);
    await db.update(clients).set({ healthScore:score, churnProbability:churnProb, churnRisk:risk as any, updatedAt:new Date() }).where(eq(clients.id,cl.id));
    results.push({ id:cl.id, name:cl.companyName, score, risk, churnProb });
  }

  // Also recalc agency health and commissions
  const [agencyHealth] = await Promise.all([
    calcAgencyHealth(),
  ]);

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  await calcCommissions(period);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/finance");

  return NextResponse.json({
    success:true, processed:results.length, results,
    agencyHealth,
    message:`Health scores + agency health + commissions recalculated`,
  });
}
