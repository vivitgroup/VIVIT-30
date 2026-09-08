-- Enterprise runtime parity migration
-- Makes a fresh database reproduce the columns/tables already required by runtime queries.
-- Idempotent by design so it is safe for CI bootstrap and existing environments.

ALTER TABLE creative_tasks ADD COLUMN IF NOT EXISTS archived_at timestamp;
ALTER TABLE creative_tasks ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS archived_at timestamp;
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS archived_at timestamp;
ALTER TABLE file_documents ADD COLUMN IF NOT EXISTS archived_at timestamp;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram_url text;

ALTER TABLE ad_performance_daily ADD COLUMN IF NOT EXISTS add_to_cart integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS live_workspace_revisions (
  workspace_id text PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_ledger_entries (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text,
  direction text NOT NULL,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  category text,
  description text,
  entry_date date NOT NULL DEFAULT current_date,
  created_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_workspace_date ON financial_ledger_entries(workspace_id,entry_date);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_client ON financial_ledger_entries(client_id);

CREATE TABLE IF NOT EXISTS client_payment_profiles (
  id text PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  workspace_id text NOT NULL,
  client_id text NOT NULL,
  payment_day integer,
  responsible_name text,
  phone text,
  currency text NOT NULL DEFAULT 'EGP',
  amount_due numeric(18,2) NOT NULL DEFAULT 0,
  amount_paid numeric(18,2) NOT NULL DEFAULT 0,
  amount_remaining numeric(18,2) NOT NULL DEFAULT 0,
  payment_ratio numeric(9,4) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'PENDING',
  source_account_manager text,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_client_payment_profile_workspace_client UNIQUE(workspace_id,client_id)
);
CREATE INDEX IF NOT EXISTS idx_client_payment_profiles_workspace ON client_payment_profiles(workspace_id);

CREATE INDEX IF NOT EXISTS idx_creative_tasks_workspace_archive ON creative_tasks(workspace_id,archived_at);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_workspace_archive ON ad_campaigns(workspace_id,archived_at);
CREATE INDEX IF NOT EXISTS idx_sales_leads_workspace_archive ON sales_leads(workspace_id,archived_at);
CREATE INDEX IF NOT EXISTS idx_file_documents_workspace_archive ON file_documents(workspace_id,archived_at);
