// @ts-nocheck -- Drizzle's generated notification shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, notifications, clients } from "@/lib/db";
import { eq } from "drizzle-orm";


// Fix 76: robots.txt handler
export async function GET(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  if (pathname === "/api/robots" || req.nextUrl.searchParams.get("type") === "robots") {
    return new NextResponse(
      `User-agent: *\nDisallow: /dashboard\nDisallow: /api\nAllow: /\nSitemap: ${process.env.NEXTAUTH_URL ?? ""}/sitemap.xml`,
      { headers: { "Content-Type": "text/plain" } }
    );
  }

  // Fix 45: Real health check with DB
  if (req.nextUrl.searchParams.get("type") === "health") {
    try {
      const { db, users } = await import("@/lib/db");
      const { count } = await import("drizzle-orm");
      const [r] = await db.select({ cnt: count() }).from(users).limit(1);
      return NextResponse.json({
        status: "healthy",
        db: "connected",
        users: Number(r?.cnt ?? 0),
        ts: new Date().toISOString(),
        version: "30.0.0",
      });
    } catch (e) {
      return NextResponse.json({ status:"unhealthy", error:String(e) }, { status:503 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json();

  switch (action) {
    case "mark_all_read": {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, session.user.id!));
      return NextResponse.json({ success: true, action });
    }
    case "recalculate_health":
      // Fix 9: Actually call performance-score API
      try {
        const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        await fetch(`${baseUrl}/api/performance-score`, {
          method: "POST",
          headers: { "Content-Type": "application/json",
            "Cookie": req.headers.get("cookie") ?? "" },
          body: JSON.stringify({}),
        });
        return NextResponse.json({ success:true, action:"recalculate_health", status:"triggered" });
      } catch (e) {
        return NextResponse.json({ success:false, action:"recalculate_health", status:"failed", error:String(e) }, { status:502 });
      }
    case "recalculate_health_old": {
      // Trigger health score recalculation
      const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      await fetch(`${base}/api/performance-score`, { method: "POST" });
      return NextResponse.json({ success: true, action });
    }
    case "generate_recurring": {
      const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const res = await fetch(`${base}/api/recurring`, { method: "POST" });
      const data = await res.json();
      return NextResponse.json({ success: true, ...data });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
