export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, notifications } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/api/robots" || req.nextUrl.searchParams.get("type") === "robots") {
    return new NextResponse(
      `User-agent: *\nDisallow: /dashboard\nDisallow: /api\nAllow: /\nSitemap: ${process.env.NEXTAUTH_URL ?? ""}/sitemap.xml`,
      { headers: { "Content-Type": "text/plain" } }
    );
  }
  if (req.nextUrl.searchParams.get("type") === "health") {
    const session=await auth();
    if(!session?.user||session.user.role!=="SUPER_ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
    try {
      const { db, users } = await import("@/lib/db");
      const { count } = await import("drizzle-orm");
      const [r] = await db.select({ cnt: count() }).from(users).limit(1);
      return NextResponse.json({status:"healthy",db:"connected",users:Number(r?.cnt??0),ts:new Date().toISOString()});
    } catch {
      return NextResponse.json({ status:"unhealthy" }, { status:503 });
    }
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body=await req.json().catch(()=>null);
  if(!body) return NextResponse.json({error:"Invalid JSON body"},{status:400});
  const action=String(body.action||"");
  const role=String(session.user.role||"");

  switch (action) {
    case "mark_all_read": {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, session.user.id!));
      return NextResponse.json({ success: true, action });
    }
    case "recalculate_health": {
      if(role!=="SUPER_ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
      try {
        const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
        const res=await fetch(`${baseUrl}/api/performance-score`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Cookie": req.headers.get("cookie") ?? "" },
          body: "{}",
        });
        if(!res.ok) return NextResponse.json({success:false,error:"Health recalculation failed"},{status:502});
        const data=await res.json().catch(()=>({}));
        return NextResponse.json({ success:true, action, processed:data.processed??null });
      } catch {
        return NextResponse.json({ success:false, action, error:"Health recalculation failed" }, { status:502 });
      }
    }
    case "generate_recurring": {
      if(!["SUPER_ADMIN","ACCOUNTANT"].includes(role)) return NextResponse.json({error:"Forbidden"},{status:403});
      const base = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
      const res = await fetch(`${base}/api/recurring`, { method:"POST", headers:{"Cookie":req.headers.get("cookie")??""} });
      const data = await res.json().catch(()=>({}));
      if(!res.ok) return NextResponse.json({error:data.error||"Recurring invoice generation failed"},{status:res.status});
      return NextResponse.json({ success: true, ...data });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
