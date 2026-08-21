// @ts-nocheck -- Drizzle's generated insert shape is narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

// Fix 33: Which cron schedule triggered this run
type CronRun = "morning" | "evening" | "monthly" | "all";
function getCronType(req: NextRequest): CronRun {
  const t = req.nextUrl.searchParams.get("type") as CronRun;
  if (t) return t;
  const h = new Date().getHours();
  const d = new Date().getDate();
  if (d === 1 && h === 9) return "monthly";
  if (h >= 6 && h < 12)  return "morning";
  if (h >= 16)            return "evening";
  return "all";
}
import { db, creativeTasks, clients, notifications, users, financeRecords, mediaMetrics, salesLeads, clientFeedback, creatorProfiles } from "@/lib/db";
import { eq, and, lte, gte, notInArray, sum, count, lt, isNull, or, desc , inArray } from "drizzle-orm";
import { slackAlert } from "@/lib/slack";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secret = req.headers.get("x-cron-secret") ?? bearer ?? req.nextUrl.searchParams.get("secret");
  if (process.env.NODE_ENV === "production" && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now        = new Date();
  const in1Day     = new Date(now); in1Day.setDate(in1Day.getDate() + 1);
  const in3Days    = new Date(now); in3Days.setDate(in3Days.getDate() + 3);
  const in7Days    = new Date(now); in7Days.setDate(in7Days.getDate() + 7);
  const in30Days   = new Date(now); in30Days.setDate(in30Days.getDate() + 30);
  const ago5Days   = new Date(now); ago5Days.setDate(ago5Days.getDate() - 5);
  const ago30Days  = new Date(now); ago30Days.setDate(ago30Days.getDate() - 30);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
  const sent: Record<string, number> = {};

  const admins   = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "SUPER_ADMIN"), eq(users.isActive, true)));
  const allUsers = await db.select({ id: users.id, role: users.role, name: users.name, email: users.email }).from(users).where(eq(users.isActive, true));
  const allClients = await db.select().from(clients).where(eq(clients.isActive, true));

    // ── 14. Weekly Performance Digest (every Monday) ─────────────
  if (now.getDay() === 1) { // Monday
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const [weekTasks, weekLeads, weekRevAgg] = await Promise.all([
      db.select({ cnt: count() }).from(creativeTasks).where(and(inArray(creativeTasks.status,["APPROVED","COMPLETED"]),gte(creativeTasks.createdAt,weekAgo))).then(r=>Number(r[0]?.cnt??0)),
      db.select({ cnt: count() }).from(salesLeads).where(and(eq(salesLeads.stage,"WON"),gte(salesLeads.updatedAt,weekAgo))).then(r=>Number(r[0]?.cnt??0)),
      db.select({ total: sum(financeRecords.paid) }).from(financeRecords).where(gte(financeRecords.createdAt,weekAgo)).then(r=>Number(r[0]?.total??0)),
    ]);
    // Send digest to all admins
    for (const a of admins) {
      await notify(a.id, "GENERAL", "normal",
        `📊 Weekly Digest — ${now.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
        `✅ ${weekTasks} tasks approved · 🏆 ${weekLeads} deals won · 💰 $${Math.round(weekRevAgg).toLocaleString()} collected`,
        "/dashboard/analytics");
    }
    // Email digest if Resend configured
    if (process.env.RESEND_API_KEY) {
      const adminEmails = await db.select({email:users.email,name:users.name}).from(users).where(eq(users.role,"SUPER_ADMIN"));
      for (const u of adminEmails) {
        await fetch("https://api.resend.com/emails", {
          method:"POST",
          headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.RESEND_API_KEY}`},
          body:JSON.stringify({
            from:process.env.EMAIL_FROM??"Vivit ERP <noreply@viviterp.com>",
            to:[u.email],
            subject:`📊 Weekly Digest — ${now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}`,
            html:`<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px"><div style="background:linear-gradient(135deg,#17345F,#244D87);color:white;padding:20px;border-radius:12px 12px 0 0"><h1 style="margin:0;font-size:20px">📊 Weekly Performance Digest</h1><p style="margin:4px 0 0;opacity:0.8;font-size:14px">${now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</p></div><div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px"><h2>Good morning ${u.name?.split(" ")[0] ?? ""}! Here's your week in review:</h2><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr style="background:#244D87;color:white"><td style="padding:10px 14px">Metric</td><td style="padding:10px 14px">This Week</td></tr><tr><td style="padding:10px 14px;border:1px solid #eee">Tasks Approved/Completed</td><td style="padding:10px 14px;border:1px solid #eee;font-weight:bold">${weekTasks}</td></tr><tr style="background:#f5f5f5"><td style="padding:10px 14px;border:1px solid #eee">Deals Won</td><td style="padding:10px 14px;border:1px solid #eee;font-weight:bold">${weekLeads}</td></tr><tr><td style="padding:10px 14px;border:1px solid #eee">Revenue Collected</td><td style="padding:10px 14px;border:1px solid #eee;font-weight:bold;color:#10b981">$${Math.round(weekRevAgg).toLocaleString()}</td></tr></table><a href="${process.env.NEXTAUTH_URL??""}/dashboard/analytics" style="background:#244D87;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">View Full Analytics →</a></div><p style="color:#999;font-size:12px;margin-top:16px;text-align:center">VIVIT GROUP · Sent every Monday morning</p></div>`,
          })
        }).catch(()=>{});
      }
    }
    sent["weekly_digest"] = admins.length;
  }

  // ── 12. Client Lifecycle Automation ─────────────────────────
  // Upsell trigger: ROAS > 4× on spend > $5k → suggest budget increase
  let upsellAlerts = 0;
  for (const c of allClients) {
    const [mAgg] = await db.select({ spend: sum(mediaMetrics.adSpend), revenue: sum(mediaMetrics.revenue) })
      .from(mediaMetrics).where(and(eq(mediaMetrics.clientId, c.id), gte(mediaMetrics.date, monthStart)));
    const spend = Number(mAgg?.spend ?? 0);
    const revenue = Number(mAgg?.revenue ?? 0);
    if (spend > 5000 && revenue / spend > 4) {
      const targets = [...new Set([...admins.map(a=>a.id), c.accountManagerId].filter(Boolean))] as string[];
      for (const uid of targets) {
        await notify(uid, "GENERAL", "normal",
          `🚀 Upsell opportunity: ${c.companyName}`,
          `ROAS is ${(revenue/spend).toFixed(1)}× on $${Math.round(spend).toLocaleString()} spend — great time to suggest increasing budget.`,
          `/dashboard/clients/${c.id}`);
      }
      upsellAlerts++;
    }
  }
  sent["upsell_alerts"] = upsellAlerts;

  // ── Operations variables ─────────────────────────────────────
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hourNow    = now.getHours();

  // ── 15. Morning Digest (8AM — already runs with rule 1-14) ─────
  // Sends targeted digest to each AM with their day's priorities
  if (hourNow >= 7 && hourNow <= 9) {
    const ams = await db.select({ id:users.id, email:users.email, name:users.name })
      .from(users).where(eq(users.role, "ACCOUNT_MANAGER"));
    for (const am of ams) {
      const amClients  = allClients.filter(c => c.accountManagerId === am.id);
      const amTasks    = await db.select().from(creativeTasks)
        .where(and(notInArray(creativeTasks.status,["COMPLETED","REJECTED"])))
        .limit(50);
      const amOverdue  = amTasks.filter(t => new Date(t.deadline) < now && amClients.some(c => c.id === t.clientId));
      const amReview   = amTasks.filter(t => t.status === "REVIEW" && amClients.some(c => c.id === t.clientId));
      if (amOverdue.length > 0 || amReview.length > 0) {
        await notify(am.id, "GENERAL", "high",
          `🌅 Good morning ${am.name?.split(" ")[0]} — ${amOverdue.length} overdue, ${amReview.length} in review`,
          `Today: ${amClients.length} active clients · Check Tasks Inbox for priority actions`,
          "/dashboard/tasks-inbox");
      }
    }
    sent["morning_digest"] = ams.length;
  }

  // ── 16. Payment Follow-up Sequences ────────────────────────────
  const overdueInvoices = await db.select({
    id:financeRecords.id, clientId:financeRecords.clientId,
    outstanding:financeRecords.outstanding, dueDate:financeRecords.dueDate,
  }).from(financeRecords).where(
    and(eq(financeRecords.invoiceStatus,"OVERDUE"))
  ).limit(20);

  let paymentAlerts = 0;
  for (const inv of overdueInvoices) {
    if (!inv.outstanding || inv.outstanding <= 0) continue;
    const daysOverdue = inv.dueDate ? Math.floor((now.getTime()-new Date(inv.dueDate).getTime())/86400000) : 0;
    const client = allClients.find(c => c.id === inv.clientId);
    if (!client?.accountManagerId) continue;

    // Day 1: gentle reminder
    if (daysOverdue === 1) {
      await notify(client.accountManagerId,"GENERAL","normal",
        `💳 Invoice reminder: ${client.companyName}`,
        `$${Math.round(inv.outstanding).toLocaleString()} due — send gentle WhatsApp reminder`,
        "/dashboard/finance");
    }
    // Day 7: escalate
    else if (daysOverdue === 7) {
      await notify(client.accountManagerId,"GENERAL","high",
        `⚠️ Week overdue: ${client.companyName}`,
        `$${Math.round(inv.outstanding).toLocaleString()} — 7 days overdue. Call client directly.`,
        "/dashboard/finance");
    }
    // Day 30: notify all admins
    else if (daysOverdue === 30) {
      for (const admin of admins) {
        await notify(admin.id,"GENERAL","urgent",
          `🚨 Critical overdue: ${client.companyName}`,
          `$${Math.round(inv.outstanding).toLocaleString()} — 30 days overdue. Escalate to management.`,
          "/dashboard/finance");
      }
    }
    paymentAlerts++;
  }
  sent["payment_sequences"] = paymentAlerts;

  // ── 17. Client Milestone Notifications ─────────────────────────
  for (const client of allClients) {
    const [taskCount] = await db.select({ cnt: count() }).from(creativeTasks)
      .where(and(eq(creativeTasks.clientId,client.id),inArray(creativeTasks.status,["COMPLETED","APPROVED"])));
    const total = Number(taskCount?.cnt ?? 0);
    // Celebrate milestones: 50, 100, 250, 500 posts
    if ([50,100,250,500].includes(total) && client.accountManagerId) {
      await notify(client.accountManagerId,"GENERAL","normal",
        `🎉 Milestone: ${client.companyName} — ${total} posts published!`,
        `Send a congratulations message to the client. Great for relationship building.`,
        `/dashboard/clients/${client.id}`);
    }
  }
  sent["milestones"] = allClients.length;

  // ── 18. End-of-Day Summary (6PM) ───────────────────────────────
  if (hourNow >= 17 && hourNow <= 19) {
    const todayApproved = await db.select({ cnt: count() }).from(creativeTasks)
      .where(and(inArray(creativeTasks.status,["APPROVED","COMPLETED"]),gte(creativeTasks.updatedAt,todayStart)))
      .then(r => Number(r[0]?.cnt ?? 0));
    const todayLeads = await db.select({ cnt: count() }).from(salesLeads)
      .where(gte(salesLeads.updatedAt,todayStart))
      .then(r => Number(r[0]?.cnt ?? 0));

    for (const admin of admins) {
      await notify(admin.id,"GENERAL","low",
        `🌙 EOD Summary — ${todayApproved} tasks approved · ${todayLeads} leads updated`,
        `Tomorrow: Check Tasks Inbox for pending reviews and overnight client messages.`,
        "/dashboard");
    }
    sent["eod_summary"] = admins.length;
  }

  // Contract renewal pipeline: 90d + 60d + 30d alerts
  const renewalClients = await db.select({ id:clients.id, companyName:clients.companyName, accountManagerId:clients.accountManagerId, contractEnd:clients.contractEnd })
    .from(clients).where(and(eq(clients.isActive,true)));
  let renewalAlerts = 0;
  for (const c of renewalClients) {
    if (!c.contractEnd) continue;
    const daysLeft = Math.ceil((new Date(c.contractEnd).getTime() - now.getTime()) / 86400000);
    if ([90, 60, 30].includes(daysLeft) && c.accountManagerId) {
      await notify(c.accountManagerId, "GENERAL", daysLeft<=30?"high":"normal",
        `📋 Contract renewal: ${c.companyName} — ${daysLeft} days left`,
        `Start renewal conversation now to avoid contract gap. Tip: offer early-renewal discount.`,
        `/dashboard/contracts`);
      renewalAlerts++;
    }
  }
  sent["renewal_pipeline"] = renewalAlerts;



  async function notify(userId: string, type: string, priority: string, title: string, message: string, link?: string) {
    await db.insert(notifications).values({ userId, type, priority, title, message, link: link ?? null }).onConflictDoNothing();
  }

  // ── 1. Task Deadline Reminders ──────────────────────────────
  const urgentTasks = await db.select({
    id: creativeTasks.id, title: creativeTasks.title,
    deadline: creativeTasks.deadline, assignedToId: creativeTasks.assignedToId,
    createdById: creativeTasks.createdById, clientId: creativeTasks.clientId,
  }).from(creativeTasks).where(and(
    lte(creativeTasks.deadline, in3Days), gte(creativeTasks.deadline, now),
    notInArray(creativeTasks.status, ["APPROVED","COMPLETED","REJECTED"]),
  ));

  for (const task of urgentTasks) {
    const daysLeft = Math.ceil((new Date(task.deadline).getTime() - now.getTime()) / 86400000);
    for (const uid of [...new Set([task.assignedToId, task.createdById].filter(Boolean))] as string[]) {
      await notify(uid, "DEADLINE_UPCOMING", daysLeft <= 1 ? "urgent" : "high",
        daysLeft <= 1 ? `🚨 Task due TODAY: ${task.title}` : `⏰ Due in ${daysLeft}d: ${task.title}`,
        `Deadline: ${new Date(task.deadline).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}`,
        `/dashboard/creative/${task.id}`);
    }
    if (daysLeft <= 1) await slackAlert("task", { title: task.title, client: task.clientId, daysLeft });
  }
  sent["deadline_alerts"] = urgentTasks.length;

  // ── 2. Contract Expiry Alerts ────────────────────────────────
  const expiringContracts = await db.select({
    id: clients.id, companyName: clients.companyName,
    contractEnd: clients.contractEnd, accountManagerId: clients.accountManagerId,
  }).from(clients).where(and(eq(clients.isActive, true), lte(clients.contractEnd!, in30Days), gte(clients.contractEnd!, now)));

  for (const c of expiringContracts) {
    const daysLeft = Math.ceil((new Date(c.contractEnd!).getTime() - now.getTime()) / 86400000);
    const targets = [...new Set([...admins.map(a => a.id), c.accountManagerId].filter(Boolean))] as string[];
    for (const uid of targets) {
      await notify(uid, "DEADLINE_UPCOMING", daysLeft <= 7 ? "urgent" : "high",
        `📋 Contract expiring in ${daysLeft}d: ${c.companyName}`,
        `Renew before ${new Date(c.contractEnd!).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}`,
        `/dashboard/contracts`);
    }
    if (daysLeft <= 7) await slackAlert("contract", { client: c.companyName, daysLeft });
  }
  sent["contract_alerts"] = expiringContracts.length;

  // ── 3. Budget Alerts (80% + 100%) ──────────────────────────
  let budgetAlerts = 0;
  for (const c of allClients) {
    if (c.mediaBudget <= 0) continue;
    const [agg] = await db.select({ total: sum(mediaMetrics.adSpend) }).from(mediaMetrics)
      .where(and(eq(mediaMetrics.clientId, c.id), gte(mediaMetrics.date, monthStart)));
    const spent = Number(agg?.total ?? 0);
    const pct   = (spent / c.mediaBudget) * 100;
    if (pct >= 80 && c.accountManagerId) {
      await notify(c.accountManagerId, "LOW_BUDGET", pct >= 100 ? "urgent" : "high",
        `${pct >= 100 ? "🚨" : "⚠️"} Budget ${pct >= 100 ? "exceeded" : "80% used"}: ${c.companyName}`,
        `Spent $${Math.round(spent).toLocaleString()} of $${c.mediaBudget.toLocaleString()} (${Math.round(pct)}%)`,
        `/dashboard/media`);
      await slackAlert("budget", { client: c.companyName, pct: Math.round(pct), spent: Math.round(spent), budget: c.mediaBudget });
      budgetAlerts++;
    }
  }
  sent["budget_alerts"] = budgetAlerts;

  // ── 4. Overdue Invoice Alerts ───────────────────────────────
  const overdueInvoices2 = await db.select({
    id: financeRecords.id, clientId: financeRecords.clientId,
    outstanding: financeRecords.outstanding, invoiceNumber: financeRecords.invoiceNumber,
    dueDate: financeRecords.dueDate,
  }).from(financeRecords).where(and(lte(financeRecords.dueDate!, now), gte(financeRecords.outstanding!, 1)));

  for (const inv of overdueInvoices2) {
    for (const u of admins) {
      await notify(u.id, "GENERAL", "urgent",
        `💳 Overdue Invoice: INV-${inv.id.slice(0,8)}`,
        `Outstanding: $${inv.outstanding.toLocaleString()} — Due date passed.`,
        `/dashboard/finance`);
    }
    await slackAlert("invoice", { client: inv.clientId, amount: inv.outstanding });
  }
  sent["invoice_alerts"] = overdueInvoices2.length;

  // ── 5. High Churn Risk Auto-Alert ──────────────────────────
  const highRiskClients = allClients.filter(c => c.churnRisk === "HIGH" || c.churnProbability > 0.6);
  for (const c of highRiskClients) {
    const targets = [...new Set([...admins.map(a => a.id), c.accountManagerId].filter(Boolean))] as string[];
    for (const uid of targets) {
      await notify(uid, "GENERAL", "urgent",
        `🚨 High Churn Risk: ${c.companyName}`,
        `Churn probability: ${Math.round(c.churnProbability * 100)}% — Health score: ${Math.round(c.healthScore)}%. Immediate action needed.`,
        `/dashboard/clients/${c.id}`);
    }
    await slackAlert("lead", { status: "CHURN_RISK", company: c.companyName, value: c.monthlyRetainer * 12 });
  }
  sent["churn_alerts"] = highRiskClients.length;

  // ── 6. Stale Sales Leads (5+ days no activity) ──────────────
  const staleLeads = await db.select({
    id: salesLeads.id, companyName: salesLeads.companyName,
    salesRepId: salesLeads.salesRepId, updatedAt: salesLeads.updatedAt,
    estimatedValue: salesLeads.estimatedValue,
  }).from(salesLeads).where(and(
    notInArray(salesLeads.stage, ["WON","LOST"]),
    lte(salesLeads.updatedAt, ago5Days),
  ));

  for (const lead of staleLeads) {
    const daysSince = Math.floor((now.getTime() - new Date(lead.updatedAt).getTime()) / 86400000);
    const targets   = [...new Set([...admins.map(a => a.id), lead.salesRepId].filter(Boolean))] as string[];
    for (const uid of targets) {
      await notify(uid, "LEAD_UPDATED", "high",
        `⏰ Stale lead (${daysSince}d): ${lead.companyName}`,
        `No activity in ${daysSince} days — value: $${lead.estimatedValue.toLocaleString()}. Log a follow-up now.`,
        `/dashboard/sales`);
    }
  }
  sent["stale_lead_alerts"] = staleLeads.length;

  // ── 7. Creator Overload Warning ──────────────────────────────
  const creators = allUsers.filter(u => u.role === "CREATOR");
  let overloadAlerts = 0;
  for (const creator of creators) {
    const [taskCount] = await db.select({ cnt: count() }).from(creativeTasks).where(and(
      eq(creativeTasks.assignedToId, creator.id),
      notInArray(creativeTasks.status, ["APPROVED","COMPLETED","REJECTED"]),
    ));
    const active = Number(taskCount?.cnt ?? 0);
    if (active >= 6) { // threshold: 6+ active tasks = overloaded
      for (const u of admins) {
        await notify(u.id, "GENERAL", "high",
          `⚠️ Creator overloaded: ${creator.name}`,
          `${active} active tasks assigned — redistribute to balance workload.`,
          `/dashboard/team`);
      }
      overloadAlerts++;
    }
  }
  sent["creator_overload_alerts"] = overloadAlerts;

  // ── 8. NPS Survey Request (monthly, if no response this month) ──
  const npsClients = await db.select({ id: clients.id, companyName: clients.companyName, accountManagerId: clients.accountManagerId })
    .from(clients).where(eq(clients.isActive, true));
  let npsReminders = 0;
  // Only send on the 1st of the month
  if (now.getDate() === 1) {
    for (const c of npsClients) {
      const thisMonthFeedback = await db.select({ id: clientFeedback.id }).from(clientFeedback)
        .where(and(eq(clientFeedback.clientId, c.id), eq(clientFeedback.month, now.getMonth() + 1), eq(clientFeedback.year, now.getFullYear())));
      if (thisMonthFeedback.length === 0 && c.accountManagerId) {
        await notify(c.accountManagerId, "GENERAL", "normal",
          `⭐ Send NPS survey to ${c.companyName}`,
          `Monthly satisfaction check not sent yet — client portal has the NPS form ready.`,
          `/dashboard/nps`);
        npsReminders++;
      }
    }
  }
  sent["nps_reminders"] = npsReminders;

  // ── 9. Auto-generate Monthly Summary for All Clients ────────
  // On the 1st of each month — ping all AMs to send reports
  if (now.getDate() === 1) {
    const ams = allUsers.filter(u => u.role === "ACCOUNT_MANAGER");
    for (const am of ams) {
      await notify(am.id, "GENERAL", "high",
        "📊 Monthly Reports Due",
        `It's the 1st — time to generate and send monthly performance reports to all your clients.`,
        `/dashboard/monthly-reports`);
    }
    for (const u of admins) {
      await notify(u.id, "GENERAL", "normal",
        "📋 Month closed — recurring invoices due",
        `Generate recurring invoices for all active clients from Settings.`,
        `/dashboard/settings`);
    }
    sent["monthly_reminders"] = ams.length + admins.length;
  }

  // ── 10. Performance Score Auto-Recalculation ─────────────────
  // Runs daily — update churn probability and health scores
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    await fetch(`${baseUrl}/api/performance-score`, { method: "POST" });
    sent["performance_recalc"] = 1;
  } catch {
    sent["performance_recalc"] = 0;
  }

  // ── 11. Low ROAS Alert ───────────────────────────────────────
  let roasAlerts = 0;
  for (const c of allClients) {
    const [mAgg] = await db.select({ spend: sum(mediaMetrics.adSpend), revenue: sum(mediaMetrics.revenue) })
      .from(mediaMetrics).where(and(eq(mediaMetrics.clientId, c.id), gte(mediaMetrics.date, monthStart)));
    const spend = Number(mAgg?.spend ?? 0);
    const revenue = Number(mAgg?.revenue ?? 0);
    if (spend > 1000) {
      const roas = revenue / spend;
      if (roas < 1.5 && c.mediaBuyerId) { // below 1.5x is alarming
        const targets = [...new Set([...admins.map(a => a.id), c.mediaBuyerId, c.accountManagerId].filter(Boolean))] as string[];
        for (const uid of targets) {
          await notify(uid, "LOW_BUDGET", "high",
            `📉 Low ROAS: ${c.companyName}`,
            `ROAS is ${roas.toFixed(2)}× this month — below 1.5× threshold. Review campaign strategy.`,
            `/dashboard/media`);
        }
        roasAlerts++;
      }
    }
  }
  sent["low_roas_alerts"] = roasAlerts;

  // Fix 80: Log completion time
  const duration = Date.now() - startTime;
  console.log(`Cron completed in ${duration}ms`);

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    automations_ran: Object.keys(sent).length,
    results: sent,
    total_notifications: Object.values(sent).reduce((a,b) => a+b, 0),
  });
}
