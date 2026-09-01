-- VIVIT ERP — HR, lifecycle, task reference and competitor reporting contracts
-- Additive/idempotent migration. Production deployment remains gated by CTO acceptance.

DO $$ BEGIN
  ALTER TYPE role ADD VALUE IF NOT EXISTS 'HR';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by text;

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL DEFAULT 'default',
  user_id text NOT NULL,
  role text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,user_id,role)
);
CREATE INDEX IF NOT EXISTS user_role_assignments_user_idx ON user_role_assignments(workspace_id,user_id);

CREATE TABLE IF NOT EXISTS user_permission_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL DEFAULT 'default',
  user_id text NOT NULL,
  permission text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,user_id,permission)
);
CREATE INDEX IF NOT EXISTS user_permission_grants_user_idx ON user_permission_grants(workspace_id,user_id);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS report_frequency text NOT NULL DEFAULT 'WEEKLY';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS report_last_sent_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS report_next_due_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived_by text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_by text;

DO $$ BEGIN
  ALTER TABLE clients ADD CONSTRAINT clients_report_frequency_chk CHECK (report_frequency IN ('DAILY','EVERY_3_DAYS','WEEKLY'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE creative_tasks ADD COLUMN IF NOT EXISTS reference_url text;
ALTER TABLE creative_tasks ADD COLUMN IF NOT EXISTS reference_file_id text;
ALTER TABLE creative_tasks ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE creative_tasks ADD COLUMN IF NOT EXISTS archived_by text;
ALTER TABLE creative_tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE creative_tasks ADD COLUMN IF NOT EXISTS deleted_by text;

ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS archived_by text;
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS deleted_by text;

ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS archived_by text;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS deleted_by text;

CREATE TABLE IF NOT EXISTS lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL DEFAULT 'default',
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_name text,
  action text NOT NULL,
  actor_user_id text NOT NULL,
  actor_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lifecycle_events_workspace_action_idx ON lifecycle_events(workspace_id,action,created_at DESC);
CREATE INDEX IF NOT EXISTS lifecycle_events_entity_idx ON lifecycle_events(workspace_id,entity_type,entity_id,created_at DESC);

ALTER TABLE competitor_watchlists ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE competitor_watchlists ADD COLUMN IF NOT EXISTS report_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS competitor_report_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL DEFAULT 'default',
  client_id text NOT NULL,
  report_id text,
  report_period_start date,
  report_period_end date,
  status text NOT NULL DEFAULT 'PENDING',
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  client_delivery_requested boolean NOT NULL DEFAULT false,
  client_delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS competitor_report_approvals_client_idx ON competitor_report_approvals(workspace_id,client_id,created_at DESC);
DO $$ BEGIN
  ALTER TABLE competitor_report_approvals ADD CONSTRAINT competitor_report_approval_status_chk CHECK (status IN ('PENDING','APPROVED','REJECTED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS vivito_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL DEFAULT 'default',
  client_id text NOT NULL,
  report_type text NOT NULL DEFAULT 'COMPETITOR_MONITORING',
  cadence text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  report_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_storage_path text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  team_notified_at timestamptz,
  client_delivered_at timestamptz,
  UNIQUE(workspace_id,client_id,report_type,period_end)
);
CREATE INDEX IF NOT EXISTS vivito_report_runs_client_idx ON vivito_report_runs(workspace_id,client_id,generated_at DESC);
