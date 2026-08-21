export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, creativeTasks, apiKeys } from "@/lib/db";
import { eq, and } from "drizzle-orm";
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
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const tasks = await db.select({ id:creativeTasks.id, title:creativeTasks.title, status:creativeTasks.status, type:creativeTasks.type, priority:creativeTasks.priority, deadline:creativeTasks.deadline, clientId:creativeTasks.clientId }).from(creativeTasks).where(eq(creativeTasks.workspaceId, key.workspaceId));
  const filtered = status ? tasks.filter(t=>t.status===status) : tasks;
  return NextResponse.json({ data: filtered, count: filtered.length });
}
