import { drizzle }        from "drizzle-orm/postgres-js";
import postgres            from "postgres";
import * as schema         from "@/db/schema";
import { unstable_cache, revalidateTag } from "next/cache";
import { eq, and, gte, lte, inArray, notInArray,
  desc, asc, count, sum, sql, ne, avg, ilike, or } from "drizzle-orm";

// ── Connection Pool ────────────────────────────────────────────
// prepare:false required for Supabase Transaction Pooler (port 6543)
// Keep the per-function pool small in serverless environments.
const globalForDb = globalThis as unknown as {
  _pgClient: ReturnType<typeof postgres> | undefined;
};

function createClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  // Parse and rebuild the URI so pooler usernames such as postgres.<project-ref>
  // survive percent-encoding/URL parsing exactly instead of collapsing to postgres.
  const parsed = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://");
  }
  const username = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const host = parsed.hostname;
  const port = parsed.port ? Number(parsed.port) : 5432;
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
    max:             3,
    idle_timeout:    20,
    connect_timeout: 10,
    max_lifetime:    60,
    connection:      { application_name: "vivit-erp", statement_timeout: "8000" } as any,
    prepare:         false,
    onnotice:        () => {},
  });
}

const _pgClient = process.env.NODE_ENV === "production"
  ? createClient()
  : (globalForDb._pgClient ??= createClient());

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
      role:     schema.users.role,
      email:    schema.users.email,
      isActive: schema.users.isActive,
    }).from(schema.users).where(eq(schema.users.isActive, true));
  },
  ["team-list"],
  { revalidate: 300, tags: ["team"] }
);

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