-- Stage 2 Database & Data Integrity hardening.
-- DO NOT apply to Production before Final CTO Acceptance / release migration gate.
-- Business invariant: one finance record per workspace/client/month/year.
-- Fail closed if historical duplicates exist; do not delete or merge financial data automatically.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM finance_records
    GROUP BY workspace_id, client_id, year, month
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'finance_records contains duplicate invoice-period rows; reconcile before adding uniqueness';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_records_workspace_client_period
  ON finance_records (workspace_id, client_id, year, month);
