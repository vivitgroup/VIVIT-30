-- Finance Deep Audit candidate migration — DO NOT auto-run on Production.
-- Purpose: convert finance-grade money values from floating-point REAL to NUMERIC(18,2)
-- and enforce one invoice per workspace/client/period at the database layer.
-- Execution requires: duplicate preflight = 0, backup/rollback checkpoint, Preview/Test certification,
-- and explicit release approval.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM finance_records
    GROUP BY workspace_id, client_id, year, month
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'finance_records contains duplicate workspace/client/period rows; deduplicate before migration';
  END IF;
END $$;

ALTER TABLE finance_records
  ALTER COLUMN retainer TYPE numeric(18,2) USING round(retainer::numeric, 2),
  ALTER COLUMN media_buying_fee TYPE numeric(18,2) USING round(media_buying_fee::numeric, 2),
  ALTER COLUMN extra_services TYPE numeric(18,2) USING round(extra_services::numeric, 2),
  ALTER COLUMN total_revenue TYPE numeric(18,2) USING round(total_revenue::numeric, 2),
  ALTER COLUMN paid TYPE numeric(18,2) USING round(paid::numeric, 2),
  ALTER COLUMN outstanding TYPE numeric(18,2) USING round(outstanding::numeric, 2),
  ALTER COLUMN commission_rate TYPE numeric(9,4) USING round(commission_rate::numeric, 4),
  ALTER COLUMN commission_paid TYPE numeric(18,2) USING round(commission_paid::numeric, 2);

ALTER TABLE company_expenses
  ALTER COLUMN amount TYPE numeric(18,2) USING round(amount::numeric, 2);

ALTER TABLE payment_records
  ALTER COLUMN amount TYPE numeric(18,2) USING round(amount::numeric, 2);

ALTER TABLE payroll
  ALTER COLUMN base_salary TYPE numeric(18,2) USING round(base_salary::numeric, 2),
  ALTER COLUMN bonus TYPE numeric(18,2) USING round(bonus::numeric, 2),
  ALTER COLUMN deductions TYPE numeric(18,2) USING round(deductions::numeric, 2),
  ALTER COLUMN net_pay TYPE numeric(18,2) USING round(net_pay::numeric, 2);

ALTER TABLE chart_of_accounts
  ALTER COLUMN balance TYPE numeric(18,2) USING round(balance::numeric, 2);

ALTER TABLE journal_entries
  ALTER COLUMN total_debit TYPE numeric(18,2) USING round(total_debit::numeric, 2),
  ALTER COLUMN total_credit TYPE numeric(18,2) USING round(total_credit::numeric, 2);

ALTER TABLE journal_lines
  ALTER COLUMN debit TYPE numeric(18,2) USING round(debit::numeric, 2),
  ALTER COLUMN credit TYPE numeric(18,2) USING round(credit::numeric, 2);

ALTER TABLE purchase_orders
  ALTER COLUMN amount TYPE numeric(18,2) USING round(amount::numeric, 2),
  ALTER COLUMN tax TYPE numeric(18,2) USING round(tax::numeric, 2),
  ALTER COLUMN total TYPE numeric(18,2) USING round(total::numeric, 2);

ALTER TABLE expense_claims
  ALTER COLUMN amount TYPE numeric(18,2) USING round(amount::numeric, 2);

ALTER TABLE project_budgets
  ALTER COLUMN total_budget TYPE numeric(18,2) USING round(total_budget::numeric, 2),
  ALTER COLUMN spent_budget TYPE numeric(18,2) USING round(spent_budget::numeric, 2);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_records_workspace_client_period
  ON finance_records (workspace_id, client_id, year, month);

COMMIT;
