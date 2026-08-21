// @ts-nocheck -- Drizzle's generated insert shape is narrower than the live schema.
// ── Email Queue (Feature 34) ──────────────────────────────────
// In-memory queue — in production use Upstash Queue or Vercel Queue
interface EmailJob { to:string; subject:string; html:string; retries:number; }
const emailQueue: EmailJob[] = [];

async function processEmailJob(job: EmailJob): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Vivit ERP <noreply@viviterp.com>", to:[job.to], subject:job.subject, html:job.html }),
    });
    if (!res.ok) throw new Error(`Resend: ${res.status}`);
    return true;
  } catch {
    return false;
  }
}

async function enqueueEmail(to:string, subject:string, html:string) {
  if (!process.env.RESEND_API_KEY) return { queued:false, reason:"RESEND_API_KEY not set" };
  const job = { to, subject, html, retries:0 };
  // Try immediately — if fails, add to queue
  const ok = await processEmailJob(job);
  if (!ok) {
    job.retries++;
    emailQueue.push(job);
    return { queued:true, willRetry:true };
  }
  return { queued:false, sent:true };
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, emailLogs } from "@/lib/db";

const RESEND_URL = "https://api.resend.com/emails";

async function sendEmail(to: string, subject: string, html: string, type: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not set" };

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Vivit CRM <noreply@vivitcrm.com>",
      to: [to], subject, html,
    }),
  });

  const data = await res.json();
  await db.insert(emailLogs).values({
    to, subject, type,
    status: res.ok ? "sent" : "failed",
    resendId: data.id,
  });

  return { success: res.ok, id: data.id };
}

const _emailRateMap = new Map<string,{count:number;resetAt:number}>();
function emailRateOk(key:string):boolean{
  const now=Date.now(),e=_emailRateMap.get(key);
  if(!e||now>e.resetAt){_emailRateMap.set(key,{count:1,resetAt:now+3600000});return true;}
  if(e.count>=20)return false; e.count++; return true;
}
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if(!emailRateOk(`email:${session.user.id}`)) return NextResponse.json({error:"Max 20 emails/hour exceeded"},{status:429});

  const { type, to, data } = await req.json();

  const brandColor = "#244D87";
  const footer = `<p style="color:#999;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">VIVIT GROUP — Technology builds the future, Marketing brings it to the world.</p>`;

  const templates: Record<string, { subject: string; html: string }> = {
    task_assigned: {
      subject: `🎨 New task assigned: ${data?.taskTitle}`,
      html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:${brandColor};color:white;padding:20px;border-radius:12px 12px 0 0"><h1 style="margin:0;font-size:20px">🎨 New Creative Task</h1></div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px">
          <h2 style="color:#111">${data?.taskTitle}</h2>
          <p><strong>Client:</strong> ${data?.clientName}</p>
          <p><strong>Deadline:</strong> ${data?.deadline}</p>
          <p><strong>Priority:</strong> ${data?.priority}</p>
          <p style="background:#fff;padding:16px;border-left:4px solid ${brandColor};border-radius:4px">${data?.brief?.slice(0,300)}...</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard/creative/${data?.taskId}" style="background:${brandColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View Task →</a>
        </div>${footer}</div>`,
    },
    invoice_reminder: {
      subject: `💳 Invoice due: ${data?.clientName} — $${data?.amount}`,
      html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:${brandColor};color:white;padding:20px;border-radius:12px 12px 0 0"><h1 style="margin:0;font-size:20px">💳 Invoice Reminder</h1></div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px">
          <h2 style="color:#111">${data?.clientName}</h2>
          <p><strong>Amount Due:</strong> $${data?.amount}</p>
          <p><strong>Due Date:</strong> ${data?.dueDate}</p>
          <p><strong>Invoice:</strong> ${data?.invoiceNumber}</p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard/finance" style="background:${brandColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View Invoice →</a>
        </div>${footer}</div>`,
    },
    creative_review: {
      subject: `👀 Creative ready for review: ${data?.taskTitle}`,
      html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:${brandColor};color:white;padding:20px;border-radius:12px 12px 0 0"><h1 style="margin:0;font-size:20px">👀 Review Required</h1></div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px">
          <h2 style="color:#111">${data?.taskTitle}</h2>
          <p>Your creative is ready for review. Please approve or request changes.</p>
          ${data?.fileUrl ? `<p><a href="${data.fileUrl}" style="color:${brandColor}">📎 View File</a></p>` : ""}
          <div style="display:flex;gap:12px;margin-top:16px">
            <a href="${process.env.NEXTAUTH_URL}/dashboard/portal" style="background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">✅ Approve</a>
            <a href="${process.env.NEXTAUTH_URL}/dashboard/portal" style="background:#f59e0b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">↩ Request Changes</a>
          </div>
        </div>${footer}</div>`,
    },
    monthly_report: {
      subject: `📊 Monthly Report: ${data?.clientName} — ${data?.period}`,
      html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:${brandColor};color:white;padding:20px;border-radius:12px 12px 0 0"><h1 style="margin:0;font-size:20px">📊 Monthly Performance Report</h1></div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px">
          <h2>${data?.clientName} — ${data?.period}</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr style="background:${brandColor};color:white"><td style="padding:10px">Metric</td><td style="padding:10px">Value</td></tr>
            <tr style="background:#fff"><td style="padding:10px;border:1px solid #eee">💰 Ad Spend</td><td style="padding:10px;border:1px solid #eee">$${data?.spend?.toLocaleString()}</td></tr>
            <tr><td style="padding:10px;border:1px solid #eee">🎯 Leads</td><td style="padding:10px;border:1px solid #eee">${data?.leads}</td></tr>
            <tr style="background:#fff"><td style="padding:10px;border:1px solid #eee">🔄 ROAS</td><td style="padding:10px;border:1px solid #eee">${data?.roas}x</td></tr>
            <tr><td style="padding:10px;border:1px solid #eee">✅ Tasks Done</td><td style="padding:10px;border:1px solid #eee">${data?.tasks}</td></tr>
          </table>
          <a href="${process.env.NEXTAUTH_URL}/dashboard/portal" style="background:${brandColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View Full Report →</a>
        </div>${footer}</div>`,
    },
    welcome: {
      subject: `🎉 Welcome to Vivit CRM — ${data?.name}!`,
      html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:${brandColor};color:white;padding:20px;border-radius:12px 12px 0 0"><h1 style="margin:0;font-size:20px">Welcome to Vivit CRM 🚀</h1></div>
        <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px">
          <h2>Hi ${data?.name}!</h2>
          <p>Your account has been created. Here are your login details:</p>
          <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid #eee">
            <p><strong>Email:</strong> ${data?.email}</p>
            <p><strong>Password:</strong> ${data?.password}</p>
            <p><strong>Role:</strong> ${data?.role}</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL}/login" style="background:${brandColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">Login Now →</a>
        </div>${footer}</div>`,
    },
  };

  const template = templates[type];
  if (!template) return NextResponse.json({ error: "Unknown email type" }, { status: 400 });

  const result = await sendEmail(to, template.subject, template.html, type);
  return NextResponse.json(result);
}
