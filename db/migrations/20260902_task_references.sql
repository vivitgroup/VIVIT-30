create table if not exists public.task_references (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  task_id text not null references public.creative_tasks(id) on delete cascade,
  kind text not null default 'LINK' check (kind in ('LINK','IMAGE')),
  url text not null,
  label text,
  created_by text references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists task_references_workspace_task_created_idx
  on public.task_references (workspace_id, task_id, created_at desc);

create index if not exists task_references_task_id_idx
  on public.task_references (task_id);

create index if not exists task_references_created_by_idx
  on public.task_references (created_by);

alter table public.task_references enable row level security;

drop policy if exists server_only_default_deny on public.task_references;
create policy server_only_default_deny
  on public.task_references
  for all
  to anon, authenticated
  using (false)
  with check (false);
