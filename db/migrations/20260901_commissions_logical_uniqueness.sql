-- Stage 2 Database & Data Integrity hardening.
-- DO NOT apply to Production before Final CTO Acceptance / release migration gate.
-- A commission is logically unique by workspace, user, period, type and optional client.
-- Fail closed if duplicates already exist; never delete or merge financial rows automatically.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM commissions
    GROUP BY workspace_id, user_id, period, type, COALESCE(client_id, '')
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'commissions contains duplicate logical rows; reconcile before adding uniqueness';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_commissions_logical_identity
  ON commissions (workspace_id, user_id, period, type, COALESCE(client_id, ''));
