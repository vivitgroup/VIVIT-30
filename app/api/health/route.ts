import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db, users, count } = await import("@/lib/db");
    const [result] = await db.select({ total: count() }).from(users).limit(1);
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      users: Number(result?.total ?? 0),
      version: "30.0.0",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: "unhealthy",
      database: "unavailable",
      version: "30.0.0",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
