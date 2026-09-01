import crypto from "node:crypto";
import {and,eq} from "drizzle-orm";
import {NextRequest} from "next/server";
import {apiKeys,auditLogs,db,sql} from "@/lib/db";
import {requestIp} from "@/lib/auth-abuse";

const READ_PERMISSIONS=new Set(["read","read_write","admin"]);
const KEY_RE=/^vvt_[a-f0-9]{64}$/;

type ApiKeyRow=typeof apiKeys.$inferSelect;

export async function authenticatePublicRead(req:NextRequest):Promise<ApiKeyRow|null>{
  const raw=String(req.headers.get("x-api-key")??req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"").trim();
  if(!KEY_RE.test(raw))return null;
  const keyHash=crypto.createHash("sha256").update(raw).digest("hex");
  const [key]=await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash,keyHash),eq(apiKeys.isActive,true))).limit(1);
  if(!key||!READ_PERMISSIONS.has(String(key.permissions||"")))return null;
  const allowed=await consumePublicApiLimit(req,key);
  if(!allowed)return null;
  await db.update(apiKeys).set({lastUsedAt:new Date()}).where(and(eq(apiKeys.id,key.id),eq(apiKeys.workspaceId,key.workspaceId),eq(apiKeys.isActive,true)));
  return key;
}

async function consumePublicApiLimit(req:NextRequest,key:ApiKeyRow):Promise<boolean>{
  const ip=requestIp(req.headers),bucket=Math.floor(Date.now()/60_000),keyLock=`public-api:key:${key.id}:${bucket}`,ipLock=`public-api:ip:${ip}:${bucket}`;
  return db.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${keyLock}))`);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ipLock}))`);
    const since=new Date(bucket*60_000);
    const keyRows=await tx.select({id:auditLogs.id}).from(auditLogs).where(and(eq(auditLogs.action,"security_public_api_request"),eq(auditLogs.workspaceId,key.workspaceId),eq(auditLogs.entity,"api_keys"),eq(auditLogs.entityId,key.id),sql`${auditLogs.createdAt} >= ${since}`)).limit(121);
    if(keyRows.length>=120)return false;
    const ipRows=await tx.select({id:auditLogs.id}).from(auditLogs).where(and(eq(auditLogs.action,"security_public_api_request"),eq(auditLogs.ipAddress,ip),sql`${auditLogs.createdAt} >= ${since}`)).limit(301);
    if(ipRows.length>=300)return false;
    await tx.insert(auditLogs).values({workspaceId:key.workspaceId,userId:key.userId,action:"security_public_api_request",entity:"api_keys",entityId:key.id,ipAddress:ip,newValues:JSON.stringify({bucket})});
    return true;
  });
}
