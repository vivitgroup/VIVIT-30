export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db, users, emailVerificationCodes } from "@/lib/db";
import { and, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.RESEND_API_KEY) });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}));
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!validEmail(normalizedEmail)) return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    if ((await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail))).length) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email verification is not configured. Please contact the Super Admin." }, { status: 503 });
    }

    const [recent] = await db.select({ createdAt: emailVerificationCodes.createdAt })
      .from(emailVerificationCodes)
      .where(and(eq(emailVerificationCodes.email, normalizedEmail), gt(emailVerificationCodes.createdAt, new Date(Date.now() - 60_000))))
      .limit(1);
    if (recent) return NextResponse.json({ error: "Please wait one minute before requesting another code." }, { status: 429 });

    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(emailVerificationCodes).values({ email: normalizedEmail, codeHash, expiresAt, attempts: 0 } as any)
      .onConflictDoUpdate({ target: emailVerificationCodes.email, set: { codeHash, expiresAt, attempts: 0, createdAt: new Date() } as any });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.OTP_FROM_EMAIL || "VIVIT ERP <access@vivitgroup.com>",
        to: [normalizedEmail],
        subject: "Your VIVIT ERP verification code",
        html: `<div style="font-family:Arial;padding:28px;color:#201F20"><h2 style="color:#9F1D25">VIVIT ERP</h2><p>Your verification code is:</p><div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#244D87">${code}</div><p style="color:#6b7280">This code expires in 10 minutes. Never share it with anyone.</p></div>`,
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "Could not send the verification email" }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OTP error", error);
    return NextResponse.json({ error: "Could not send verification code" }, { status: 500 });
  }
}
