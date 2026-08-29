-- VIVITO Direct Operator V1 persistence.
-- Server-side only. RLS is enabled with no browser policies so direct-table browser access stays fail-closed.
begin;

create table if not exists public.vivito_autonomy_events (
  id text primary key,
  workspace_id text not null default 'default',
  idempotency_key text not null unique,
  signal_type text not null,
  client_id text,
  action_op text not null,
  action_args jsonb not null default '{}'::jsonb,
  approval_mode text not null,
  status text not null default 'PROPOSED',
  actor_id text,
  evidence jsonb not null default '{}'::jsonb,
  execution_result jsonb,
  confirmed_by text,
  confirmed_at timestamptz,
  executed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vivito_autonomy_events_client_created on public.vivito_autonomy_events(client_id,created_at desc);
create index if not exists idx_vivito_autonomy_events_status on public.vivito_autonomy_events(status,created_at desc);

create table if not exists public.vivito_outcome_checks (
  id text primary key,
  workspace_id text not null default 'default',
  event_id text not null references public.vivito_autonomy_events(id) on delete cascade,
  horizon_hours integer not null check (horizon_hours in (24,48,72)),
  due_at timestamptz not null,
  checked_at timestamptz,
  status text not null default 'PENDING',
  baseline jsonb not null default '{}'::jsonb,
  observed jsonb,
  assessment text,
  created_at timestamptz not null default now(),
  unique(event_id,horizon_hours)
);
create index if not exists idx_vivito_outcome_checks_due on public.vivito_outcome_checks(status,due_at);

create table if not exists public.vivito_learning_signals (
  id text primary key,
  workspace_id text not null default 'default',
  kind text not null,
  text text not null,
  scope_type text,
  scope_id text,
  source text not null default 'DIRECT_OPERATOR',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_vivito_learning_signals_scope on public.vivito_learning_signals(scope_type,scope_id,created_at desc);

alter table public.vivito_autonomy_events enable row level security;
alter table public.vivito_outcome_checks enable row level security;
alter table public.vivito_learning_signals enable row level security;

commit;
