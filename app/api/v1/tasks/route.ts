export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {db,creativeTasks,sql} from "@/lib/db";
import {eq,and} from "drizzle-orm";
import {authenticatePublicRead} from "@/lib/public-api-auth";

export async function GET(req:NextRequest){const key=await authenticatePublicRead(req);if(!key)return NextResponse.json({error:"Invalid API key or rate limit exceeded"},{status:401,headers:{"Cache-Control":"no-store"}});const status=req.nextUrl.searchParams.get("status"),activeScope=sql`${creativeTasks.id} in (select t.id from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${key.workspaceId} and c.workspace_id=${key.workspaceId} and t.archived_at is null and c.is_active=true)`,rows=await db.select({id:creativeTasks.id,title:creativeTasks.title,status:creativeTasks.status,type:creativeTasks.type,priority:creativeTasks.priority,deadline:creativeTasks.deadline,clientId:creativeTasks.clientId}).from(creativeTasks).where(and(eq(creativeTasks.workspaceId,key.workspaceId),activeScope));const data=status?rows.filter(t=>t.status===status):rows;return NextResponse.json({data,count:data.length},{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}})}
