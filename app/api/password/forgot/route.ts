export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {createHash,randomBytes} from "crypto";
import {db,users,passwordResetTokens,auditLogs,sql} from "@/lib/db";
import {eq,and,gte,isNull} from "drizzle-orm";
import {escapeHtml,safeHttpUrl} from "@/lib/approval-security";

export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null),email=String(body?.email??"").trim().toLowerCase(),generic={success:true,message:"If this email exists, a reset link has been sent."},response=()=>NextResponse.json(generic,{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 if(!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return response();
 const base=safeHttpUrl(process.env.NEXTAUTH_URL||process.env.AUTH_URL||"");
 if(!base||!process.env.RESEND_API_KEY){if(process.env.NODE_ENV!=="production")console.warn("Password reset email is not configured");return response()}
 const token=randomBytes(32).toString("hex"),tokenHash=createHash("sha256").update(token).digest("hex"),expiresAt=new Date(Date.now()+30*60*1000);
 const issued=await db.transaction(async tx=>{
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`password-reset:${email}`}))`);
  const [user]=await tx.select({id:users.id,email:users.email,name:users.name,isActive:users.isActive,approvalStatus:users.approvalStatus,workspaceId:users.workspaceId}).from(users).where(eq(users.email,email)).limit(1);
  if(!user?.isActive||user.approvalStatus!=="APPROVED")return null;
  const cooldown=new Date(Date.now()-2*60*1000),[recent]=await tx.select({id:passwordResetTokens.id}).from(passwordResetTokens).where(and(eq(passwordResetTokens.userId,user.id),gte(passwordResetTokens.createdAt,cooldown),isNull(passwordResetTokens.usedAt))).limit(1);
  if(recent)return null;
  await tx.delete(passwordResetTokens).where(and(eq(passwordResetTokens.userId,user.id),isNull(passwordResetTokens.usedAt)));
  const [created]=await tx.insert(passwordResetTokens).values({userId:user.id,tokenHash,expiresAt}).returning({id:passwordResetTokens.id});
  await tx.insert(auditLogs).values({workspaceId:user.workspaceId,userId:user.id,action:"password_reset_requested",entity:"password_reset_tokens",entityId:created.id,newValues:JSON.stringify({expiresAt:expiresAt.toISOString()})});
  return user;
 });
 if(!issued)return response();
 const resetUrl=`${base.replace(/\/$/,"")}/reset-password?token=${token}`,html=`<h2>Reset your password</h2><p>Hello ${escapeHtml(issued.name)},</p><p>This link expires in 30 minutes.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p>`;
 const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`password-reset/${issued.id}/${tokenHash.slice(0,24)}`},body:JSON.stringify({from:process.env.EMAIL_FROM||"VIVIT ERP <noreply@vivitgroup.com>",to:[issued.email],subject:"Reset your VIVIT ERP password",html}),signal:AbortSignal.timeout(8000)}).catch(()=>null);
 if(!sent?.ok)await db.delete(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash,tokenHash),isNull(passwordResetTokens.usedAt))).catch(()=>{});
 return response();
}
