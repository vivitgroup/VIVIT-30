create table if not exists public.system_maintenance_state (
  maintenance_key text primary key,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_status text,
  updated_at timestamptz not null default now()
);

alter table public.system_maintenance_state enable row level security;
revoke all on public.system_maintenance_state from anon, authenticated;

comment on table public.system_maintenance_state is 'Server-only coordination state for globally throttled maintenance jobs.';
