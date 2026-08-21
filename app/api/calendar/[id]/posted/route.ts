export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, calendarEvents } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await db.update(calendarEvents).set({ status: "posted", updatedAt: new Date() }).where(eq(calendarEvents.id, id));
  return NextResponse.json({ success: true });
}
