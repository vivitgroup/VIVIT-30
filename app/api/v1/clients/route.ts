// ═══════════════════════════════════════════════════════════════
// Vivit ERP Public API — v1.0
// Feature 32: Full Pagination + Feature 9: No data leakage
// Changelog:
//   v1.0 (2025-01): Initial — clients, tasks, metrics
//   v1.1 (planned): contacts, proposals, analytics
//   v2.0 (planned): GraphQL, batch ops, webhooks v2
// Deprecation: v1 supported 12+ months after v2 release
// ═══════════════════════════════════════════════════════════════
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, clients, apiKeys } from "@/lib/db";
import { eq, desc, ilike, count, and } from "drizzle-orm";
import crypto from "crypto";

async function authenticateAPIKey(req: NextRequest) {
  const key = req.headers.get("x-api-key") ?? req.nextUrl.searchParams.get("api_key");
  if (!key) return null;
  const hashed = crypto.createHash("sha256").update(key).digest("hex");
  const [found] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hashed));
  if (!found || !found.isActive) return null;
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, found.id));
  return found;
}

export async function GET(req: NextRequest) {
  const apiKey = await authenticateAPIKey(req);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Invalid API key", docs: "https://docs.viviterp.com/api" },
      { status: 401, headers: { "WWW-Authenticate": "ApiKey" } }
    );
  }

  const url = req.nextUrl;
  const page    = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1"));
  const limit   = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
  const sort    = url.searchParams.get("sort") ?? "created_at:desc";
  const search  = url.searchParams.get("search") ?? "";
  const risk    = url.searchParams.get("churn_risk");
  const offset  = (page - 1) * limit;

  // Feature 9: Only return safe fields (no internal IDs leakage)
  const query = db.select({
    id:               clients.id,
    companyName:      clients.companyName,
    industry:         clients.industry,
    healthScore:      clients.healthScore,
    churnRisk:        clients.churnRisk,
    churnProbability: clients.churnProbability,
    monthlyRetainer:  clients.monthlyRetainer,
    lifetimeValue:    clients.lifetimeValue,
    isActive:         clients.isActive,
    createdAt:        clients.createdAt,
  }).from(clients);

  // Filters
  const conditions = [eq(clients.isActive, true)];
  if (search) conditions.push(ilike(clients.companyName, `%${search}%`));
  if (risk)   conditions.push(eq(clients.churnRisk, risk));

  const [data, [totalRow]] = await Promise.all([
    query.where(and(...conditions)).limit(limit).offset(offset).orderBy(desc(clients.createdAt)),
    db.select({ total: count() }).from(clients).where(and(...conditions)),
  ]);

  const total = Number(totalRow?.total ?? 0);
  const pages = Math.ceil(total / limit);

  return NextResponse.json({
    data, meta: {
      page, limit, total, pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
    _links: {
      self: `/api/v1/clients?page=${page}&limit=${limit}`,
      next: page < pages ? `/api/v1/clients?page=${page+1}&limit=${limit}` : null,
      prev: page > 1 ? `/api/v1/clients?page=${page-1}&limit=${limit}` : null,
    },
    _meta: { version:"1.0", deprecation: null },
  }, {
    headers: {
      "X-API-Version":   "1.0",
      "X-RateLimit-Limit": "1000",
      "X-RateLimit-Window": "3600",
    }
  });
}
