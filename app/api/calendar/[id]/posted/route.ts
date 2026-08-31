export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, calendarEvents, auditLogs } from "@/lib/db";
import { eq, and, ne } from "drizzle-orm";
import { canAccessClient } from "@/lib/client-access";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id||"");
  if(!workspaceId||!userId)return NextResponse.json({error:"Workspace unavailable"},{status:403});
  const { id } = await context.params;
  const [event]=await db.select({clientId:calendarEvents.clientId,status:calendarEvents.status}).from(calendarEvents).where(and(eq(calendarEvents.id,id),eq(calendarEvents.workspaceId,workspaceId))).limit(1);
  if(!event)return NextResponse.json({error:"Not found"},{status:404});
  if(!(await canAccessClient(session,event.clientId,{write:true})))return NextResponse.json({error:"Forbidden"},{status:403});
  if(event.status==="posted")return NextResponse.json({success:true,duplicate:true},{headers:{"Cache-Control":"private, no-store"}});
  const changed=await db.transaction(async tx=>{const rows=await tx.update(calendarEvents).set({status:"posted",updatedAt:new Date()}).where(and(eq(calendarEvents.id,id),eq(calendarEvents.workspaceId,workspaceId),ne(calendarEvents.status,"posted"))).returning({id:calendarEvents.id});if(rows.length)await tx.insert(auditLogs).values({workspaceId,userId,action:"calendar_event_marked_posted",entity:"calendar_events",entityId:id,newValues:JSON.stringify({from:event.status,to:"posted"})});return rows});
  if(!changed.length)return NextResponse.json({success:true,duplicate:true},{headers:{"Cache-Control":"private, no-store"}});
  return NextResponse.json({success:true},{headers:{"Cache-Control":"private, no-store"}});
}