export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {db,users,emailVerificationCodes,sql} from "@/lib/db";
import {eq,and,gt} from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {consumeAuthRateLimit} from "@/lib/auth-abuse";

export async function GET(){return NextResponse.json({configured:Boolean(process.env.RESEND_API_KEY)},{headers:{"Cache-Control":"no-store"}})}

export async function POST(req:NextRequest){
  const generic=()=>NextResponse.json({success:true,message:"If this address can be registered, a verification code has been sent."},{headers:{"Cache-Control":"private, no-store"}});
  try{
    const body=await req.json().catch(()=>null),normalizedEmail=String(body?.email||"").trim().toLowerCase();
    if(!/^[a-z0-9._%+-]+@gmail\.com$/i.test(normalizedEmail))return NextResponse.json({error:"Please use a valid Gmail address"},{status:400});
    if(!process.env.RESEND_API_KEY)return NextResponse.json({error:"Email verification is being configured. Please contact the Super Admin."},{status:503});
    const burstAllowed=await consumeAuthRateLimit({action:"security_signup_otp_burst",headers:req.headers,email:normalizedEmail,windowMs:60_000,maxPerIp:8,maxPerEmail:1});
    if(!burstAllowed)return NextResponse.json({error:"Please wait before requesting another code"},{status:429,headers:{"Retry-After":"60","Cache-Control":"no-store"}});
    const hourlyAllowed=await consumeAuthRateLimit({action:"security_signup_otp_hourly",headers:req.headers,email:normalizedEmail,windowMs:60*60_000,maxPerIp:40,maxPerEmail:5});
    if(!hourlyAllowed)return NextResponse.json({error:"Too many verification requests. Please try again later."},{status:429,headers:{"Retry-After":"3600","Cache-Control":"no-store"}});
    const cooldown=new Date(Date.now()-60_000);
    const [recentCode]=await db.select({email:emailVerificationCodes.email}).from(emailVerificationCodes).where(and(eq(emailVerificationCodes.email,normalizedEmail),gt(emailVerificationCodes.createdAt,cooldown))).limit(1);
    if(recentCode)return NextResponse.json({error:"Please wait before requesting another code"},{status:429,headers:{"Retry-After":"60","Cache-Control":"no-store"}});
    if((await db.select({id:users.id}).from(users).where(eq(users.email,normalizedEmail)).limit(1)).length)return generic();
    const code=String(crypto.randomInt(100000,1000000)),codeHash=await bcrypt.hash(code,10),expiresAt=new Date(Date.now()+10*60*1000),lockKey=`signup-otp:${normalizedEmail}`;
    await db.transaction(async tx=>{
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
      const [existing]=await tx.select({id:users.id}).from(users).where(eq(users.email,normalizedEmail)).limit(1);
      if(existing)return;
      const txCooldown=new Date(Date.now()-60_000);
      const [recent]=await tx.select({email:emailVerificationCodes.email}).from(emailVerificationCodes).where(and(eq(emailVerificationCodes.email,normalizedEmail),gt(emailVerificationCodes.createdAt,txCooldown))).limit(1);
      if(recent)throw new Error("OTP_COOLDOWN");
      await tx.insert(emailVerificationCodes).values({email:normalizedEmail,codeHash,expiresAt,attempts:0}).onConflictDoUpdate({target:emailVerificationCodes.email,set:{codeHash,expiresAt,attempts:0,createdAt:new Date()}});
    }).catch(error=>{if(error instanceof Error&&error.message==="OTP_COOLDOWN")return;throw error});
    const [issued]=await db.select({codeHash:emailVerificationCodes.codeHash}).from(emailVerificationCodes).where(and(eq(emailVerificationCodes.email,normalizedEmail),eq(emailVerificationCodes.codeHash,codeHash))).limit(1);
    if(!issued)return NextResponse.json({error:"Please wait before requesting another code"},{status:429,headers:{"Retry-After":"60","Cache-Control":"no-store"}});
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.OTP_FROM_EMAIL||"VIVIT ERP <access@vivitgroup.com>",to:[normalizedEmail],subject:"Your VIVIT ERP verification code",html:`<div style="font-family:Arial;padding:28px;color:#201F20"><h2>VIVIT ERP</h2><p>Your verification code is:</p><div style="font-size:34px;font-weight:800;letter-spacing:8px">${code}</div><p>This code expires in 10 minutes. Never share it.</p></div>`}),signal:AbortSignal.timeout(8000)});
    if(!response.ok){await db.delete(emailVerificationCodes).where(and(eq(emailVerificationCodes.email,normalizedEmail),eq(emailVerificationCodes.codeHash,codeHash)));return NextResponse.json({error:"Could not send the verification email"},{status:502})}
    return generic();
  }catch(error){console.error("OTP error",error);return NextResponse.json({error:"Could not send verification code"},{status:500})}
}
