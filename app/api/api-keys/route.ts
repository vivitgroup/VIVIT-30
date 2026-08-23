export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, apiKeys } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

async function requireKeyAdmin() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  if ((session.user as any).role !== "SUPER_ADMIN") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  return { error: null, session };
}

export async function GET() {
  const access = await requireKeyAdmin();
  if (access.error) return access.error;
  const keys = await db.select({
    id: apiKeys.id,
    name: apiKeys.name,
    keyPrefix: apiKeys.keyPrefix,
    permissions: apiKeys.permissions,
    lastUsedAt: apiKeys.lastUsedAt,
    isActive: apiKeys.isActive,
    createdAt: apiKeys.createdAt,
  }).from(apiKeys).where(eq(apiKeys.workspaceId, "default"));
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const access = await requireKeyAdmin();
  if (access.error || !access.session) return access.error!;
  const payload = await req.json().catch(() => ({}));
  const name = String(payload.name ?? "").trim().slice(0, 120);
  if (name.length < 2) return NextResponse.json({ error: "A key name is required" }, { status: 400 });

  // Current /api/v1 surface is read-only. Do not expose a write permission that is not enforced.
  const permissions = "read";
  const rawKey = `vvt_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);
  const [key] = await db.insert(apiKeys).values({
    workspaceId: "default",
    userId: access.session.user.id!,
    name,
    keyHash,
    keyPrefix,
    permissions,
  } as any).returning({ id: apiKeys.id, name: apiKeys.name });

  return NextResponse.json({
    id: key.id,
    name: key.name,
    key: rawKey,
    permissions,
    message: "Store this key securely. It will NOT be shown again.",
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const access = await requireKeyAdmin();
  if (access.error) return access.error;
  const payload = await req.json().catch(() => ({}));
  const id = String(payload.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Key id is required" }, { status: 400 });
  const [key] = await db.select({ id: apiKeys.id }).from(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, "default"))).limit(1);
  if (!key) return NextResponse.json({ error: "API key not found" }, { status: 404 });
  await db.update(apiKeys).set({ isActive: false } as any).where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, "default")));
  return NextResponse.json({ success: true });
}
