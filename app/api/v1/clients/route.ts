// @ts-nocheck -- Drizzle's generated API-key shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, clients, apiKeys } from "@/lib/db";
import { eq, desc, ilike, count, and } from "drizzle-orm";
import crypto from "crypto";

async function authenticateAPIKey(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  const key = req.headers.get("x-api-key") ?? (authorization?.startsWith("Bearer ") ? authorization.slice(7) : null);
  if (!key) return null;
  const hashed = crypto.createHash("sha256").update(key).digest("hex");
  const [found] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, hashed), eq(apiKeys.isActive, true)));
  if (!found) return null;
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, found.id));
  return found;
}

export async function GET(req: NextRequest) {
  const apiKey = await authenticateAPIKey(req);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401, headers: { "WWW-Authenticate": "ApiKey" } }
    );
  }

  const url = req.nextUrl;
  const parsedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 20;
  const search = url.searchParams.get("search")?.trim() ?? "";
  const risk = url.searchParams.get("churn_risk")?.trim() ?? "";
  const offset = (page - 1) * limit;

  const query = db.select({
    id: clients.id,
    companyName: clients.companyName,
    industry: clients.industry,
    healthScore: clients.healthScore,
    churnRisk: clients.churnRisk,
    churnProbability: clients.churnProbability,
    monthlyRetainer: clients.monthlyRetainer,
    lifetimeValue: clients.lifetimeValue,
    isActive: clients.isActive,
    createdAt: clients.createdAt,
  }).from(clients);

  // API keys are workspace-scoped. Never allow a key to enumerate another workspace.
  const conditions = [
    eq(clients.workspaceId, apiKey.workspaceId),
    eq(clients.isActive, true),
  ];
  if (search) conditions.push(ilike(clients.companyName, `%${search}%`));
  if (risk) conditions.push(eq(clients.churnRisk, risk));

  const [data, [totalRow]] = await Promise.all([
    query.where(and(...conditions)).limit(limit).offset(offset).orderBy(desc(clients.createdAt)),
    db.select({ total: count() }).from(clients).where(and(...conditions)),
  ]);

  const total = Number(totalRow?.total ?? 0);
  const pages = Math.ceil(total / limit);

  return NextResponse.json({
    data,
    meta: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
    _links: {
      self: `/api/v1/clients?page=${page}&limit=${limit}`,
      next: page < pages ? `/api/v1/clients?page=${page + 1}&limit=${limit}` : null,
      prev: page > 1 ? `/api/v1/clients?page=${page - 1}&limit=${limit}` : null,
    },
    _meta: { version: "1.0", deprecation: null },
  }, {
    headers: { "X-API-Version": "1.0" },
  });
}
