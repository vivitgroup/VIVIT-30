export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, whatsappMessages } from "@/lib/db";
import { and, eq } from "drizzle-orm";

const SEND_ROLES = ["SUPER_ADMIN", "ACCOUNT_MANAGER", "SALES", "ACCOUNTANT"];

function normalizePhone(raw: unknown) {
  let p = String(raw || "").replace(/\D/g, "");
  if (!p) throw new Error("Phone number is required");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = `20${p.slice(1)}`;
  if (p.length < 8 || p.length > 15) throw new Error("Invalid WhatsApp phone number");
  return p;
}

async function canAccessClient(role: string, userId: string, clientId?: string | null) {
  if (!clientId) return role === "SUPER_ADMIN" || role === "SALES";
  if (role === "SUPER_ADMIN" || role === "ACCOUNTANT" || role === "SALES") return true;
  if (role === "ACCOUNT_MANAGER") {
    const [row] = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, clientId), eq(clients.accountManagerId, userId))).limit(1);
    return !!row;
  }
  return false;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const phone = req.nextUrl.searchParams.get("phone");
  let directUrl: string | null = null;
  if (phone) {
    try { directUrl = `https://wa.me/${normalizePhone(phone)}`; } catch { directUrl = null; }
  }
  return NextResponse.json({
    configured: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
    directUrl,
    note: "Direct chat works without Cloud API. In-system sending requires WhatsApp Cloud API credentials.",
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;
  if (!session?.user || !role || !userId || !SEND_ROLES.includes(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const clientId = body.clientId ? String(body.clientId) : null;
  if (!(await canAccessClient(role, userId, clientId))) return NextResponse.json({ error: "Client access denied" }, { status: 403 });

  let to: string;
  try { to = normalizePhone(body.to); } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 400 }); }

  if (body.mode === "direct") {
    const text = String(body.message || "").slice(0, 3000);
    return NextResponse.json({ success: true, url: `https://wa.me/${to}${text ? `?text=${encodeURIComponent(text)}` : ""}` });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const version = process.env.META_GRAPH_VERSION || "v23.0";
  if (!token || !phoneId) return NextResponse.json({ error: "WhatsApp Cloud API is not configured in Vercel yet." }, { status: 503 });

  const templateName = String(body.templateName || "").trim();
  const languageCode = String(body.languageCode || "en_US").trim();
  const message = String(body.message || "").trim().slice(0, 4096);
  const useTemplate = !!templateName;
  if (!useTemplate && !message) return NextResponse.json({ error: "Message text is required" }, { status: 400 });

  const payload = useTemplate
    ? { messaging_product: "whatsapp", to, type: "template", template: { name: templateName, language: { code: languageCode } } }
    : { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: message } };

  let status = "FAILED", waMessageId: string | null = null, apiError = "";
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || data?.error) throw new Error(data?.error?.message || `WhatsApp API error ${response.status}`);
    waMessageId = data?.messages?.[0]?.id || null;
    status = "SENT";
  } catch (error: any) {
    apiError = String(error?.message || "WhatsApp send failed").slice(0, 1000);
  }

  await db.insert(whatsappMessages).values({
    to,
    template: useTemplate ? templateName : "TEXT",
    body: useTemplate ? `[template:${templateName}]` : message,
    status,
    waMessageId,
    clientId,
  } as any);

  if (status !== "SENT") return NextResponse.json({ error: apiError || "WhatsApp send failed" }, { status: 400 });
  return NextResponse.json({ success: true, messageId: waMessageId });
}
