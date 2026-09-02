import postgres from "postgres";

export type VGroupBusinessUnitRow = {
  id: string;
  code: "marketing" | "hospitality" | "tech";
  display_name_ar: string;
  display_name_en: string;
  status: "active" | "inactive";
};

declare global {
  // eslint-disable-next-line no-var
  var _vgroupPgClient: ReturnType<typeof postgres> | undefined;
}

function requireVGroupDatabaseUrl(): string {
  const url = process.env.VGROUP_DATABASE_URL;
  if (!url) throw new Error("VGROUP_DATABASE_URL is required for Vivit Group runtime");
  if (process.env.DATABASE_URL && url === process.env.DATABASE_URL) {
    throw new Error("Vivit Group DB isolation violation: VGROUP_DATABASE_URL must not equal DATABASE_URL");
  }
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("VGROUP_DATABASE_URL must be a PostgreSQL connection URL");
  }
  return url;
}

export function getVGroupSql() {
  if (globalThis._vgroupPgClient) return globalThis._vgroupPgClient;
  const client = postgres(requireVGroupDatabaseUrl(), {
    ssl: { rejectUnauthorized: false },
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60,
    prepare: false,
    connection: {
      application_name: "vivit-group-erp",
      statement_timeout: 8000,
    },
    onnotice: () => {},
  });
  if (process.env.NODE_ENV !== "production") globalThis._vgroupPgClient = client;
  return client;
}

export async function getVGroupBusinessUnits(): Promise<VGroupBusinessUnitRow[]> {
  const sql = getVGroupSql();
  const rows = await sql<VGroupBusinessUnitRow[]>`
    select id::text, code, display_name_ar, display_name_en, status
    from vgroup.business_units
    where status = 'active'
    order by case code when 'marketing' then 1 when 'hospitality' then 2 else 3 end
  `;
  return Array.from(rows);
}

export async function getVGroupHealth() {
  const sql = getVGroupSql();
  const [row] = await sql<{ database: string; schema_ready: boolean }[]>`
    select current_database() as database,
           exists(select 1 from information_schema.schemata where schema_name='vgroup') as schema_ready
  `;
  return row;
}
