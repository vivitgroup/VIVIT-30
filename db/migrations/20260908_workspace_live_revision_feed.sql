create table if not exists public.live_workspace_revisions (
  workspace_id text primary key,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.live_workspace_revisions enable row level security;
drop policy if exists server_only_default_deny on public.live_workspace_revisions;
create policy server_only_default_deny on public.live_workspace_revisions
for all to anon, authenticated using (false) with check (false);

create or replace function public.bump_live_workspace_revision()
returns trigger
language plpgsql
as $$
declare
  wid text;
begin
  if tg_op = 'DELETE' then
    wid := old.workspace_id;
  else
    wid := new.workspace_id;
  end if;

  if wid is not null and wid <> '' then
    insert into public.live_workspace_revisions(workspace_id, revision, updated_at)
    values (wid, 1, now())
    on conflict (workspace_id) do update
      set revision = public.live_workspace_revisions.revision + 1,
          updated_at = now();
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema=c.table_schema and t.table_name=c.table_name
    where c.table_schema='public'
      and c.column_name='workspace_id'
      and t.table_type='BASE TABLE'
      and c.table_name <> 'live_workspace_revisions'
      and c.table_name <> 'audit_logs'
      and c.table_name <> 'usage_events'
      and c.table_name <> 'ai_generations'
      and c.table_name not like 'vivito\_%' escape '\'
  loop
    execute format('drop trigger if exists trg_live_revision on public.%I', r.table_name);
    execute format(
      'create trigger trg_live_revision after insert or update or delete on public.%I for each row execute function public.bump_live_workspace_revision()',
      r.table_name
    );
  end loop;
end $$;
