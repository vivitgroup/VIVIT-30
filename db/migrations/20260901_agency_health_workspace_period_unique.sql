-- Stage 2 Database & Data Integrity hardening.
-- DO NOT apply to Production before Final CTO Acceptance / release migration gate.
-- Fail closed if historical duplicates exist; do not delete or merge business data automatically.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM agency_health_scores
    GROUP BY workspace_id, period
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'agency_health_scores contains duplicate (workspace_id, period) rows; reconcile before adding uniqueness';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_health_scores_workspace_period
  ON agency_health_scores (workspace_id, period);
