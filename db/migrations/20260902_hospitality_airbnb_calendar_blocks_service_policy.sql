-- RETIRED SECURITY MIGRATION.
-- Supabase service_role bypasses RLS and must not receive a permissive USING (true)
-- policy. Fresh databases keep this policy absent; databases that applied the
-- earlier version are cleaned by 20260904_hospitality_remove_calendar_blocks_service_policy.sql.
DROP POLICY IF EXISTS calendar_blocks_service_role ON hospitality.calendar_blocks;
