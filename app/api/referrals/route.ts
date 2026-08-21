export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, referrals } from "@/lib/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db.select().from(referrals).where(eq(referrals.referrerId, "default"));
  const stats = {
    total: all.length,
    pending: all.filter(r=>r.status==="PENDING").length,
    signedUp: all.filter(r=>r.status==="SIGNED_UP").length,
    converted: all.filter(r=>r.status==="CONVERTED").length,
  };
  return NextResponse.json({ referrals: all, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const code = crypto.randomBytes(4).toString("hex").toUpperCase();
  const [ref] = await db.insert(referrals).values({
    referrerId: "default", referredEmail: email.toLowerCase(),
    code, status: "PENDING", discountPct: 20,
  }).returning();

  const referralUrl = `${process.env.NEXTAUTH_URL}/signup?ref=${code}`;

  // Send invite email if Resend configured
  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.RESEND_API_KEY}`},
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "noreply@vivitcrm.com",
        to: [email],
        subject: "You've been invited to try Vivit CRM — 20% off!",
        html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="color:#244D87">You're invited to Vivit CRM 🚀</h1>
          <p>A marketing agency you know is using Vivit CRM and thinks it would be perfect for you too.</p>
          <p>Use code <strong style="color:#244D87;font-size:20px">${code}</strong> to get 20% off your first 3 months.</p>
          <a href="${referralUrl}" style="background:linear-gradient(135deg,#244D87,#00B4D8);color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;margin-top:16px">Start Free Trial →</a>
          <p style="color:#999;font-size:12px;margin-top:20px">VIVIT GROUP</p>
        </div>`,
      }),
    });
  }

  return NextResponse.json({ success:true, code, referralUrl, id: ref.id });
}
