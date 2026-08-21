export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, apiKeys } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const keys = await db.select({ id:apiKeys.id, name:apiKeys.name, keyPrefix:apiKeys.keyPrefix, permissions:apiKeys.permissions, lastUsedAt:apiKeys.lastUsedAt, isActive:apiKeys.isActive, createdAt:apiKeys.createdAt }).from(apiKeys).where(eq(apiKeys.workspaceId, "default"));
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, permissions = "read" } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const rawKey = `vvt_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);
  const [key] = await db.insert(apiKeys).values({ workspaceId:"default", userId:session.user.id!, name, keyHash, keyPrefix, permissions } as any).returning({ id:apiKeys.id, name:apiKeys.name });
  return NextResponse.json({ id:key.id, name:key.name, key: rawKey, message:"Store this key securely. It will NOT be shown again." });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.update(apiKeys).set({ isActive: false } as any).where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, "default")));
  return NextResponse.json({ success: true });
}
