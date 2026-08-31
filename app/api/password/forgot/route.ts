export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {createHash,randomBytes} from "crypto";
import {db,users,passwordResetTokens,auditLogs,sql} from "@/lib/db";
import {eq,and,gte,isNull} from "drizzle-orm";
import {escapeHtml,safeHttpUrl} from "@/lib/approval-security";
import {consumeAuthRateLimit} from "@/lib/auth-abuse";

export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null),email=String(body?.email??"").trim().toLowerCase(),generic={success:true,message:"If this email exists, a reset link has been sent."},response=()=>NextResponse.json(generic,{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 if(!email||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return response();
 const allowed=await consumeAuthRateLimit({action:"security_password_reset_request",headers:req.headers,email,windowMs:30*60_000,maxPerIp:20,maxPerEmail:4});
 if(!allowed)return response();
 const [user]=await db.select({id:users.id,email:users.email,name:users.name,isActive:users.isActive,workspaceId:users.workspaceId}).from(users).where(eq(users.email,email)).limit(1);
 if(!user?.isActive)return response();
 const token=randomBytes(32).toString("hex"),tokenHash=createHash("sha256").update(token).digest("hex"),expiresAt=new Date(Date.now()+30*60*1000),cooldown=new Date(Date.now()-2*60*1000);
 const issued=await db.transaction(async tx=>{
   await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`password-reset:${user.id}`}))`);
   const [recent]=await tx.select({id:passwordResetTokens.id}).from(passwordResetTokens).where(and(eq(passwordResetTokens.userId,user.id),gte(passwordResetTokens.createdAt,cooldown),isNull(passwordResetTokens.usedAt))).limit(1);
   if(recent)return false;
   await tx.insert(passwordResetTokens).values({userId:user.id,tokenHash,expiresAt});
   await tx.insert(auditLogs).values({workspaceId:user.workspaceId,userId:user.id,action:"password_reset_requested",entity:"users",entityId:user.id,newValues:"{}"});
   return true;
 });
 if(!issued)return response();
 const candidate=process.env.NEXTAUTH_URL||req.nextUrl.origin,base=safeHttpUrl(candidate);
 if(base&&process.env.RESEND_API_KEY){
   const resetUrl=`${base.replace(/\/$/,"")}/reset-password?token=${token}`,html=`<h2>Reset your password</h2><p>Hello ${escapeHtml(user.name)},</p><p>This link expires in 30 minutes.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p>`;
   const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.EMAIL_FROM||"VIVIT ERP <onboarding@resend.dev>",to:[user.email],subject:"Reset your VIVIT ERP password",html}),signal:AbortSignal.timeout(8000)}).then(r=>r.ok).catch(()=>false);
   if(!sent)await db.delete(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash,tokenHash),isNull(passwordResetTokens.usedAt)));
 }else if(process.env.NODE_ENV!=="production"&&base)console.info("Password reset requested for development user",user.id);
 return response();
}
