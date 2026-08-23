// @ts-nocheck -- Drizzle's generated onboarding shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, onboardingProgress, clients, mediaMetrics, creativeTasks,
  financeRecords, contacts, calendarEvents } from "@/lib/db";
import { eq, and, count, gte } from "drizzle-orm";
import { canAccessClient } from "@/lib/client-access";

// ── 17. Auto-sync onboarding from real data ───────────────────
async function computeProgress(clientId: string): Promise<Record<string,boolean>> {
  const [cl] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!cl) return {};

  const [metricCount]  = await db.select({ cnt: count() }).from(mediaMetrics).where(eq(mediaMetrics.clientId, clientId));
  const [taskCount]    = await db.select({ cnt: count() }).from(creativeTasks).where(eq(creativeTasks.clientId, clientId));
  const [invoiceCount] = await db.select({ cnt: count() }).from(financeRecords).where(eq(financeRecords.clientId, clientId));
  const [contactCount] = await db.select({ cnt: count() }).from(contacts).where(eq(contacts.clientId, clientId));
  const [calCount]     = await db.select({ cnt: count() }).from(calendarEvents).where(eq(calendarEvents.clientId, clientId));
  const [approvedTask] = await db.select({ cnt: count() }).from(creativeTasks)
    .where(and(eq(creativeTasks.clientId, clientId), eq(creativeTasks.status, "APPROVED")));

  return {
    profile_created:     true,  // If we're here, client exists
    contact_added:       Number(contactCount?.cnt ?? 0) > 0,
    media_metrics_added: Number(metricCount?.cnt ?? 0) > 0,
    first_task_created:  Number(taskCount?.cnt ?? 0) > 0,
    first_invoice_sent:  Number(invoiceCount?.cnt ?? 0) > 0,
    calendar_scheduled:  Number(calCount?.cnt ?? 0) > 0,
    creative_approved:   Number(approvedTask?.cnt ?? 0) > 0,
    portal_active:       !!cl.userId,
    budget_set:          (cl.mediaBudget ?? 0) > 0,
    contract_signed:     !!cl.contractStart,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error:"clientId required" }, { status:400 });
  if(!(await canAccessClient(session,clientId,{write:true})))return NextResponse.json({error:"Forbidden"},{status:403});

  // Auto-sync from real data
  const computed = await computeProgress(clientId);
  const total    = Object.keys(computed).length;
  const done     = Object.values(computed).filter(Boolean).length;
  const pct      = Math.round(done / total * 100);

  // Upsert each step individually (schema has one row per step)
  const adminId = (await db.select({id:clients.id}).from(clients).where(eq(clients.id, clientId)).limit(1))[0]?.id ?? clientId;
  const existingRows=await db.select().from(onboardingProgress).where(eq(onboardingProgress.clientId,clientId));
  for (const [stepId, isDone] of Object.entries(computed)) {
    const existing=existingRows.find(r=>r.stepId===stepId);
    if(existing)await db.update(onboardingProgress).set({completed:isDone as boolean,completedAt:isDone?new Date():null,completedBy:adminId}).where(eq(onboardingProgress.id,existing.id));
    else await db.insert(onboardingProgress).values({clientId,stepId,completed:isDone as boolean,completedAt:isDone?new Date():null,completedBy:adminId});
  }

  const STEP_LABELS: Record<string, string> = {
    profile_created:     "Client profile created",
    contact_added:       "Primary contact added",
    media_metrics_added: "First media metrics entered",
    first_task_created:  "First creative task created",
    first_invoice_sent:  "First invoice generated",
    calendar_scheduled:  "First content scheduled",
    creative_approved:   "First creative approved",
    portal_active:       "Client portal activated",
    budget_set:          "Monthly budget configured",
    contract_signed:     "Contract dates set",
  };

  const steps = Object.entries(computed).map(([key, done]) => ({
    key, done, label: STEP_LABELS[key] ?? key,
  }));

  return NextResponse.json({
    clientId, steps, done, total, pct,
    isComplete: pct === 100,
    message: pct === 100
      ? "✅ Onboarding complete!"
      : `${done}/${total} steps complete — ${pct}%`,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const { clientId, step, value } = await req.json();
  if (!clientId || !step) return NextResponse.json({ error:"clientId and step required" }, { status:400 });
  if(!(await canAccessClient(session,clientId,{write:true})))return NextResponse.json({error:"Forbidden"},{status:403});

  const [existing]=await db.select().from(onboardingProgress).where(and(eq(onboardingProgress.clientId,clientId),eq(onboardingProgress.stepId,step))).limit(1);
  const update={completed:value??true,completedAt:(value??true)?new Date():null,completedBy:(session.user as any).id};
  if(existing)await db.update(onboardingProgress).set(update).where(eq(onboardingProgress.id,existing.id));
  else await db.insert(onboardingProgress).values({clientId,stepId:step,...update});
  const rows = await db.select().from(onboardingProgress).where(eq(onboardingProgress.clientId, clientId));
  const done = rows.filter(r=>r.completed).length;

  return NextResponse.json({ success:true, step, value, done });
}
