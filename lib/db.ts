import { drizzle }        from "drizzle-orm/postgres-js";
import postgres            from "postgres";
import * as schema         from "@/db/schema";
import { unstable_cache, revalidateTag } from "next/cache";
import { eq, and, gte, lte, inArray, notInArray,
  desc, asc, count, sum, sql, ne, avg, ilike, or } from "drizzle-orm";

// ── Connection Pool (Fix 47,104) ──────────────────────────────
// prepare:false required for Supabase Transaction Pooler (port 6543)
// max:3 is safe for serverless — each function gets its own pool
// Fix 47: Use globalThis to reuse across hot-reload in dev only
const globalForDb = globalThis as unknown as {
  _pgClient: ReturnType<typeof postgres> | undefined;
};

function createClient() {
  return postgres(process.env.DATABASE_URL!, {
    ssl:             { rejectUnauthorized: false },
    max:             3,           // Fix 104: 3 per function instance
    idle_timeout:    20,          // Return connection after 20s idle
    connect_timeout: 10,          // Fail fast if DB unreachable
    prepare:         false,       // Required for PgBouncer/Supabase pooler
    onnotice:        () => {},    // Suppress PostgreSQL notices
  });
}

const _pgClient = process.env.NODE_ENV === "production"
  ? createClient()
  : (globalForDb._pgClient ??= createClient());

export const db = drizzle(_pgClient, { schema });

// ── Re-export Drizzle operators ───────────────────────────────
export { eq, and, gte, lte, inArray, notInArray,
  desc, asc, count, sum, sql, ne, avg, ilike, or };

// ── Re-export schema ──────────────────────────────────────────
export * from "@/db/schema";
export { workspaceRoles, userRoles, workspaceMembers, invitations,
  kpiDefinitions, kpiScores, salaryRecommendations, payrollLocks,
  approvalWorkflows, commissions, agencyHealthScores, resourcePlanning,
  knowledgeBase, followUpReminders } from "@/db/schema";

// ── Cache Invalidation Helpers (Fix 36) ──────────────────────
export function invalidateClients()  { revalidateTag("clients"); }
export function invalidateTasks()    { revalidateTag("tasks"); }
export function invalidateFinance()  { revalidateTag("finance"); }
export function invalidateTeam()     { revalidateTag("team"); }

// ── Cached Queries (Fix 36: proper cache invalidation) ────────
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
      role:     schema.users.role,
      email:    schema.users.email,
      isActive: schema.users.isActive,
    }).from(schema.users).where(eq(schema.users.isActive, true));
  },
  ["team-list"],
  { revalidate: 300, tags: ["team"] }
);

// ── N+1 Prevention (Fix 28,86) ────────────────────────────────
export async function getClientsWithAMs() {
  return db.select({
    id:               schema.clients.id,
    companyName:      schema.clients.companyName,
    industry:         schema.clients.industry,
    healthScore:      schema.clients.healthScore,
    churnRisk:        schema.clients.churnRisk,
    monthlyRetainer:  schema.clients.monthlyRetainer,
    lifetimeValue:    schema.clients.lifetimeValue,
    isActive:         schema.clients.isActive,
    accountManagerId: schema.clients.accountManagerId,
    mediaBudget:      schema.clients.mediaBudget,
    amName:           schema.users.name,
    amEmail:          schema.users.email,
  })
  .from(schema.clients)
  .leftJoin(schema.users, eq(schema.clients.accountManagerId, schema.users.id))
  .where(eq(schema.clients.isActive, true));
}

export async function getTasksWithClients() {
  return db.select({
    id:          schema.creativeTasks.id,
    title:       schema.creativeTasks.title,
    status:      schema.creativeTasks.status,
    priority:    schema.creativeTasks.priority,
    deadline:    schema.creativeTasks.deadline,
    type:        schema.creativeTasks.type,
    assignedToId:schema.creativeTasks.assignedToId,
    clientId:    schema.creativeTasks.clientId,
    companyName: schema.clients.companyName,
  })
  .from(schema.creativeTasks)
  .leftJoin(schema.clients, eq(schema.creativeTasks.clientId, schema.clients.id))
  .where(
    and(
      notInArray(schema.creativeTasks.status, ["COMPLETED", "REJECTED"] as any[]),
      sql`true`
    )
  );
}
