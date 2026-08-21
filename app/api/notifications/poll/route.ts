export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, notifications } from "@/lib/db";
import { eq, and, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ notifications: [] });
  const since = req.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 60000);
  const newNotifs = await db.select({
    id: notifications.id, title: notifications.title, message: notifications.message,
    type: notifications.type, link: notifications.link, priority: notifications.priority,
    createdAt: notifications.createdAt,
  }).from(notifications).where(
    and(eq(notifications.userId, session.user.id!), eq(notifications.isRead, false), gte(notifications.createdAt, sinceDate))
  );
  return NextResponse.json({ notifications: newNotifs, count: newNotifs.length });
}
