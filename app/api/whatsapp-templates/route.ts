// @ts-nocheck -- Drizzle's generated WhatsApp shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, whatsappMessages } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

async function sendWhatsAppMessage(to: string, template: string, body: string, clientId?: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    return { success: false, configured: false, error: "WhatsApp integration is not configured" };
  }

  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  const data = await res.json().catch(() => ({}));
  const waMessageId = data.messages?.[0]?.id as string | undefined;
  if (!res.ok || !waMessageId) {
    return { success: false, configured: true, error: "WhatsApp delivery request failed" };
  }

  const [msg] = await db.insert(whatsappMessages).values({
    to,
    template,
    body,
    clientId: clientId ?? null,
    status: "SENT",
    waMessageId,
  }).returning();

  return { success: true, configured: true, messageId: waMessageId, logId: msg?.id };
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "ACCOUNT_MANAGER"].includes(String((session.user as any).role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recent = await db.select().from(whatsappMessages).orderBy(desc(whatsappMessages.createdAt)).limit(20);
  const templates = [
    { id: "monthly_report", label: "📊 Monthly Performance Report", body: "Hi {name}! Your {month} report is ready. ROAS: {roas}× | Leads: {leads} | Spend: {spend} EGP. Full report: {link}" },
    { id: "creative_review", label: "🎨 Creative Ready for Review", body: "Hi {name}, your creative for {campaign} is ready for review! Please approve: {link}" },
    { id: "invoice_reminder", label: "💳 Invoice Payment Reminder", body: "Hi {name}, invoice #{inv_num} for {amount} EGP is due on {due_date}. Payment details: {link}" },
    { id: "lead_followup", label: "🎯 Sales Follow-up", body: "Hi {name}! Following up on our conversation about growing {company} with digital marketing. When's a good time to chat?" },
    { id: "campaign_alert", label: "🚨 Campaign Performance Alert", body: "⚠️ Alert: {campaign} ROAS dropped to {roas}×. We're optimizing now. Update within 24h." },
    { id: "proposal_sent", label: "📋 Proposal Sent Notification", body: "Hi {name}! We've sent your custom proposal for {package}. Review here: {link}. Valid for 30 days." },
    { id: "nps_request", label: "⭐ NPS Satisfaction Survey", body: "Hi {name}! Quick question — how satisfied are you with our service this month? Rate 0-10 here: {link}" },
    { id: "task_approved", label: "✅ Creative Task Approved", body: "Great news! Your {task_type} for {client} has been approved. Ready to post on {date}." },
  ];

  return NextResponse.json({
    templates,
    recent,
    hasRealAPI: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "ACCOUNT_MANAGER"].includes(String((session.user as any).role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { to, template, body, clientId } = await req.json().catch(() => ({}));
  if (!to || !body) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const result = await sendWhatsAppMessage(String(to), String(template ?? "custom"), String(body), clientId ? String(clientId) : undefined);
  if (!result.success) {
    return NextResponse.json(result, { status: result.configured ? 502 : 503 });
  }
  return NextResponse.json(result);
}
