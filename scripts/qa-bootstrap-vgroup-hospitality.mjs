import {readFile} from "node:fs/promises";
import postgres from "postgres";

const databaseUrl=process.env.VGROUP_DATABASE_URL;
if(!databaseUrl)throw new Error("missing_required_env:VGROUP_DATABASE_URL");

const sql=postgres(databaseUrl,{ssl:false,max:1,prepare:false});

async function ensurePgRoles(){
  await sql.unsafe(`
    do $$
    begin
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
    end
    $$;
  `);
}

async function ensureVGroupContract(){
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
      business_unit_id uuid references vgroup.business_units(id),
      description text,
      is_system boolean not null default true,
      created_at timestamptz not null default now(),
      unique(code,business_unit_id)
    );

    create table if not exists vgroup.permissions (
      id uuid primary key default gen_random_uuid(),
      module text not null,
      action text not null,
      business_unit_id uuid references vgroup.business_units(id),
      created_at timestamptz not null default now(),
      unique(module,action,business_unit_id)
    );

    create table if not exists vgroup.role_permissions (
      id uuid primary key default gen_random_uuid(),
      role_id uuid not null references vgroup.roles(id) on delete cascade,
      permission_id uuid not null references vgroup.permissions(id) on delete cascade,
      created_at timestamptz not null default now(),
      unique(role_id,permission_id)
    );

    create table if not exists vgroup.user_business_unit_roles (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references vgroup.users(id) on delete cascade,
      business_unit_id uuid not null references vgroup.business_units(id) on delete cascade,
      role_id uuid not null references vgroup.roles(id) on delete cascade,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id,business_unit_id,role_id)
    );

    create table if not exists vgroup.auth_rate_limits (
      key_hash text primary key,
      window_start timestamptz not null default now(),
      attempt_count integer not null default 0 check(attempt_count>=0),
      updated_at timestamptz not null default now()
    );

    create table if not exists vgroup.employees (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references vgroup.users(id) on delete cascade,
      business_unit_id uuid not null references vgroup.business_units(id) on delete cascade,
      job_title text,
      hire_date date,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id,business_unit_id)
    );

    create table if not exists vgroup.employee_permissions (
      id uuid primary key default gen_random_uuid(),
      employee_id uuid not null references vgroup.employees(id) on delete cascade,
      permission_id uuid not null references vgroup.permissions(id) on delete cascade,
      effect text not null default 'allow' check(effect in ('allow','deny')),
      granted_by uuid references vgroup.users(id),
      granted_at timestamptz not null default now(),
      unique(employee_id,permission_id)
    );

    create table if not exists vgroup.audit_logs (
      id uuid primary key default gen_random_uuid(),
      business_unit_id uuid references vgroup.business_units(id) on delete set null,
      user_id uuid references vgroup.users(id) on delete set null,
      action text not null,
      entity_type text,
      entity_id uuid,
      old_value jsonb,
      new_value jsonb,
      created_at timestamptz not null default now()
    );

    insert into vgroup.business_units(code,display_name_ar,display_name_en,status)
    values('hospitality','الضيافة','Hospitality','active')
    on conflict(code) do update set status='active',updated_at=now();
  `);
}

async function relationExists(name){
  const [row]=await sql`select to_regclass(${name})::text as relation`;
  return Boolean(row?.relation);
}

async function applyMigration(file){
  const source=await readFile(new URL(`../db/migrations/${file}`,import.meta.url),"utf8");
  await sql.unsafe(source);
  console.log(`PASS applied ${file}`);
}

async function ensureHospitalitySchema(){
  if(!await relationExists("hospitality.properties")){
    await applyMigration("20260902_vgroup_hospitality_core.sql");
  }
  if(!await relationExists("hospitality.property_images")){
    await applyMigration("20260902_hospitality_property_ownership_and_media_v1.sql");
  }
  if(!await relationExists("hospitality.invoice_receipts")){
    await applyMigration("20260902_hospitality_property_bound_expenses_and_receipts.sql");
  }

  for(const relation of [
    "vgroup.roles",
    "vgroup.permissions",
    "vgroup.role_permissions",
    "vgroup.user_business_unit_roles",
    "vgroup.employees",
    "vgroup.employee_permissions",
    "vgroup.audit_logs",
    "hospitality.properties",
    "hospitality.reservations",
    "hospitality.invoices",
    "hospitality.property_images",
    "hospitality.invoice_receipts",
  ]){
    if(!await relationExists(relation))throw new Error(`hospitality_qa_bootstrap_missing_relation:${relation}`);
  }
}

try{
  await ensurePgRoles();
  await ensureVGroupContract();
  await ensureHospitalitySchema();
  console.log("PASS VGroup Hospitality QA contract bootstrapped");
}finally{
  await sql.end({timeout:5});
}
