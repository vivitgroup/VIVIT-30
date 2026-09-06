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
    create table if not exists vgroup.roles (
      id uuid primary key default gen_random_uuid(),
      code text not null,
      business_unit_id uuid references vgroup.business_units(id) on delete cascade,
      description text,
      is_system boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create unique index if not exists qa_vgroup_roles_scope_code
      on vgroup.roles ((coalesce(business_unit_id, '00000000-0000-0000-0000-000000000000'::uuid)), code);
    create table if not exists vgroup.permissions (
      id uuid primary key default gen_random_uuid(),
      module text not null,
      action text not null,
      business_unit_id uuid references vgroup.business_units(id) on delete cascade,
      created_at timestamptz not null default now()
    );
    create unique index if not exists qa_vgroup_permissions_scope_module_action
      on vgroup.permissions ((coalesce(business_unit_id, '00000000-0000-0000-0000-000000000000'::uuid)), module, action);
    create table if not exists vgroup.role_permissions (
      id uuid primary key default gen_random_uuid(),
      role_id uuid not null references vgroup.roles(id) on delete cascade,
      permission_id uuid not null references vgroup.permissions(id) on delete cascade,
      created_at timestamptz not null default now(),
      unique(role_id, permission_id)
    );
    create table if not exists vgroup.user_business_unit_roles (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references vgroup.users(id) on delete cascade,
      business_unit_id uuid not null references vgroup.business_units(id) on delete cascade,
      role_id uuid not null references vgroup.roles(id) on delete cascade,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id, business_unit_id, role_id)
    );
    create table if not exists vgroup.employees (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references vgroup.users(id) on delete cascade,
      business_unit_id uuid not null references vgroup.business_units(id) on delete cascade,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id, business_unit_id)
    );
    create table if not exists vgroup.employee_permissions (
      id uuid primary key default gen_random_uuid(),
      employee_id uuid not null references vgroup.employees(id) on delete cascade,
      permission_id uuid not null references vgroup.permissions(id) on delete cascade,
      effect text not null check (effect in ('allow','deny')),
      granted_by uuid references vgroup.users(id),
      created_at timestamptz not null default now(),
      unique(employee_id, permission_id)
    );
    create table if not exists vgroup.audit_logs (
      id uuid primary key default gen_random_uuid(),
      business_unit_id uuid references vgroup.business_units(id),
      user_id uuid references vgroup.users(id),
      action text not null,
      entity_type text not null,
      entity_id uuid,
      old_value jsonb,
      new_value jsonb,
      created_at timestamptz not null default now()
    );
    insert into vgroup.business_units(code, display_name_ar, display_name_en, status)
    values ('tech', 'فيفيت تك', 'Vivit Tech', 'active')
    on conflict (code) do update
      set display_name_ar = excluded.display_name_ar,
          display_name_en = excluded.display_name_en,
          status = 'active',
          updated_at = now();
  `);
  const [proof] = await sql`
    select
      to_regclass('vgroup.roles')::text as roles,
      to_regclass('vgroup.permissions')::text as permissions,
      to_regclass('vgroup.role_permissions')::text as role_permissions,
      to_regclass('vgroup.user_business_unit_roles')::text as memberships,
      to_regclass('vgroup.employees')::text as employees,
      to_regclass('vgroup.employee_permissions')::text as employee_permissions,
      to_regclass('vgroup.audit_logs')::text as audit_logs,
      exists(select 1 from vgroup.business_units where code='tech' and status='active') as tech_unit
  `;
  if (
    proof?.roles !== "vgroup.roles" ||
    proof?.permissions !== "vgroup.permissions" ||
    proof?.role_permissions !== "vgroup.role_permissions" ||
    proof?.memberships !== "vgroup.user_business_unit_roles" ||
    proof?.employees !== "vgroup.employees" ||
    proof?.employee_permissions !== "vgroup.employee_permissions" ||
    proof?.audit_logs !== "vgroup.audit_logs" ||
    proof?.tech_unit !== true
  ) throw new Error(`qa_vgroup_rbac_foundation_incomplete:${JSON.stringify(proof ?? {})}`);
  console.log("PASS VGroup RBAC foundation + active Tech unit bootstrapped in isolated QA database");
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

async function applyCanonicalTechActionTables() {
  const migrationUrl = new URL("../db/migrations/20260902_tech_business_operating_system_v2.sql", import.meta.url);
  const migration = await readFile(migrationUrl, "utf8");
  const firstDeferredDependency = "create table if not exists tech.support_contracts (";
  const boundary = migration.indexOf(firstDeferredDependency);
  if (boundary < 0) throw new Error("canonical_tech_operating_system_action_boundary_missing");
  const actionTables = migration.slice(0, boundary);
  if (!actionTables.includes("create table if not exists tech.resource_capacity")) throw new Error("canonical_tech_operating_system_missing_resource_capacity");
  if (!actionTables.includes("create table if not exists tech.timesheets")) throw new Error("canonical_tech_operating_system_missing_timesheets");
  await sql.unsafe(actionTables);
  const [proof] = await sql`select to_regclass('tech.resource_capacity')::text as resource_capacity, to_regclass('tech.timesheets')::text as timesheets`;
  if (proof?.resource_capacity !== "tech.resource_capacity" || proof?.timesheets !== "tech.timesheets") {
    throw new Error(`canonical_tech_action_tables_incomplete:${JSON.stringify(proof ?? {})}`);
  }
  console.log("PASS canonical Tech operating-system action tables applied to isolated VGroup QA database");
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
  await applyCanonicalTechActionTables();
  await bootstrapTechSaasReadContract();
} finally {
  await sql.end({ timeout: 2 });
}