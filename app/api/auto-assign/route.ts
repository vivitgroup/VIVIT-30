export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users, creativeTasks } from "@/lib/db";
import { eq, and, inArray, count } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await req.json();
  const creators = await db.select({ id: users.id, name: users.name })
    .from(users).where(and(eq(users.role, "CREATOR"), eq(users.isActive, true)));

  if (!creators.length) return NextResponse.json({ error: "No active creators" }, { status: 400 });

  const workloads = await Promise.all(creators.map(async (c) => {
    const [agg] = await db.select({ active: count() }).from(creativeTasks)
      .where(and(eq(creativeTasks.assignedToId, c.id), inArray(creativeTasks.status, ["PENDING","IN_PROGRESS","REVIEW"])));
    return { creator: c, activeCount: Number(agg?.active ?? 0) };
  }));

  workloads.sort((a,b) => a.activeCount - b.activeCount);
  const best = workloads[0];

  await db.update(creativeTasks).set({ assignedToId: best.creator.id, updatedAt: new Date() } as any)
    .where(eq(creativeTasks.id, taskId));

  return NextResponse.json({ success:true, assignedTo:best.creator.name, creatorId:best.creator.id, workload:best.activeCount });
}
