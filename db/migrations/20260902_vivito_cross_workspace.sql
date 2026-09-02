create table if not exists vgroup.vivito_tasks (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references vgroup.users(id) on delete restrict,
  workspace_code text not null check (workspace_code in ('group','marketing','hospitality','tech')),
  capability_key text not null,
  status text not null check (status in ('queued','waiting_approval','running','succeeded','failed','rejected','cancelled')),
  risk_level text not null check (risk_level in ('read','write','sensitive')),
  idempotency_key text not null,
  payload_redacted jsonb not null default '{}'::jsonb,
  result_redacted jsonb,
  error_code text,
  approved_by uuid references vgroup.users(id) on delete set null,
  approved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(actor_user_id,workspace_code,idempotency_key)
);
create table if not exists vgroup.vivito_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references vgroup.vivito_tasks(id) on delete cascade,
  actor_user_id uuid references vgroup.users(id) on delete set null,
  event_type text not null check (event_type in ('created','approval_required','approved','rejected','started','succeeded','failed','cancelled')),
  metadata_redacted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_vivito_tasks_actor_created on vgroup.vivito_tasks(actor_user_id,created_at desc);
create index if not exists idx_vivito_tasks_workspace_status on vgroup.vivito_tasks(workspace_code,status,created_at desc);
create index if not exists idx_vivito_task_events_task on vgroup.vivito_task_events(task_id,created_at);
alter table vgroup.vivito_tasks enable row level security;
alter table vgroup.vivito_task_events enable row level security;
drop policy if exists vivito_tasks_deny_client on vgroup.vivito_tasks;
create policy vivito_tasks_deny_client on vgroup.vivito_tasks for all to anon,authenticated using(false) with check(false);
drop policy if exists vivito_task_events_deny_client on vgroup.vivito_task_events;
create policy vivito_task_events_deny_client on vgroup.vivito_task_events for all to anon,authenticated using(false) with check(false);
revoke all on vgroup.vivito_tasks,vgroup.vivito_task_events from public,anon,authenticated;
grant select,insert,update,delete on vgroup.vivito_tasks,vgroup.vivito_task_events to service_role;
