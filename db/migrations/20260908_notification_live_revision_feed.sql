create or replace function public.bump_notification_live_revision()
returns trigger
language plpgsql
as $$
declare
  uid text;
  wid text;
begin
  if tg_op = 'DELETE' then uid := old.user_id; else uid := new.user_id; end if;
  select workspace_id into wid from public.users where id=uid limit 1;
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

drop trigger if exists trg_live_notification_revision on public.notifications;
create trigger trg_live_notification_revision
after insert or update or delete on public.notifications
for each row execute function public.bump_notification_live_revision();
