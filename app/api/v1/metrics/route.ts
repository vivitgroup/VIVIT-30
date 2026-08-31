export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {db,mediaMetrics,clients} from "@/lib/db";
import {eq,and,gte,sum,inArray} from "drizzle-orm";
import {authenticatePublicRead} from "@/lib/public-api-auth";

export async function GET(req:NextRequest){const key=await authenticatePublicRead(req);if(!key)return NextResponse.json({error:"Invalid API key or rate limit exceeded"},{status:401,headers:{"Cache-Control":"no-store"}});const active=await db.select({id:clients.id}).from(clients).where(and(eq(clients.workspaceId,key.workspaceId),eq(clients.isActive,true))),ids=active.map(x=>x.id),monthStart=new Date(new Date().getFullYear(),new Date().getMonth(),1);const metrics=ids.length?await db.select({platform:mediaMetrics.platform,adSpend:sum(mediaMetrics.adSpend),leads:sum(mediaMetrics.leads),revenue:sum(mediaMetrics.revenue),roas:sum(mediaMetrics.roas)}).from(mediaMetrics).where(and(eq(mediaMetrics.workspaceId,key.workspaceId),inArray(mediaMetrics.clientId,ids),gte(mediaMetrics.date,monthStart))).groupBy(mediaMetrics.platform):[];return NextResponse.json({data:metrics,period:"MTD"},{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}})}
