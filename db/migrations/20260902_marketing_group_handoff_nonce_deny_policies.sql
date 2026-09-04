drop policy if exists group_handoff_nonces_anon_deny on public.group_handoff_nonces;
create policy group_handoff_nonces_anon_deny on public.group_handoff_nonces
  for all to anon using (false) with check (false);

drop policy if exists group_handoff_nonces_authenticated_deny on public.group_handoff_nonces;
create policy group_handoff_nonces_authenticated_deny on public.group_handoff_nonces
  for all to authenticated using (false) with check (false);
