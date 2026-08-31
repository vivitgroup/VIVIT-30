-- Prevent any application path (UI/API/Vivito) from removing the final usable
-- SUPER_ADMIN from a workspace. A usable admin must be active and APPROVED.
-- Apply during the final release migration.

create or replace function enforce_last_active_super_admin()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'SUPER_ADMIN'
     and old.is_active = true
     and old.approval_status = 'APPROVED'
     and (
       new.role is distinct from 'SUPER_ADMIN'
       or new.is_active is distinct from true
       or new.approval_status is distinct from 'APPROVED'
     ) then
    if not exists (
      select 1
      from users u
      where u.workspace_id = old.workspace_id
        and u.id <> old.id
        and u.role = 'SUPER_ADMIN'
        and u.is_active = true
        and u.approval_status = 'APPROVED'
    ) then
      raise exception 'Cannot deactivate, demote, or unapprove the last active APPROVED SUPER_ADMIN in this workspace'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists users_last_super_admin_guard on users;
create trigger users_last_super_admin_guard
before update of role, is_active, approval_status on users
for each row
execute function enforce_last_active_super_admin();
