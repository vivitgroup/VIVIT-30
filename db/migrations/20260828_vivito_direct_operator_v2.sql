-- VIVITO Direct Operator V2: tenant-safe persistence, approval history, retries, decisions and escalations.
-- Server-side architecture: RLS is enabled without permissive browser policies.
begin;

alter table public.vivito_autonomy_events
  add column if not exists retry_count integer not null default 0,
  add column if not exists max_retries integer not null default 3,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists rejected_by text,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists outcome_state text,
  add column if not exists confidence_before real,
  add column if not exists confidence_after real;

-- Replace the legacy global idempotency uniqueness with tenant-scoped uniqueness.
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid='public.vivito_autonomy_events'::regclass
      and contype='u'
      and pg_get_constraintdef(oid) ilike '%idempotency_key%'
  loop
    execute format('alter table public.vivito_autonomy_events drop constraint %I',r.conname);
  end loop;
end $$;
create unique index if not exists uq_vivito_event_workspace_idempotency
  on public.vivito_autonomy_events(workspace_id,idempotency_key);
create index if not exists idx_vivito_event_retry_due
  on public.vivito_autonomy_events(workspace_id,status,next_retry_at);

create table if not exists public.vivito_approval_events (
  id text primary key,
  workspace_id text not null,
  event_id text not null references public.vivito_autonomy_events(id) on delete cascade,
  actor_id text not null,
  decision text not null check (decision in ('APPROVED','REJECTED')),
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_vivito_approval_event on public.vivito_approval_events(workspace_id,event_id,created_at desc);

create table if not exists public.vivito_decision_journal (
  id text primary key,
  workspace_id text not null,
  event_id text references public.vivito_autonomy_events(id) on delete set null,
  client_id text,
  decision_type text not null,
  signal_type text not null,
  evidence_summary jsonb not null default '{}'::jsonb,
  rationale_summary text not null,
  expected_outcome text,
  decision_status text not null default 'PROPOSED' check (decision_status in ('PROPOSED','AWAITING_CONFIRMATION','EXECUTED','REJECTED','FAILED','BLOCKED','RETRY_SCHEDULED','CHECKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vivito_decision_workspace_client on public.vivito_decision_journal(workspace_id,client_id,created_at desc);
create index if not exists idx_vivito_decision_event on public.vivito_decision_journal(event_id);

create table if not exists public.vivito_escalations (
  id text primary key,
  workspace_id text not null,
  event_id text references public.vivito_autonomy_events(id) on delete set null,
  client_id text,
  assigned_to_id text,
  severity text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','ACKNOWLEDGED','RESOLVED')),
  dedupe_key text not null,
  message text not null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_vivito_escalation_workspace_dedupe on public.vivito_escalations(workspace_id,dedupe_key);
create index if not exists idx_vivito_escalation_open on public.vivito_escalations(workspace_id,status,severity,created_at desc);

alter table public.vivito_learning_signals
  add column if not exists event_id text,
  add column if not exists outcome_state text,
  add column if not exists confidence real,
  add column if not exists lesson text;
create index if not exists idx_vivito_learning_event on public.vivito_learning_signals(workspace_id,event_id,created_at desc);

alter table public.vivito_approval_events enable row level security;
alter table public.vivito_decision_journal enable row level security;
alter table public.vivito_escalations enable row level security;

-- Existing tables discovered exposed through client roles are server-only in this architecture.
-- Enable RLS fail-closed; the server database connection remains the controlled access path.
alter table if exists public.client_competitors enable row level security;
alter table if exists public.operational_tasks enable row level security;

commit;
