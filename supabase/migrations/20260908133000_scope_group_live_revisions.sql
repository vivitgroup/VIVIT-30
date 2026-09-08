create table if not exists vgroup.live_revision_scopes (
  scope text primary key check (scope in ('group','hospitality','tech')),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into vgroup.live_revision_scopes(scope,revision)
values ('group',0),('hospitality',0),('tech',0)
on conflict (scope) do nothing;

create or replace function vgroup.bump_live_revision_scoped()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, vgroup
as $$
begin
  if tg_table_schema='hospitality' then
    update vgroup.live_revision_scopes set revision=revision+1,updated_at=now() where scope='hospitality';
  elsif tg_table_schema='tech' then
    update vgroup.live_revision_scopes set revision=revision+1,updated_at=now() where scope='tech';
  else
    update vgroup.live_revision_scopes set revision=revision+1,updated_at=now() where scope in ('group','hospitality','tech');
  end if;
  return null;
end;
$$;

revoke all on vgroup.live_revision_scopes from public, anon, authenticated;
revoke all on function vgroup.bump_live_revision_scoped() from public;

do $$
declare r record;
begin
  for r in
    select distinct event_object_schema as schema_name,event_object_table as table_name
    from information_schema.triggers
    where trigger_name='trg_group_live_revision'
  loop
    execute format('drop trigger if exists trg_group_live_revision on %I.%I',r.schema_name,r.table_name);
    execute format('create trigger trg_group_live_revision after insert or update or delete on %I.%I for each statement execute function vgroup.bump_live_revision_scoped()',r.schema_name,r.table_name);
  end loop;
end $$;
