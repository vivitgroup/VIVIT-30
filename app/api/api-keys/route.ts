export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, apiKeys } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

type AuthSession={user?:{role?:string|null;workspaceId?:string|null}|null}|null;
function canManageKeys(session:AuthSession){return !!session?.user&&session.user.role==="SUPER_ADMIN";}
function workspaceOf(session:AuthSession){const workspaceId=String(session?.user?.workspaceId||"").trim();return workspaceId||null;}
const ALLOWED_PERMISSIONS=new Set(["read","read_write","admin"]);

export async function GET(){
  const session=await auth();if(!canManageKeys(session))return NextResponse.json({error:"Forbidden"},{status:403});
  const workspaceId=workspaceOf(session);if(!workspaceId)return NextResponse.json({error:"Workspace context is required"},{status:403});
  const keys=await db.select({id:apiKeys.id,name:apiKeys.name,keyPrefix:apiKeys.keyPrefix,permissions:apiKeys.permissions,lastUsedAt:apiKeys.lastUsedAt,isActive:apiKeys.isActive,createdAt:apiKeys.createdAt}).from(apiKeys).where(eq(apiKeys.workspaceId,workspaceId));
  return NextResponse.json({keys},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:NextRequest){
  const session=await auth();if(!canManageKeys(session))return NextResponse.json({error:"Forbidden"},{status:403});
  const workspaceId=workspaceOf(session);if(!workspaceId)return NextResponse.json({error:"Workspace context is required"},{status:403});
  const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Invalid JSON body"},{status:400});
  const name=String(body.name||"").trim().slice(0,100),permissions=String(body.permissions||"read");
  if(!name)return NextResponse.json({error:"name required"},{status:400});
  if(!ALLOWED_PERMISSIONS.has(permissions))return NextResponse.json({error:"Invalid permissions"},{status:400});
  const rawKey=`vvt_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash=crypto.createHash("sha256").update(rawKey).digest("hex"),keyPrefix=rawKey.slice(0,12);
  const [key]=await db.insert(apiKeys).values({workspaceId,userId:session!.user!.id!,name,keyHash,keyPrefix,permissions}).returning({id:apiKeys.id,name:apiKeys.name});
  return NextResponse.json({id:key.id,name:key.name,key:rawKey,message:"Store this key securely. It will NOT be shown again."},{headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(req:NextRequest){
  const session=await auth();if(!canManageKeys(session))return NextResponse.json({error:"Forbidden"},{status:403});
  const workspaceId=workspaceOf(session);if(!workspaceId)return NextResponse.json({error:"Workspace context is required"},{status:403});
  const body=await req.json().catch(()=>null);const id=String(body?.id||"");if(!id)return NextResponse.json({error:"id required"},{status:400});
  const rows=await db.update(apiKeys).set({isActive:false}).where(and(eq(apiKeys.id,id),eq(apiKeys.workspaceId,workspaceId))).returning({id:apiKeys.id});
  if(!rows.length)return NextResponse.json({error:"API key not found"},{status:404});
  return NextResponse.json({success:true},{headers:{"Cache-Control":"private, no-store"}});
}
