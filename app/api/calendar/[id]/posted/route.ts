export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, calendarEvents } from "@/lib/db";
import { eq } from "drizzle-orm";
import { canAccessClient } from "@/lib/client-access";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const [event]=await db.select({clientId:calendarEvents.clientId}).from(calendarEvents).where(eq(calendarEvents.id,id)).limit(1);
  if(!event)return NextResponse.json({error:"Not found"},{status:404});
  if(!(await canAccessClient(session,event.clientId,{write:true})))return NextResponse.json({error:"Forbidden"},{status:403});
  await db.update(calendarEvents).set({ status: "posted", updatedAt: new Date() } as any).where(eq(calendarEvents.id, id));
  return NextResponse.json({ success: true });
}
