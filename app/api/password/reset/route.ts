export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db, users, passwordResetTokens, auditLogs } from "@/lib/db";
import { and, eq, gt, isNull } from "drizzle-orm";

export async function POST(req:NextRequest){
  const {token,password}=await req.json();
  if(!token||!password||String(password).length<8)return NextResponse.json({error:"Invalid token or password."},{status:400});
  const tokenHash=createHash("sha256").update(String(token)).digest("hex");
  const [record]=await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash,tokenHash),gt(passwordResetTokens.expiresAt,new Date()),isNull(passwordResetTokens.usedAt))).limit(1);
  if(!record)return NextResponse.json({error:"This reset link is invalid or expired."},{status:400});
  await db.transaction(async tx=>{
    await tx.update(users).set({password:await bcrypt.hash(password,12),updatedAt:new Date()}).where(eq(users.id,record.userId));
    await tx.update(passwordResetTokens).set({usedAt:new Date()}).where(eq(passwordResetTokens.id,record.id));
    await tx.insert(auditLogs).values({userId:record.userId,action:"password_changed",entity:"users",entityId:record.userId,newValues:"{}"});
  });
  return NextResponse.json({success:true});
}
