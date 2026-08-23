export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, approvalTokens, creativeTasks, clients, contacts } from "@/lib/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { canAccessClient } from "@/lib/client-access";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await req.json();
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const [task] = await db.select().from(creativeTasks).where(eq(creativeTasks.id, taskId));
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if(!(await canAccessClient(session,task.clientId,{write:true})))return NextResponse.json({error:"Forbidden"},{status:403});
  if(task.status!=="REVIEW")return NextResponse.json({error:"Task is not awaiting review"},{status:409});

  const [client] = await db.select().from(clients).where(eq(clients.id, task.clientId));
  const [contact] = await db.select().from(contacts).where(eq(contacts.clientId, task.clientId));

  // Generate secure token
  const token    = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 48);

  await db.insert(approvalTokens).values({
    taskId, clientId: task.clientId, token, action: "approve", expiresAt,
  });

  const approvalUrl = `${process.env.NEXTAUTH_URL}/approve/${token}`;

  // Send email if contact email available
  if (contact?.email && process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Vivit CRM <noreply@vivitcrm.com>",
        to: [contact.email],
        subject: `👀 Creative ready for your review: ${task.title}`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <div style="background:linear-gradient(135deg,#17345F,#244D87);color:white;padding:24px;border-radius:12px 12px 0 0">
              <h1 style="margin:0;font-size:20px">👀 Creative Ready for Review</h1>
            </div>
            <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px">
              <h2 style="color:#111">${task.title}</h2>
              <p style="color:#555">Hi ${contact?.name ?? "there"},</p>
              <p style="color:#555">${client?.companyName}'s creative is ready for your review. Please click below to approve or request changes — no login required.</p>
              ${task.fileUrl ? `<p style="margin:16px 0"><a href="${task.fileUrl}" style="color:#244D87;font-weight:600">📎 View the creative file →</a></p>` : ""}
              <div style="display:flex;gap:12px;margin-top:20px">
                <a href="${approvalUrl}" style="background:linear-gradient(135deg,#244D87,#00B4D8);color:white;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">Review & Approve →</a>
              </div>
              <p style="color:#999;font-size:12px;margin-top:20px">Link expires in 48 hours · VIVIT GROUP</p>
            </div>
          </div>`,
      }),
    });
  }

  return NextResponse.json({ success: true, approvalUrl, token, expiresAt, emailSent: !!contact?.email });
}
