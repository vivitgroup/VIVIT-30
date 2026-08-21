export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, users, workspaces, notifications, auditLogs } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, requestedRole, approvalNote } = await req.json();
    if (!name || !email || !password || !requestedRole)
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    if (password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    // Check email not already used
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase()));
    if (existing.length > 0)
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const allowedRoles = ["ACCOUNTANT","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","CLIENT"];
    if (!allowedRoles.includes(requestedRole))
      return NextResponse.json({ error: "Invalid requested role" }, { status: 400 });

    const hashedPw = await bcrypt.hash(password, 12);
    const workspaceRows = await db.select({ id: workspaces.id }).from(workspaces).limit(1);
    const workspaceId = workspaceRows[0]?.id ?? "default";

    const [created] = await db.insert(users).values({
      workspaceId, name, email: email.toLowerCase(),
      password: hashedPw, role: requestedRole as any, requestedRole: requestedRole as any,
      approvalStatus: "PENDING", approvalNote: approvalNote?.slice(0, 500) || null,
      isWorkspaceOwner: false, isActive: false,
    }).returning({id:users.id});
    const admins=await db.select({id:users.id}).from(users).where(eq(users.role,"SUPER_ADMIN"));
    if(admins.length) await db.insert(notifications).values(admins.map(a=>({userId:a.id,type:"ACCOUNT_REQUEST",title:"New account request",message:`${name} requested ${requestedRole.replace(/_/g," ")} access.`,priority:"high",link:"/dashboard/team"})));
    await db.insert(auditLogs).values({userId:created.id,action:"account_requested",entity:"users",entityId:created.id,newValues:JSON.stringify({requestedRole})});

    return NextResponse.json({ success: true, message: "Your request was sent to the Super Admin for approval." });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }
}
