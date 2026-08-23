export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, users, emailVerificationCodes } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.RESEND_API_KEY) });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^[a-z0-9._%+-]+@gmail\.com$/i.test(normalizedEmail))
      return NextResponse.json({ error: "Please use a valid Gmail address" }, { status: 400 });
    if ((await db.select({id:users.id}).from(users).where(eq(users.email, normalizedEmail))).length)
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    if (!process.env.RESEND_API_KEY)
      return NextResponse.json({ error: "Email verification is being configured. Please contact the Super Admin." }, { status: 503 });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(emailVerificationCodes).values({email:normalizedEmail,codeHash,expiresAt,attempts:0} as any)
      .onConflictDoUpdate({target:emailVerificationCodes.email,set:{codeHash,expiresAt,attempts:0,createdAt:new Date()} as any});

    const response = await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{"Authorization":`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        from:process.env.OTP_FROM_EMAIL || "VIVIT ERP <access@vivitgroup.com>",
        to:[normalizedEmail],
        subject:"Your VIVIT ERP verification code",
        html:`<div style="font-family:Arial;padding:28px;color:#201F20"><h2 style="color:#9F1D25">VIVIT ERP</h2><p>Your verification code is:</p><div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#244D87">${code}</div><p style="color:#6b7280">This code expires in 10 minutes. Never share it with anyone.</p></div>`,
      }),
    });
    if (!response.ok) return NextResponse.json({ error:"Could not send the verification email" }, { status:502 });
    return NextResponse.json({success:true});
  } catch (error) {
    console.error("OTP error", error);
    return NextResponse.json({error:"Could not send verification code"},{status:500});
  }
}
