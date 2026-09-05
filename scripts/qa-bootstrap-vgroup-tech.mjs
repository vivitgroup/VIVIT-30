import { readFile } from "node:fs/promises";
import postgres from "postgres";

const databaseUrl = process.env.VGROUP_DATABASE_URL;
if (!databaseUrl) throw new Error("missing_required_env:VGROUP_DATABASE_URL");

const sql = postgres(databaseUrl, { ssl: false, max: 1, prepare: false });

async function ensureSupabaseRoles() {
  await sql.unsafe(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon noinherit; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated noinherit; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role noinherit; end if;
    end
    $$;
  `);
}

async function bootstrapVGroupFoundation() {
  await sql.unsafe(`
    create schema if not exists vgroup;
    create table if not exists vgroup.business_units (
      id uuid primary key default gen_random_uuid(),
      code text not null unique,
      display_name_ar text not null,
      display_name_en text not null,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists vgroup.users (
      id uuid primary key default gen_random_uuid(),
      external_auth_id text unique,
      email text not null unique,
      full_name text not null,
      phone text,
      preferred_language text not null default 'en',
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
}

async function applyCanonicalTechCore() {
  const migrationUrl = new URL("../db/migrations/20260902_vgroup_tech_core.sql", import.meta.url);
  const migration = await readFile(migrationUrl, "utf8");
  if (!migration.includes("create table tech.projects")) throw new Error("canonical_tech_core_missing_projects_contract");
  await sql.unsafe(migration);
  const [proof] = await sql`select to_regclass('tech.projects')::text as projects, to_regclass('tech.clients')::text as clients, to_regclass('tech.subscriptions')::text as subscriptions`;
  if (proof?.projects !== "tech.projects" || proof?.clients !== "tech.clients" || proof?.subscriptions !== "tech.subscriptions") {
    throw new Error(`canonical_tech_core_incomplete:${JSON.stringify(proof ?? {})}`);
  }
  console.log("PASS canonical Tech core migration applied to isolated VGroup QA database");
}

async function bootstrapTechSaasReadContract() {
  await sql.unsafe(`
    create table if not exists tech.sla_incidents (
      id uuid primary key default gen_random_uuid(),
      project_id uuid references tech.projects(id) on delete cascade,
      subscription_id uuid references tech.subscriptions(id) on delete cascade,
      sla_rule_id uuid,
      title text not null,
      status text not null default 'open',
      opened_at timestamptz not null default now(),
      first_response_at timestamptz,
      resolved_at timestamptz
    );
    create index if not exists qa_sla_incidents_project_idx on tech.sla_incidents(project_id, opened_at);
    create index if not exists qa_sla_incidents_subscription_idx on tech.sla_incidents(subscription_id, opened_at);
    alter table tech.sla_incidents enable row level security;
    revoke all on tech.sla_incidents from anon, authenticated;
    grant all on tech.sla_incidents to service_role;
  `);
  const [proof] = await sql`select to_regclass('tech.sla_incidents')::text as sla_incidents`;
  if (proof?.sla_incidents !== "tech.sla_incidents") throw new Error("qa_tech_saas_read_contract_incomplete");
  console.log("PASS Tech SaaS read relation bootstrapped in isolated VGroup QA database");
}

try {
  await ensureSupabaseRoles();
  await bootstrapVGroupFoundation();
  await applyCanonicalTechCore();
  await bootstrapTechSaasReadContract();
} finally {
  await sql.end({ timeout: 2 });
}
