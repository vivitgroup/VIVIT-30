export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {db,clients} from "@/lib/db";
import {eq,desc,ilike,count,and,type SQL} from "drizzle-orm";
import {authenticatePublicRead} from "@/lib/public-api-auth";

export async function GET(req:NextRequest){
 const apiKey=await authenticatePublicRead(req);if(!apiKey)return NextResponse.json({error:"Invalid API key or rate limit exceeded"},{status:401,headers:{"WWW-Authenticate":"ApiKey","Cache-Control":"no-store"}});
 const url=req.nextUrl,page=Math.max(1,parseInt(url.searchParams.get("page")??"1")||1),limit=Math.min(100,Math.max(1,parseInt(url.searchParams.get("limit")??"20")||20)),search=String(url.searchParams.get("search")||"").slice(0,120),risk=url.searchParams.get("churn_risk"),offset=(page-1)*limit;
 const conditions:SQL[]=[eq(clients.workspaceId,apiKey.workspaceId),eq(clients.isActive,true)];if(search)conditions.push(ilike(clients.companyName,`%${search}%`));if(risk)conditions.push(eq(clients.churnRisk,risk));
 const [data,[totalRow]]=await Promise.all([
  db.select({id:clients.id,companyName:clients.companyName,industry:clients.industry,healthScore:clients.healthScore,churnRisk:clients.churnRisk,churnProbability:clients.churnProbability,monthlyRetainer:clients.monthlyRetainer,lifetimeValue:clients.lifetimeValue,isActive:clients.isActive,createdAt:clients.createdAt}).from(clients).where(and(...conditions)).limit(limit).offset(offset).orderBy(desc(clients.createdAt)),
  db.select({total:count()}).from(clients).where(and(...conditions))
 ]);
 const total=Number(totalRow?.total||0),pages=Math.ceil(total/limit);
 return NextResponse.json({data,meta:{page,limit,total,pages,hasNext:page<pages,hasPrev:page>1},_links:{self:`/api/v1/clients?page=${page}&limit=${limit}`,next:page<pages?`/api/v1/clients?page=${page+1}&limit=${limit}`:null,prev:page>1?`/api/v1/clients?page=${page-1}&limit=${limit}`:null},_meta:{version:"1.0",deprecation:null}},{headers:{"Cache-Control":"private, no-store","X-API-Version":"1.0","X-Content-Type-Options":"nosniff"}});
}
