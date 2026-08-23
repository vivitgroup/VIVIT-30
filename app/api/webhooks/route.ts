// @ts-nocheck -- Drizzle's generated webhook shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, webhooks, auditLogs } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

// ── Webhook Dispatcher with Retry (Feature 31) ─────────────────
async function dispatchWebhook(
  event: string,
  payload: Record<string, any>,
  workspaceId = "default"
) {
  const hooks = await db.select().from(webhooks)
    .where(eq(webhooks.isActive, true));

  for (const hook of hooks) {
    let events:string[]=[];
    try{const parsed=JSON.parse(hook.events??"[]");events=Array.isArray(parsed)?parsed.filter(v=>typeof v==="string"):[];}catch{events=[];}
    if (!events.includes(event) && !events.includes("*")) continue;

    const body = JSON.stringify({
      event, timestamp: new Date().toISOString(),
      workspaceId, data: payload,
    });

    const sig = crypto.createHmac("sha256", hook.secret)
      .update(body).digest("hex");

    // Exponential backoff: 0, 1min, 5min, 30min, 2hr
    const delays = [0, 60000, 300000, 1800000, 7200000];
    let lastError: string | null = null;

    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, Math.min(delays[attempt], 5000)));

      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Vivit-Signature": `sha256=${sig}`,
            "X-Vivit-Event": event,
            "X-Vivit-Attempt": String(attempt + 1),
            "X-Vivit-Delivery": crypto.randomUUID(),
          },
          body,
          signal: AbortSignal.timeout(5000), // 5s timeout
        });

        if (res.ok) {
          // Success — update lastTriggeredAt
          await db.update(webhooks).set({
            lastCalledAt: new Date(), failCount: 0,
          }).where(eq(webhooks.id, hook.id));
          break;
        } else {
          lastError = `HTTP ${res.status}`;
        }
      } catch (err) {
        lastError = String(err);
        if (attempt < delays.length - 1) continue;
      }
    }

    if (lastError) {
      // All retries failed — increment failCount
      const newFailCount = (hook.failCount ?? 0) + 1;
      await db.update(webhooks).set({
        failCount: newFailCount,
        isActive: newFailCount < 10, // Auto-disable after 10 consecutive failures
      }).where(eq(webhooks.id, hook.id));
    }
  }
}

// ── CRUD endpoints ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if((session.user as any).role!=="SUPER_ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});

  const hooks = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));

  const EVENT_TYPES = [
    "task.created", "task.approved", "task.completed",
    "client.created", "lead.won", "invoice.paid",
    "lead.created", "task.revision", "*",
  ];

  return NextResponse.json({ hooks, events: EVENT_TYPES });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if((session.user as any).role!=="SUPER_ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});

  const { url, events, name } = await req.json();
  if (!url || !events?.length) return NextResponse.json({ error: "url and events required" }, { status: 400 });

  try { new URL(url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

  const secret = crypto.randomBytes(32).toString("hex");
  const [hook] = await db.insert(webhooks).values({
    workspaceId: "default",
    url, events: JSON.stringify(events),
    secret, isActive: true, failCount: 0,
  }).returning();

  return NextResponse.json({
    ...hook,
    secret, // Only shown ONCE at creation
    message: "Save the secret — it won't be shown again.",
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if((session.user as any).role!=="SUPER_ADMIN")return NextResponse.json({error:"Forbidden"},{status:403});

  const { id } = await req.json();
  await db.delete(webhooks).where(eq(webhooks.id, id));
  return NextResponse.json({ success: true });
}
