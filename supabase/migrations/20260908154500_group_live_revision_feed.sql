create table if not exists vgroup.live_revision(
  id smallint primary key default 1 check(id=1),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
insert into vgroup.live_revision(id,revision) values(1,0) on conflict(id) do nothing;

create or replace function vgroup.bump_live_revision() returns trigger
language plpgsql
set search_path='vgroup','pg_temp'
as $$
begin
  insert into vgroup.live_revision(id,revision,updated_at)
  values(1,1,now())
  on conflict(id) do update set revision=vgroup.live_revision.revision+1,updated_at=excluded.updated_at;
  return coalesce(new,old);
end;
$$;
revoke all on function vgroup.bump_live_revision() from public;

DO $$
declare r record;
begin
  for r in
    select t.table_schema,t.table_name
    from information_schema.tables t
    where t.table_type='BASE TABLE'
      and t.table_schema in ('vgroup','hospitality','tech')
      and not (t.table_schema='vgroup' and t.table_name in ('live_revision','audit_logs','auth_rate_limits','archive_log','vivito_task_events'))
      and t.table_name not like '%_log'
      and t.table_name not like '%_events'
  loop
    execute format('drop trigger if exists trg_group_live_revision on %I.%I',r.table_schema,r.table_name);
    execute format('create trigger trg_group_live_revision after insert or update or delete on %I.%I for each statement execute function vgroup.bump_live_revision()',r.table_schema,r.table_name);
  end loop;
end $$;
