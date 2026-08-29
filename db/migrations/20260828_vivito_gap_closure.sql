-- VIVITO zero-based gap closure: tenant-safe governance, runtime enforcement, recovery and audit.
begin;

-- Workspace-scoped governance uniqueness. NULL scope ids must still be unique.
alter table if exists public.vivito_governance_controls drop constraint if exists vivito_governance_controls_workspace_id_scope_type_scope_id_key;
drop index if exists public.uq_vivito_governance_scope;
create unique index if not exists uq_vivito_governance_scope
  on public.vivito_governance_controls(workspace_id,scope_type,coalesce(scope_id,'__WORKSPACE__'));

-- Checkpoints and backup keys are tenant scoped, never global.
alter table if exists public.vivito_runtime_checkpoints drop constraint if exists vivito_runtime_checkpoints_run_key_key;
drop index if exists public.uq_vivito_checkpoint_run_key;
create unique index if not exists uq_vivito_checkpoint_run_key
  on public.vivito_runtime_checkpoints(workspace_id,run_key);

alter table if exists public.vivito_backup_manifests drop constraint if exists vivito_backup_manifests_snapshot_key_key;
drop index if exists public.uq_vivito_backup_snapshot;
create unique index if not exists uq_vivito_backup_snapshot
  on public.vivito_backup_manifests(workspace_id,snapshot_key);

-- Runtime decision evidence, routing, sandbox and rollback state.
alter table public.vivito_autonomy_events
  add column if not exists evidence_quality real not null default 0,
  add column if not exists decision_route text,
  add column if not exists simulation jsonb,
  add column if not exists policy_version text,
  add column if not exists decision_version text,
  add column if not exists learning_fingerprint text,
  add column if not exists rollback_of_event_id text,
  add column if not exists rolled_back_at timestamptz,
  add column if not exists rolled_back_by text,
  add column if not exists rollback_result jsonb;
create index if not exists idx_vivito_event_learning_fingerprint
  on public.vivito_autonomy_events(workspace_id,client_id,learning_fingerprint,created_at desc);

-- Daily resource counters enforce action / AI budgets atomically.
create table if not exists public.vivito_resource_usage(
  id text primary key,
  workspace_id text not null,
  usage_date date not null default current_date,
  kind text not null check(kind in('ACTION','AI')),
  used integer not null default 0 check(used>=0),
  updated_at timestamptz not null default now(),
  unique(workspace_id,usage_date,kind)
);

-- Notification dedupe is explicit and tenant scoped.
create table if not exists public.vivito_notification_dedupe(
  id text primary key,
  workspace_id text not null,
  dedupe_key text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(workspace_id,dedupe_key)
);
create index if not exists idx_vivito_notification_dedupe_expiry
  on public.vivito_notification_dedupe(workspace_id,expires_at);

-- Security / abuse events are separate from business audit logs.
create table if not exists public.vivito_security_events(
  id text primary key,
  workspace_id text not null,
  actor_id text,
  event_type text not null,
  severity text not null check(severity in('LOW','MEDIUM','HIGH','CRITICAL')),
  fingerprint text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_vivito_security_workspace_created
  on public.vivito_security_events(workspace_id,created_at desc);

-- Backup manifests now prove export checksum and restore verification details.
alter table public.vivito_backup_manifests
  add column if not exists format_version integer not null default 1,
  add column if not exists verified_checksum text,
  add column if not exists restore_record_counts jsonb not null default '{}'::jsonb,
  add column if not exists verification_details jsonb not null default '{}'::jsonb;

-- Provenance lookup and supersession integrity.
create index if not exists idx_vivito_provenance_active
  on public.vivito_knowledge_provenance(workspace_id,scope_type,scope_id,expires_at,created_at desc);

alter table public.vivito_resource_usage enable row level security;
alter table public.vivito_notification_dedupe enable row level security;
alter table public.vivito_security_events enable row level security;

commit;
