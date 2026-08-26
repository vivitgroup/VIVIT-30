export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, sql } from "@/lib/db";
import { VIVITO_ACADEMY_CONTEXT, VIVITO_SOURCE_NOTES_CONTEXT } from "@/lib/vivito/academy";
import { buildVivitoDecisionProtocol } from "@/lib/vivito/intelligence";

const W = "default";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const n = (v: unknown) => Number(v || 0);
const isArabic = (s: string) => /[\u0600-\u06ff]/.test(s);
const cairoDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
const dateLabel = (d: Date, arabic: boolean) =>
  new Intl.DateTimeFormat(arabic ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);

async function callClaude(prompt: string, system: string) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("provider-not-configured");
  const r = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3200,
      temperature: 0.18,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || "provider-failed");
  return d.content?.[0]?.text || "";
}

async function callGemini(prompt: string, system: string) {
  if (!process.env.GEMINI_API_KEY) throw new Error("provider-not-configured");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.18, maxOutputTokens: 3200 },
      }),
    }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || "provider-failed");
  return d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") || "";
}

async function generate(prompt: string, system: string) {
  if (process.env.GEMINI_API_KEY) return callGemini(prompt, system);
  if (process.env.ANTHROPIC_API_KEY) return callClaude(prompt, system);
  throw new Error("provider-not-configured");
}

async function clientScope(role: string, userId: string): Promise<any[]> {
  let rows: any;
  if (role === "SUPER_ADMIN") {
    rows = await db.execute(sql`select id,company_name,industry from clients where workspace_id=${W} and is_active=true order by company_name`);
  } else if (role === "ACCOUNT_MANAGER") {
    rows = await db.execute(sql`select id,company_name,industry from clients where workspace_id=${W} and is_active=true and account_manager_id=${userId} order by company_name`);
  } else if (role === "MEDIA_BUYER") {
    rows = await db.execute(sql`select id,company_name,industry from clients where workspace_id=${W} and is_active=true and media_buyer_id=${userId} order by company_name`);
  } else if (role === "CLIENT") {
    rows = await db.execute(sql`select id,company_name,industry from clients where workspace_id=${W} and is_active=true and user_id=${userId} limit 1`);
  } else return [];
  return Array.from(rows as any) as any[];
}

async function taskContext(role: string, userId: string, ids: string[]): Promise<any[]> {
  let rows: any;
  if (role === "CREATOR") {
    rows = await db.execute(sql`select t.id,t.title,t.status,t.priority,t.deadline,t.client_id,c.company_name from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${W} and t.archived_at is null and t.deleted_at is null and c.is_active=true and t.assigned_to_id=${userId} and t.status not in ('COMPLETED','REJECTED') order by t.deadline asc limit 120`);
  } else if (ids.length) {
    rows = await db.execute(sql`select t.id,t.title,t.status,t.priority,t.deadline,t.client_id,c.company_name from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${W} and t.archived_at is null and t.deleted_at is null and c.is_active=true and t.client_id in (${sql.join(ids.map((id) => sql`${id}`), sql`,`)}) and t.status not in ('COMPLETED','REJECTED') order by t.deadline asc limit 120`);
  } else return [];
  return Array.from(rows as any) as any[];
}

function taskAnswer(question: string, tasks: any[]) {
  const arabic = isArabic(question);
  const q = question.toLowerCase();
  const today = cairoDay(new Date());
  const todayTasks = tasks.filter((t) => cairoDay(new Date(t.deadline)) === today);
  const overdue = tasks.filter(
    (t) => new Date(t.deadline).getTime() < Date.now() && cairoDay(new Date(t.deadline)) !== today
  );
  const soon = [...tasks]
    .filter((t) => new Date(t.deadline) >= new Date())
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
    .slice(0, 10);
  const line = (t: any) =>
    `• ${t.title} — ${t.company_name || "Client"} — ${dateLabel(new Date(t.deadline), arabic)} — ${String(t.status).replace(/_/g, " ")}`;

  if (/today|النهارده|اليوم|انهاردة|انهارده/.test(q)) {
    if (!todayTasks.length) return arabic ? "مفيش تاسكات ديدلاينها النهارده." : "No tasks are due today.";
    return `${arabic ? "تاسكات النهارده" : "Tasks due today"} (${todayTasks.length}):\n${todayTasks.map(line).join("\n")}`;
  }
  if (/overdue|late|متأخر|متاخر|فات/.test(q)) {
    if (!overdue.length) return arabic ? "مفيش تاسكات متأخرة حاليًا." : "There are no overdue tasks right now.";
    return `${arabic ? "التاسكات المتأخرة" : "Overdue tasks"} (${overdue.length}):\n${overdue.slice(0, 12).map(line).join("\n")}`;
  }
  if (!tasks.length) return arabic ? "مفيش تاسكات نشطة حاليًا." : "There are no active tasks right now.";
  return `${arabic ? `عندك ${tasks.length} تاسك نشطة. أقرب الديدلاينز:` : `You have ${tasks.length} active tasks. Nearest deadlines:`}\n${soon.map(line).join("\n")}`;
}

const PLAYBOOK = `You are VIVITO — VIVIT Operating Intelligence. Behave like a combined CMO, growth strategist, performance media lead, business-development operator, creative director, content strategist, brand strategist, account director, sales advisor, analytics/CRO specialist and agency operator.

KNOWLEDGE GOVERNANCE:
- Academy content is curated professional guidance. Validated source notes below are higher-confidence, traceable summaries.
- Do not claim to have watched a specific video unless the supplied source note explicitly references it.
- Official platform guidance and ERP live data outrank creator opinions.
- Newer first-party platform guidance outranks old creator tactics when platform behavior may have changed.
- Never fabricate a benchmark, platform rule, live metric or client fact.
- Explicitly distinguish FACT, INFERENCE, HYPOTHESIS and RECOMMENDATION when ambiguity matters.
- When sources conflict, explain the trade-off and select the recommendation that best fits the evidence and business goal.

VIVITO ACADEMY:
${VIVITO_ACADEMY_CONTEXT}

VALIDATED SOURCE NOTES:
${VIVITO_SOURCE_NOTES_CONTEXT}

VIVIT OPERATING RULES:
- Messages campaign: primary result = messaging conversations reported by Meta; CPR = spend/messages.
- ATC campaign: primary result = Add to Cart; cost/ATC = spend/ATC.
- Sales campaign: primary result = purchases/orders; CPA = spend/purchases; ROAS = trusted purchase revenue/spend.
- Lead campaign: primary result = leads; CPL = spend/leads.
- Never use impressions/reach as the primary result for Messages, ATC, Sales or Lead campaigns.
- Never combine different result definitions into one Cost per Result.
- Finance is visible only when explicitly supplied in authorized context.

RESPONSE STANDARD:
1) Give the direct answer first.
2) Name the framework/result definition being used.
3) Use ERP live evidence for VIVIT/client performance questions.
4) Explain the commercial meaning, not only platform metrics.
5) Give prioritized next actions and state what evidence would change the recommendation.
6) For creative/design/content advice, give practitioner-level execution detail.
7) For analytics questions, verify measurement integrity before optimizing media.
8) Calibrate confidence to evidence quality; never fake certainty.
9) Consider cross-functional causes before blaming one department.
Use Egyptian Arabic when the user writes Arabic, while keeping standard English marketing terms where clearer.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const question = String(body.question || "").trim().slice(0, 1600);
  if (!question) return NextResponse.json({ error: "Ask a question first." }, { status: 400 });

  const role = String((session.user as any).role || "");
  const userId = String((session.user as any).id || "");
  const clients = await clientScope(role, userId);
  const ids = clients.map((c: any) => String(c.id));
  const tasks = await taskContext(role, userId, ids);

  if (role === "CLIENT") {
    return NextResponse.json(
      { answer: taskAnswer(question, tasks), sources: ["Creative Tasks"], mode: "tasks", intelligence: "VIVITO" },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  if (!["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER", "CREATOR"].includes(role)) {
    return NextResponse.json(
      { answer: taskAnswer(question, tasks), sources: ["Creative Tasks"], mode: "tasks", intelligence: "VIVITO" },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  let media: any[] = [];
  let billing: any[] = [];

  if (ids.length && ["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER"].includes(role)) {
    media = Array.from(
      (await db.execute(sql`select c.company_name,c.industry,ac.name campaign,ac.objective,ac.status,ac.reported_result_label,ac.reported_result_type,coalesce(sum(p.spend),0) spend,coalesce(sum(p.results),0) results,coalesce(sum(p.add_to_cart),0) atc,coalesce(sum(p.purchases),0) purchases,coalesce(sum(p.revenue),0) revenue,coalesce(sum(p.impressions),0) impressions,coalesce(sum(p.reach),0) reach,coalesce(sum(p.clicks),0) clicks from ad_campaigns ac join clients c on c.id=ac.client_id left join ad_performance_daily p on p.campaign_id=ac.id and p.date>=date_trunc('month',now()) and p.breakdown_type='TOTAL' and p.ad_set_id is null and p.ad_id is null where ac.client_id in (${sql.join(ids.map((id) => sql`${id}`), sql`,`)}) and ac.archived_at is null group by c.company_name,c.industry,ac.id,ac.name,ac.objective,ac.status,ac.reported_result_label,ac.reported_result_type order by spend desc limit 100`)) as any
    ) as any[];
  }

  if (role === "SUPER_ADMIN" && ids.length) {
    billing = Array.from(
      (await db.execute(sql`select c.company_name,p.amount_due,p.amount_paid,p.amount_remaining,p.payment_day,p.payment_status from client_payment_profiles p join clients c on c.id=p.client_id where p.client_id in (${sql.join(ids.map((id) => sql`${id}`), sql`,`)}) order by p.amount_remaining desc`)) as any
    ) as any[];
  }

  const enriched = media.map((x: any) => {
    const spend = n(x.spend), impressions = n(x.impressions), reach = n(x.reach), clicks = n(x.clicks);
    const results = n(x.results), purchases = n(x.purchases), atc = n(x.atc), revenue = n(x.revenue);
    const resultDefinition = String(x.reported_result_label || x.reported_result_type || x.objective || "Results");
    return {
      ...x,
      spend, impressions, reach, clicks, results, purchases, atc, revenue, resultDefinition,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      cpc: clicks ? spend / clicks : 0,
      cpm: impressions ? (spend / impressions) * 1000 : 0,
      costPerResult: results ? spend / results : 0,
      frequency: reach ? impressions / reach : 0,
      roas: spend ? revenue / spend : 0,
    };
  });

  const overdue = tasks.filter((t: any) => new Date(t.deadline).getTime() < Date.now());
  const mediaSpend = enriched.reduce((s, x) => s + n(x.spend), 0);
  const messages = enriched.filter((x) => /messag/i.test(x.resultDefinition)).reduce((s, x) => s + n(x.results), 0);
  const atc = enriched.reduce((s, x) => s + n(x.atc), 0);
  const purchases = enriched.reduce((s, x) => s + n(x.purchases), 0);
  const outstanding = billing.reduce((s, x) => s + n(x.amount_remaining), 0);
  const canSeeFinance = role === "SUPER_ADMIN";

  const context: any = {
    role,
    clients,
    activeClients: clients.length,
    activeTasks: tasks.length,
    overdueTasks: overdue.length,
    mediaSpendMTD: mediaSpend,
    messagesMTD: messages,
    addToCartMTD: atc,
    purchasesMTD: purchases,
    topTasks: tasks.slice(0, 25),
    campaigns: enriched.slice(0, 50),
  };
  if (canSeeFinance) {
    context.outstandingEGP = outstanding;
    context.billing = billing.slice(0, 20);
  }

  const decisionProtocol = buildVivitoDecisionProtocol(question, role);
  const system = `${PLAYBOOK}\n\n${decisionProtocol}\n\nUse only supplied ERP LIVE CONTEXT for current VIVIT facts and metrics.`;
  const prompt = `QUESTION:\n${question}\n\nERP LIVE CONTEXT:\n${JSON.stringify(context)}`;

  try {
    const answer = await generate(prompt, system);
    return NextResponse.json(
      {
        answer,
        sources: canSeeFinance
          ? ["VIVITO Academy", "Validated Source Notes", "Creative Tasks", "Media Campaigns", "Client Billing"]
          : ["VIVITO Academy", "Validated Source Notes", "Creative Tasks", "Media Campaigns"],
        mode: "advisor",
        intelligence: "VIVITO",
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    const base = taskAnswer(question, tasks);
    const extra = enriched.length
      ? `\n\nLive media snapshot: ${Math.round(mediaSpend).toLocaleString("en-EG")} EGP spend MTD · ${messages} messages · ${atc} ATC · ${purchases} purchases.`
      : "";
    return NextResponse.json(
      { answer: `${base}${extra}`, sources: ["Creative Tasks", "Media Campaigns"], mode: "erp-fallback", intelligence: "VIVITO" },
      { status: 200, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
