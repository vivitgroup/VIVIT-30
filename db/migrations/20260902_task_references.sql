create table if not exists public.task_references (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  task_id text not null references public.creative_tasks(id) on delete cascade,
  kind text not null,
  url text not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists task_references_workspace_task_created_idx
  on public.task_references (workspace_id, task_id, created_at desc);

create index if not exists task_references_task_idx
  on public.task_references (task_id);
