export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, users, workspaces, notifications, auditLogs, emailVerificationCodes, sql } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

const strongPassword=(value:string)=>value.length>=12&&value.length<=128&&/[a-z]/.test(value)&&/[A-Z]/.test(value)&&/\d/.test(value)&&/[^A-Za-z0-9]/.test(value);

export async function POST(req:NextRequest){
  try{
    const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Invalid JSON body"},{status:400});
    const{name,email,password,requestedRole,approvalNote,otp}=body,otpRequired=Boolean(process.env.RESEND_API_KEY);
    if(!name||!email||!password||!requestedRole||(otpRequired&&!otp))return NextResponse.json({error:"All fields required"},{status:400});
    const normalizedEmail=String(email).trim().toLowerCase(),passwordValue=String(password),otpValue=String(otp||"");
    if(!/^[a-z0-9._%+-]+@gmail\.com$/i.test(normalizedEmail))return NextResponse.json({error:"Please use a valid Gmail address"},{status:400});
    if(!strongPassword(passwordValue))return NextResponse.json({error:"Password must be 12–128 characters and include uppercase, lowercase, number, and symbol"},{status:400});
    if(requestedRole!=="CLIENT")return NextResponse.json({error:"Employee roles require Super Admin assignment"},{status:403});
    const workspaceRows=await db.select({id:workspaces.id}).from(workspaces).limit(2);
    if(workspaceRows.length!==1)return NextResponse.json({error:"Workspace assignment requires an administrator invitation"},{status:409});
    const workspaceId=workspaceRows[0].id,hashedPw=await bcrypt.hash(passwordValue,12),safeName=String(name).trim().slice(0,120);
    if(!safeName)return NextResponse.json({error:"Name is required"},{status:400});
    await db.transaction(async tx=>{
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`signup:${normalizedEmail}`}))`);
      const [already]=await tx.select({id:users.id}).from(users).where(eq(users.email,normalizedEmail)).limit(1);
      if(already)throw new Error("EMAIL_ALREADY_REGISTERED");
      if(otpRequired){
        const [verification]=await tx.select().from(emailVerificationCodes).where(and(eq(emailVerificationCodes.email,normalizedEmail),gt(emailVerificationCodes.expiresAt,new Date()))).limit(1);
        if(!verification||verification.attempts>=5)throw new Error("INVALID_OTP");
        if(!(await bcrypt.compare(otpValue,verification.codeHash))){
          await tx.update(emailVerificationCodes).set({attempts:verification.attempts+1}).where(and(eq(emailVerificationCodes.id,verification.id),eq(emailVerificationCodes.email,normalizedEmail)));
          throw new Error("INVALID_OTP");
        }
        const consumed=await tx.delete(emailVerificationCodes).where(and(eq(emailVerificationCodes.id,verification.id),eq(emailVerificationCodes.email,normalizedEmail))).returning({id:emailVerificationCodes.id});
        if(consumed.length!==1)throw new Error("INVALID_OTP");
      }
      const[created]=await tx.insert(users).values({workspaceId,name:safeName,email:normalizedEmail,password:hashedPw,role:"CLIENT",requestedRole:"CLIENT",approvalStatus:"PENDING",approvalNote:String(approvalNote||"").slice(0,500)||null,isWorkspaceOwner:false,isActive:false}).returning({id:users.id});
      const admins=await tx.select({id:users.id}).from(users).where(and(eq(users.workspaceId,workspaceId),eq(users.role,"SUPER_ADMIN"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED")));
      if(admins.length)await tx.insert(notifications).values(admins.map(a=>({userId:a.id,type:"ACCOUNT_REQUEST",title:"New account request",message:`${safeName} requested CLIENT access.`,priority:"high",link:"/dashboard/team"})));
      await tx.insert(auditLogs).values({workspaceId,userId:created.id,action:"account_requested",entity:"users",entityId:created.id,newValues:JSON.stringify({requestedRole:"CLIENT",emailVerified:otpRequired})});
    });
    return NextResponse.json({success:true,message:"Your request was sent to the Super Admin for approval."},{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error:unknown){
    if(error instanceof Error&&error.message==="EMAIL_ALREADY_REGISTERED")return NextResponse.json({error:"Email already registered"},{status:409});
    if(error instanceof Error&&error.message==="INVALID_OTP")return NextResponse.json({error:"Invalid or expired verification code"},{status:400});
    console.error("Signup error:",error instanceof Error?error.name:"signup_failure");
    return NextResponse.json({error:"Failed to create account. Please try again."},{status:500});
  }
}
