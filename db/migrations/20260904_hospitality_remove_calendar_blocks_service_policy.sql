-- Remove the obsolete permissive service-role policy from Hospitality calendar blocks.
-- Supabase service_role bypasses RLS already, so an explicit USING (true) / WITH CHECK (true)
-- policy is unnecessary and weakens the database security posture.
DROP POLICY IF EXISTS calendar_blocks_service_role ON hospitality.calendar_blocks;
