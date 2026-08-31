export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users, creativeTasks, clients, auditLogs } from "@/lib/db";
import { eq, and, inArray, count } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role=String(session.user.role||"");
  if(!["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role))return NextResponse.json({error:"Forbidden"},{status:403});
  const workspaceId=String(session.user.workspaceId||"").trim(),userId=String(session.user.id||"").trim();
  if(!workspaceId||!userId)return NextResponse.json({error:"Workspace unavailable"},{status:403});

  const body=await req.json().catch(()=>null),taskId=String(body?.taskId||"").trim();
  if(!taskId)return NextResponse.json({error:"taskId required"},{status:400});

  const [task]=await db.select({id:creativeTasks.id,clientId:creativeTasks.clientId}).from(creativeTasks)
    .where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId))).limit(1);
  if(!task)return NextResponse.json({error:"Task not found"},{status:404});
  if(role==="ACCOUNT_MANAGER"){
    const [client]=await db.select({id:clients.id}).from(clients)
      .where(and(eq(clients.id,task.clientId),eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),eq(clients.accountManagerId,userId))).limit(1);
    if(!client)return NextResponse.json({error:"Forbidden"},{status:403});
  }

  const creators = await db.select({ id: users.id, name: users.name })
    .from(users).where(and(eq(users.workspaceId,workspaceId),eq(users.role,"CREATOR"),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED")));
  if (!creators.length) return NextResponse.json({ error: "No active creators" }, { status: 400 });

  const workloads = await Promise.all(creators.map(async (c) => {
    const [agg] = await db.select({ active: count() }).from(creativeTasks)
      .where(and(eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.assignedToId,c.id),inArray(creativeTasks.status,["PENDING","IN_PROGRESS","REVIEW"])));
    return { creator: c, activeCount: Number(agg?.active ?? 0) };
  }));
  workloads.sort((a,b) => a.activeCount - b.activeCount || a.creator.id.localeCompare(b.creator.id));
  const best = workloads[0];

  await db.transaction(async tx=>{
    const updated=await tx.update(creativeTasks).set({ assignedToId: best.creator.id, updatedAt: new Date() } as unknown)
      .where(and(eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId))).returning({id:creativeTasks.id});
    if(!updated.length)throw new Error("Task not found");
    await tx.insert(auditLogs).values({workspaceId,userId,action:"task_auto_assigned",entity:"creative_tasks",entityId:taskId,newValues:JSON.stringify({assignedToId:best.creator.id,workload:best.activeCount})});
  });

  return NextResponse.json({ success:true, assignedTo:best.creator.name, creatorId:best.creator.id, workload:best.activeCount });
}
