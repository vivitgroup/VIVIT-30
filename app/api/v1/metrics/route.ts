export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, mediaMetrics, apiKeys } from "@/lib/db";
import { eq, and, gte, sum } from "drizzle-orm";
import crypto from "crypto";

async function authenticateAPIKey(req: NextRequest) {
  const key = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ","");
  if (!key) return null;
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const [apiKey] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash,keyHash),eq(apiKeys.isActive,true)));
  return apiKey ?? null;
}

export async function GET(req: NextRequest) {
  const key = await authenticateAPIKey(req);
  if (!key) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const metrics = await db.select({ platform:mediaMetrics.platform, adSpend:sum(mediaMetrics.adSpend), leads:sum(mediaMetrics.leads), revenue:sum(mediaMetrics.revenue), roas:sum(mediaMetrics.roas) }).from(mediaMetrics).where(and(eq(mediaMetrics.workspaceId,key.workspaceId),gte(mediaMetrics.date,monthStart))).groupBy(mediaMetrics.platform);
  return NextResponse.json({ data: metrics, period: "MTD" });
}
