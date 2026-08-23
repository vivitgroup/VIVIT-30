// @ts-nocheck -- Drizzle's generated signup shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, users, workspaces, notifications, auditLogs, emailVerificationCodes } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, requestedRole, approvalNote, otp } = await req.json().catch(() => ({}));
    const normalizedName = String(name || "").trim().slice(0, 120);
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const otpRequired = Boolean(process.env.RESEND_API_KEY);
    if (!normalizedName || !normalizedEmail || !password || !requestedRole || (otpRequired && !otp)) {
      return NextResponse.json({ error: "All required fields must be completed" }, { status: 400 });
    }
    if (!validEmail(normalizedEmail)) return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    if (String(password).length < 8 || String(password).length > 128) return NextResponse.json({ error: "Password must be between 8 and 128 characters" }, { status: 400 });
    if (requestedRole !== "CLIENT") return NextResponse.json({ error: "Employee roles require Super Admin assignment" }, { status: 403 });

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing.length > 0) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    if (otpRequired) {
      const [verification] = await db.select().from(emailVerificationCodes).where(and(
        eq(emailVerificationCodes.email, normalizedEmail),
        gt(emailVerificationCodes.expiresAt, new Date()),
      )).limit(1);
      if (!verification || verification.attempts >= 5 || !(await bcrypt.compare(String(otp), verification.codeHash))) {
        if (verification) await db.update(emailVerificationCodes).set({ attempts: verification.attempts + 1 }).where(eq(emailVerificationCodes.id, verification.id));
        return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
      }
    }

    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.id, "default")).limit(1);
    if (!workspace) return NextResponse.json({ error: "Workspace is not configured" }, { status: 503 });
    const hashedPw = await bcrypt.hash(String(password), 12);
    const [created] = await db.insert(users).values({
      workspaceId: workspace.id,
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPw,
      role: "CLIENT" as any,
      requestedRole: "CLIENT" as any,
      approvalStatus: "PENDING",
      approvalNote: String(approvalNote || "").trim().slice(0, 500) || null,
      isWorkspaceOwner: false,
      isActive: false,
    }).returning({ id: users.id });

    const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.workspaceId, workspace.id), eq(users.role, "SUPER_ADMIN"), eq(users.isActive, true)));
    if (admins.length) {
      await db.insert(notifications).values(admins.map((admin) => ({
        userId: admin.id,
        type: "ACCOUNT_REQUEST",
        title: "New account request",
        message: `${normalizedName} requested client access.`,
        priority: "high",
        link: "/dashboard/team",
      })));
    }
    await db.insert(auditLogs).values({ userId: created.id, action: "account_requested", entity: "users", entityId: created.id, newValues: JSON.stringify({ requestedRole: "CLIENT" }) });
    if (otpRequired) await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, normalizedEmail));

    return NextResponse.json({ success: true, message: "Your request was sent to the Super Admin for approval." });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }
}
