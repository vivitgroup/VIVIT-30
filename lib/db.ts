import { drizzle }        from "drizzle-orm/postgres-js";
import postgres            from "postgres";
import * as schema         from "@/db/schema";
import { unstable_cache, revalidateTag } from "next/cache";
import { eq, and, gte, lte, inArray, notInArray,
  desc, asc, count, sum, sql, ne, avg, ilike, or } from "drizzle-orm";

declare global {
  var _pgClient: ReturnType<typeof postgres> | undefined;
}

// ── Connection Pool ────────────────────────────────────────────
// prepare:false is required for Supabase Transaction Pooler (port 6543).
// Vercel functions must not use Supabase Session mode (port 5432): each
// function instance can otherwise pin multiple sessions and exhaust the
// project's small session pool under normal dashboard fan-out.
function createClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  // Parse and rebuild the URI so Supabase pooler usernames such as
  // postgres.<project-ref> survive URL parsing exactly. Passing the raw URI
  // to postgres.js has previously authenticated production as plain postgres.
  const parsed = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://");
  }
  const username = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const host = parsed.hostname;
  const configuredPort = parsed.port ? Number(parsed.port) : 5432;
  // Supabase's pooler uses 5432 for session mode and 6543 for transaction
  // mode. Automatically move only known Supabase pooler hosts to transaction
  // mode; direct database hosts and non-Supabase Postgres URLs are untouched.
  const port = host.endsWith(".pooler.supabase.com") && configuredPort === 5432
    ? 6543
    : configuredPort;
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "") || "postgres");
  if (!host || !username || !password) {
    throw new Error("DATABASE_URL is missing host, username, or password");
  }
  const runtimeUrl = `${parsed.protocol}//${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;

  const ssl = process.env.DATABASE_SSL_DISABLED === "1"
    ? false
    : { rejectUnauthorized: false };
  return postgres(runtimeUrl, {
    ssl,
    // Keep one connection per warm function instance. Transaction pooling
    // releases the backend connection after each transaction/query and avoids
    // EMAXCONNSESSION under concurrent dashboard/API traffic.
    max:             1,
    idle_timeout:    10,
    connect_timeout: 10,
    max_lifetime:    300,
    connection:      { application_name: "vivit-erp", statement_timeout: 8000 },
    prepare:         false,
    onnotice:        () => {},
  });
}

// Reuse a single postgres.js client for the lifetime of the warm runtime in
// every environment. This also protects against duplicate module evaluation
// during development/hot reload and production bundling.
const _pgClient = globalThis._pgClient ??= createClient();

export const db = drizzle(_pgClient, { schema });

export { eq, and, gte, lte, inArray, notInArray,
  desc, asc, count, sum, sql, ne, avg, ilike, or };

export * from "@/db/schema";
export { workspaceRoles, userRoles, workspaceMembers, invitations,
  kpiDefinitions, kpiScores, salaryRecommendations, payrollLocks,
  approvalWorkflows, commissions, agencyHealthScores, resourcePlanning,
  knowledgeBase, followUpReminders } from "@/db/schema";

// Next.js 16 requires an explicit cache-life profile for revalidateTag.
export function invalidateClients()  { revalidateTag("clients", "max"); }
export function invalidateTasks()    { revalidateTag("tasks", "max"); }
export function invalidateFinance()  { revalidateTag("finance", "max"); }
export function invalidateTeam()     { revalidateTag("team", "max"); }

export const getCachedClients = unstable_cache(
  async () => {
    return db.select({
      id:               schema.clients.id,
      companyName:      schema.clients.companyName,
      industry:         schema.clients.industry,
      isActive:         schema.clients.isActive,
      healthScore:      schema.clients.healthScore,
      churnRisk:        schema.clients.churnRisk,
      accountManagerId: schema.clients.accountManagerId,
      monthlyRetainer:  schema.clients.monthlyRetainer,
    }).from(schema.clients).where(eq(schema.clients.isActive, true));
  },
  ["clients-list"],
  { revalidate: 60, tags: ["clients"] }
);

export const getCachedTeam = unstable_cache(
  async () => {
    return db.select({
      id:       schema.users.id,
      name:     schema.users.name,
      email:    schema.users.email,
      role:     schema.users.role,
      isActive: schema.users.isActive,
    }).from(schema.users).where(eq(schema.users.isActive, true));
  },
  ["team-list"],
  { revalidate: 60, tags: ["team"] }
);
