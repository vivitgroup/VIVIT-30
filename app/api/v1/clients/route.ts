// @ts-nocheck
export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {db,clients,apiKeys} from "@/lib/db";
import {eq,desc,ilike,count,and} from "drizzle-orm";
import crypto from "crypto";

const READ_PERMISSIONS=new Set(["read","read_write","admin"]);
async function authenticateAPIKey(req:NextRequest){
 const raw=req.headers.get("x-api-key")??req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 if(!raw)return null;
 const hashed=crypto.createHash("sha256").update(raw).digest("hex");
 const [found]=await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash,hashed),eq(apiKeys.isActive,true))).limit(1);
 if(!found||!READ_PERMISSIONS.has(String(found.permissions||"")))return null;
 await db.update(apiKeys).set({lastUsedAt:new Date()}).where(eq(apiKeys.id,found.id));
 return found;
}
export async function GET(req:NextRequest){
 const apiKey=await authenticateAPIKey(req);if(!apiKey)return NextResponse.json({error:"Invalid API key"},{status:401,headers:{"WWW-Authenticate":"ApiKey"}});
 const url=req.nextUrl,page=Math.max(1,parseInt(url.searchParams.get("page")??"1")||1),limit=Math.min(100,Math.max(1,parseInt(url.searchParams.get("limit")??"20")||20)),search=String(url.searchParams.get("search")||"").slice(0,120),risk=url.searchParams.get("churn_risk"),offset=(page-1)*limit;
 const conditions:any[]=[eq(clients.workspaceId,apiKey.workspaceId),eq(clients.isActive,true)];if(search)conditions.push(ilike(clients.companyName,`%${search}%`));if(risk)conditions.push(eq(clients.churnRisk,risk));
 const [data,[totalRow]]=await Promise.all([
  db.select({id:clients.id,companyName:clients.companyName,industry:clients.industry,healthScore:clients.healthScore,churnRisk:clients.churnRisk,churnProbability:clients.churnProbability,monthlyRetainer:clients.monthlyRetainer,lifetimeValue:clients.lifetimeValue,isActive:clients.isActive,createdAt:clients.createdAt}).from(clients).where(and(...conditions)).limit(limit).offset(offset).orderBy(desc(clients.createdAt)),
  db.select({total:count()}).from(clients).where(and(...conditions))
 ]);
 const total=Number(totalRow?.total||0),pages=Math.ceil(total/limit);
 return NextResponse.json({data,meta:{page,limit,total,pages,hasNext:page<pages,hasPrev:page>1},_links:{self:`/api/v1/clients?page=${page}&limit=${limit}`,next:page<pages?`/api/v1/clients?page=${page+1}&limit=${limit}`:null,prev:page>1?`/api/v1/clients?page=${page-1}&limit=${limit}`:null},_meta:{version:"1.0",deprecation:null}},{headers:{"Cache-Control":"private, no-store","X-API-Version":"1.0","X-Content-Type-Options":"nosniff"}});
}
