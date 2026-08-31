import {createHash} from "node:crypto";
import {and,eq,gt} from "drizzle-orm";
import {auditLogs,db,sql} from "@/lib/db";

const clean=(value:string|null|undefined,max=128)=>String(value??"").trim().slice(0,max);

export function requestIp(headers:Headers):string{
  const forwarded=clean(headers.get("x-forwarded-for"),256).split(",")[0]?.trim();
  return clean(forwarded||headers.get("x-real-ip")||headers.get("cf-connecting-ip")||"unknown",64)||"unknown";
}

export function authSubject(email:string):string{
  return createHash("sha256").update(String(email).trim().toLowerCase()).digest("hex");
}

type LimitInput={
  action:string;
  headers:Headers;
  email:string;
  windowMs:number;
  maxPerIp:number;
  maxPerEmail:number;
};

export async function consumeAuthRateLimit(input:LimitInput):Promise<boolean>{
  const ip=requestIp(input.headers),entityId=authSubject(input.email),since=new Date(Date.now()-input.windowMs);
  return db.transaction(async tx=>{
    // Lock both dimensions so concurrent requests cannot race the counters.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`auth-rate:${input.action}:ip:${ip}`}))`);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`auth-rate:${input.action}:subject:${entityId}`}))`);
    const ipRows=await tx.select({id:auditLogs.id}).from(auditLogs).where(and(eq(auditLogs.action,input.action),eq(auditLogs.entity,"auth_security"),eq(auditLogs.ipAddress,ip),gt(auditLogs.createdAt,since))).limit(input.maxPerIp);
    if(ipRows.length>=input.maxPerIp)return false;
    const subjectRows=await tx.select({id:auditLogs.id}).from(auditLogs).where(and(eq(auditLogs.action,input.action),eq(auditLogs.entity,"auth_security"),eq(auditLogs.entityId,entityId),gt(auditLogs.createdAt,since))).limit(input.maxPerEmail);
    if(subjectRows.length>=input.maxPerEmail)return false;
    await tx.insert(auditLogs).values({workspaceId:"default",userId:"anonymous",action:input.action,entity:"auth_security",entityId,ipAddress:ip,newValues:JSON.stringify({rateLimited:false})});
    return true;
  });
}
