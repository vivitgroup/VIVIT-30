// @ts-nocheck -- Drizzle's generated signup shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, users, workspaces, notifications, auditLogs, emailVerificationCodes } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, requestedRole, approvalNote, otp } = await req.json();
    const otpRequired = Boolean(process.env.RESEND_API_KEY);
    if (!name || !email || !password || !requestedRole || (otpRequired && !otp))
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[a-z0-9._%+-]+@gmail\.com$/i.test(normalizedEmail))
      return NextResponse.json({ error: "Please use a valid Gmail address" }, { status: 400 });
    if (password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    // Check email not already used
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));
    if (existing.length > 0)
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    if (requestedRole !== "CLIENT")
      return NextResponse.json({ error: "Employee roles require Super Admin assignment" }, { status: 403 });

    if (otpRequired) {
      const [verification] = await db.select().from(emailVerificationCodes).where(and(
        eq(emailVerificationCodes.email, normalizedEmail),
        gt(emailVerificationCodes.expiresAt, new Date()),
      ));
      if (!verification || verification.attempts >= 5 || !(await bcrypt.compare(String(otp), verification.codeHash))) {
        if (verification) await db.update(emailVerificationCodes).set({ attempts: verification.attempts + 1 }).where(eq(emailVerificationCodes.id, verification.id));
        return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
      }
    }

    const hashedPw = await bcrypt.hash(password, 12);
    const workspaceRows = await db.select({ id: workspaces.id }).from(workspaces).limit(1);
    const workspaceId = workspaceRows[0]?.id ?? "default";

    const [created] = await db.insert(users).values({
      workspaceId, name, email: normalizedEmail,
      password: hashedPw, role: requestedRole as any, requestedRole: requestedRole as any,
      approvalStatus: "PENDING", approvalNote: approvalNote?.slice(0, 500) || null,
      isWorkspaceOwner: false, isActive: false,
    }).returning({id:users.id});
    const admins=await db.select({id:users.id}).from(users).where(eq(users.role,"SUPER_ADMIN"));
    if(admins.length) await db.insert(notifications).values(admins.map(a=>({userId:a.id,type:"ACCOUNT_REQUEST",title:"New account request",message:`${name} requested ${requestedRole.replace(/_/g," ")} access.`,priority:"high",link:"/dashboard/team"})));
    await db.insert(auditLogs).values({userId:created.id,action:"account_requested",entity:"users",entityId:created.id,newValues:JSON.stringify({requestedRole})});
    if (otpRequired) await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, normalizedEmail));

    return NextResponse.json({ success: true, message: "Your request was sent to the Super Admin for approval." });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }
}
