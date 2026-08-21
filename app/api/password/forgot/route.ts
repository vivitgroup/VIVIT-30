// @ts-nocheck -- Drizzle's generated auth shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db, users, passwordResetTokens, auditLogs } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req:NextRequest){
  const email=String((await req.json()).email??"").trim().toLowerCase();
  const generic={success:true,message:"If this email exists, a reset link has been sent."};
  if(!email)return NextResponse.json(generic);
  const [user]=await db.select({id:users.id,email:users.email,name:users.name,isActive:users.isActive}).from(users).where(eq(users.email,email)).limit(1);
  if(!user?.isActive)return NextResponse.json(generic);
  const token=randomBytes(32).toString("hex");
  const tokenHash=createHash("sha256").update(token).digest("hex");
  const expiresAt=new Date(Date.now()+30*60*1000);
  await db.insert(passwordResetTokens).values({userId:user.id,tokenHash,expiresAt});
  const base=process.env.NEXTAUTH_URL||req.nextUrl.origin;
  const resetUrl=`${base}/reset-password?token=${token}`;
  if(process.env.RESEND_API_KEY){
    await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.EMAIL_FROM||"VIVIT ERP <onboarding@resend.dev>",to:[user.email],subject:"Reset your VIVIT ERP password",html:`<h2>Reset your password</h2><p>Hello ${user.name},</p><p>This link expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`})}).catch(()=>null);
  } else if(process.env.NODE_ENV!=="production") console.info("Password reset URL:",resetUrl);
  await db.insert(auditLogs).values({userId:user.id,action:"password_reset_requested",entity:"users",entityId:user.id,newValues:JSON.stringify({email})});
  return NextResponse.json(generic);
}
