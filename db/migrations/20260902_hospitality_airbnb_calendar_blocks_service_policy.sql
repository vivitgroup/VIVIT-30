do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='hospitality' and tablename='calendar_blocks' and policyname='calendar_blocks_service_role'
  ) then
    create policy calendar_blocks_service_role
      on hospitality.calendar_blocks
      for all to service_role
      using (true)
      with check (true);
  end if;
end $$;
