export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, whatsappMessages, clients, contacts } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

// WhatsApp Cloud API sender (production: use Meta WhatsApp Business API)
async function sendWhatsAppMessage(to: string, template: string, body: string, clientId?: string): Promise<{success:boolean; messageId?:string}> {
  const token   = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  // Log to DB regardless (for audit)
  const [msg] = await db.insert(whatsappMessages).values({
    to, template, body, clientId: clientId ?? null,
    status: token && phoneId ? "SENT" : "SIMULATED",
  }).returning();

  if (token && phoneId) {
    // Real Meta WhatsApp Cloud API call
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to,
        type: "text", text: { body },
      }),
    });
    const data = await res.json();
    if (data.messages?.[0]?.id && msg) {
      await db.update(whatsappMessages).set({ waMessageId: data.messages[0].id, status: "SENT" }).where(eq(whatsappMessages.id, msg.id));
      return { success: true, messageId: data.messages[0].id };
    }
  }
  return { success: true, messageId: msg?.id };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Return templates + recent messages
  const recent = await db.select().from(whatsappMessages).orderBy(desc(whatsappMessages.createdAt)).limit(20);

  const templates = [
    { id:"monthly_report",   label:"📊 Monthly Performance Report",    body:"Hi {name}! Your {month} report is ready. ROAS: {roas}× | Leads: {leads} | Spend: ${spend}. Full report: {link}" },
    { id:"creative_review",  label:"🎨 Creative Ready for Review",      body:"Hi {name}, your creative for {campaign} is ready for review! Please approve: {link}" },
    { id:"invoice_reminder", label:"💳 Invoice Payment Reminder",       body:"Hi {name}, invoice #{inv_num} for ${amount} is due on {due_date}. Pay online: {link}" },
    { id:"lead_followup",    label:"🎯 Sales Follow-up",                body:"Hi {name}! Following up on our conversation about growing {company} with digital marketing. When's a good time to chat?" },
    { id:"campaign_alert",   label:"🚨 Campaign Performance Alert",     body:"⚠️ Alert: {campaign} ROAS dropped to {roas}×. We're optimizing now. Update within 24h." },
    { id:"proposal_sent",    label:"📋 Proposal Sent Notification",     body:"Hi {name}! We've sent your custom proposal for {package}. Review here: {link}. Valid for 30 days." },
    { id:"nps_request",      label:"⭐ NPS Satisfaction Survey",        body:"Hi {name}! Quick question — how satisfied are you with our service this month? Rate 0-10 here: {link}" },
    { id:"task_approved",    label:"✅ Creative Task Approved",         body:"Great news! Your {task_type} for {client} has been approved. Ready to post on {date}." },
  ];

  return NextResponse.json({ templates, recent, hasRealAPI: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, template, body, clientId } = await req.json();
  if (!to || !body) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const result = await sendWhatsAppMessage(to, template ?? "custom", body, clientId);
  return NextResponse.json(result);
}
