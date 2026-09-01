export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, users, workspaces, notifications, auditLogs, emailVerificationCodes, sql } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {consumeAuthRateLimit} from "@/lib/auth-abuse";

type SignupResult="CREATED"|"EMAIL_ALREADY_REGISTERED"|"INVALID_OTP"|"WORKSPACE_UNAVAILABLE";

export async function POST(req:NextRequest){
  try{
    const{name,email,password,requestedRole,approvalNote,otp}=await req.json(),otpRequired=Boolean(process.env.RESEND_API_KEY);
    if(!name||!email||!password||!requestedRole||(otpRequired&&!otp))return NextResponse.json({error:"All fields required"},{status:400});
    const normalizedEmail=String(email).trim().toLowerCase();
    if(!/^[a-z0-9._%+-]+@gmail\.com$/i.test(normalizedEmail))return NextResponse.json({error:"Please use a valid Gmail address"},{status:400});
    if(String(password).length<12||String(password).length>128)return NextResponse.json({error:"Password must be 12–128 characters"},{status:400});
    if(requestedRole!=="CLIENT")return NextResponse.json({error:"Employee roles require Super Admin assignment"},{status:403});
    const allowed=await consumeAuthRateLimit({action:"security_signup_attempt",headers:req.headers,email:normalizedEmail,windowMs:15*60_000,maxPerIp:25,maxPerEmail:8});
    if(!allowed)return NextResponse.json({error:"Too many signup attempts. Please try again later."},{status:429,headers:{"Retry-After":"900","Cache-Control":"no-store"}});
    const hashedPw=await bcrypt.hash(String(password),12),safeName=String(name).trim().slice(0,120);
    const result:SignupResult=await db.transaction(async tx=>{
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`signup:${normalizedEmail}`}))`);
      const [already]=await tx.select({id:users.id}).from(users).where(eq(users.email,normalizedEmail)).limit(1);
      if(already)return "EMAIL_ALREADY_REGISTERED";
      if(otpRequired){
        const [verification]=await tx.select().from(emailVerificationCodes).where(and(eq(emailVerificationCodes.email,normalizedEmail),gt(emailVerificationCodes.expiresAt,new Date()))).limit(1);
        if(!verification||verification.attempts>=5)return "INVALID_OTP";
        const otpOk=await bcrypt.compare(String(otp),verification.codeHash);
        if(!otpOk){
          await tx.update(emailVerificationCodes).set({attempts:verification.attempts+1}).where(and(eq(emailVerificationCodes.id,verification.id),eq(emailVerificationCodes.attempts,verification.attempts)));
          return "INVALID_OTP";
        }
      }
      const workspaceRows=await tx.select({id:workspaces.id}).from(workspaces).limit(2);
      if(workspaceRows.length!==1)return "WORKSPACE_UNAVAILABLE";
      const workspaceId=workspaceRows[0].id;
      const[created]=await tx.insert(users).values({workspaceId,name:safeName,email:normalizedEmail,password:hashedPw,role:"CLIENT",requestedRole:"CLIENT",approvalStatus:"PENDING",approvalNote:String(approvalNote??"").slice(0,500)||null,isWorkspaceOwner:false,isActive:false}).returning({id:users.id});
      const admins=await tx.select({id:users.id}).from(users).where(and(eq(users.workspaceId,workspaceId),eq(users.role,"SUPER_ADMIN"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED")));
      if(admins.length)await tx.insert(notifications).values(admins.map(a=>({userId:a.id,type:"ACCOUNT_REQUEST",title:"New account request",message:`${safeName} requested CLIENT access.`,priority:"high",link:"/dashboard/team"})));
      await tx.insert(auditLogs).values({workspaceId,userId:created.id,action:"account_requested",entity:"users",entityId:created.id,newValues:JSON.stringify({requestedRole:"CLIENT"})});
      if(otpRequired)await tx.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email,normalizedEmail));
      return "CREATED";
    });
    if(result==="INVALID_OTP")return NextResponse.json({error:"Invalid or expired verification code"},{status:400,headers:{"Cache-Control":"no-store"}});
    if(result==="WORKSPACE_UNAVAILABLE")return NextResponse.json({error:"Workspace assignment requires an administrator invitation"},{status:409});
    if(result==="EMAIL_ALREADY_REGISTERED")return NextResponse.json({error:"Unable to create account with these details. Please sign in or contact an administrator."},{status:400,headers:{"Cache-Control":"no-store"}});
    return NextResponse.json({success:true,message:"Your request was sent to the Super Admin for approval."},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error:unknown){
    console.error("Signup error:",error instanceof Error?error.name:"signup_failure");
    return NextResponse.json({error:"Failed to create account. Please try again."},{status:500,headers:{"Cache-Control":"no-store"}});
  }
}
