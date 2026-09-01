-- Pre-CTO feature gate: HR provisioning, task references and competitive reporting.
-- Additive/idempotent migration; no production execution is performed by this commit.

-- Campaign lifecycle existed with archived_at in the media model, but actor attribution
-- must be guaranteed for Archive/Delete Center traceability.
alter table if exists ad_campaigns add column if not exists archived_at timestamptz;
alter table if exists ad_campaigns add column if not exists archived_by text;
create index if not exists ad_campaigns_archive_scope_idx on ad_campaigns(workspace_id,client_id,archived_at desc);

create table if not exists task_references (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  task_id text not null,
  kind text not null check (kind in ('LINK','IMAGE')),
  url text not null,
  label text,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists task_references_scope_idx on task_references(workspace_id,task_id,created_at desc);

create table if not exists competitive_report_preferences (
  workspace_id text not null,
  client_id text not null,
  cadence text not null default 'WEEKLY' check (cadence in ('DAILY','EVERY_3_DAYS','WEEKLY')),
  send_to_client boolean not null default false,
  approved_by text,
  approved_at timestamptz,
  last_sent_at timestamptz,
  next_due_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(workspace_id,client_id)
);

create table if not exists competitive_report_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  client_id text not null,
  report_date date not null,
  cadence text not null,
  audience text not null check (audience in ('INTERNAL','CLIENT')),
  status text not null default 'PENDING' check (status in ('PENDING','SENT','FAILED','SKIPPED')),
  approved_by text,
  pdf_path text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workspace_id,client_id,report_date,cadence,audience)
);
create index if not exists competitive_report_deliveries_due_idx on competitive_report_deliveries(workspace_id,client_id,created_at desc);

-- user_roles/workspace_roles already provide many-to-many role assignment.
-- Seed an HR custom role per workspace only when explicitly provisioned by application code;
-- this migration intentionally does not grant new permissions automatically.
