drop policy if exists system_maintenance_state_deny_all on public.system_maintenance_state;
create policy system_maintenance_state_deny_all
on public.system_maintenance_state
for all
to anon, authenticated
using (false)
with check (false);
