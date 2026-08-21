-- ═══════════════════════════════════════════════════════════════
-- Vivit CRM — Complete SQL Migration (run in Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN CREATE TYPE role AS ENUM ('SUPER_ADMIN','ACCOUNTANT','ACCOUNT_MANAGER','MEDIA_BUYER','CREATOR','SALES','CLIENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('PENDING','IN_PROGRESS','REVIEW','APPROVED','REJECTED','REVISION','COMPLETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('LOW','MEDIUM','HIGH','URGENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE creative_type AS ENUM ('GRAPHIC','CAROUSEL','MOTION_GRAPHIC','VIDEO_EDIT','PHOTO_SESSION','REEL','STORY','UGC'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE lead_stage AS ENUM ('NEW_LEAD','CONTACTED','QUALIFIED','PROPOSAL_SENT','NEGOTIATION','WON','LOST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invoice_status AS ENUM ('DRAFT','SENT','PAID','OVERDUE','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE plan AS ENUM ('FREE','STARTER','PROFESSIONAL','ENTERPRISE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  plan plan NOT NULL DEFAULT 'FREE',
  primary_color TEXT NOT NULL DEFAULT '#0077B6',
  logo_url TEXT, favicon_url TEXT, custom_domain TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  agency_fee_percent REAL NOT NULL DEFAULT 20,
  timezone TEXT NOT NULL DEFAULT 'Africa/Cairo',
  max_clients INTEGER NOT NULL DEFAULT 5,
  max_users INTEGER NOT NULL DEFAULT 3,
  slack_webhook_url TEXT, resend_api_key TEXT, anthropic_api_key TEXT,
  stripe_customer_id TEXT, billing_email TEXT, trial_ends_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO workspaces (id,name,slug,plan,max_clients,max_users) VALUES ('default','VIVIT GROUP','vivit-group','PROFESSIONAL',999,999) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
  role role NOT NULL DEFAULT 'CLIENT', avatar TEXT, phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true, last_login_at TIMESTAMP,
  approval_status TEXT NOT NULL DEFAULT 'APPROVED',
  requested_role role, approval_note TEXT, approved_by TEXT,
  approved_at TIMESTAMP, rejected_at TIMESTAMP,
  is_workspace_owner BOOLEAN NOT NULL DEFAULT false, api_key TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role role;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_note TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id, expires_at);

CREATE TABLE IF NOT EXISTS file_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default', uploaded_by TEXT NOT NULL,
  client_id TEXT, task_id TEXT, name TEXT NOT NULL, storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT, size_bytes INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'GENERAL', created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_file_documents_workspace ON file_documents(workspace_id, created_at DESC);
+
CREATE TABLE IF NOT EXISTS ad_platform_connections (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, workspace_id TEXT NOT NULL DEFAULT 'default', client_id TEXT,
 platform TEXT NOT NULL, ad_account_id TEXT NOT NULL, account_name TEXT, access_token_encrypted TEXT, refresh_token_encrypted TEXT,
 token_expires_at TIMESTAMP, status TEXT NOT NULL DEFAULT 'PENDING', last_sync_at TIMESTAMP, sync_error TEXT,
 created_by TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
 UNIQUE(platform,ad_account_id)
);
CREATE TABLE IF NOT EXISTS ad_campaigns (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, workspace_id TEXT NOT NULL DEFAULT 'default', client_id TEXT NOT NULL, connection_id TEXT,
 platform TEXT NOT NULL, external_id TEXT NOT NULL, name TEXT NOT NULL, objective TEXT NOT NULL DEFAULT 'LEADS', status TEXT NOT NULL DEFAULT 'UNKNOWN',
 campaign_url TEXT, daily_budget REAL NOT NULL DEFAULT 0, lifetime_budget REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'EGP',
 target_result REAL NOT NULL DEFAULT 0, target_cpl REAL NOT NULL DEFAULT 0, target_cpa REAL NOT NULL DEFAULT 0, target_roas REAL NOT NULL DEFAULT 0,
 start_date TIMESTAMP, end_date TIMESTAMP, last_sync_at TIMESTAMP, created_by TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
 UNIQUE(platform,external_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_client ON ad_campaigns(client_id,status);
CREATE TABLE IF NOT EXISTS ad_sets (id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,campaign_id TEXT NOT NULL,external_id TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'UNKNOWN',budget REAL NOT NULL DEFAULT 0,optimization_goal TEXT,audience TEXT,placements TEXT,created_at TIMESTAMP NOT NULL DEFAULT NOW(),updated_at TIMESTAMP NOT NULL DEFAULT NOW(),UNIQUE(campaign_id,external_id));
CREATE TABLE IF NOT EXISTS ads (id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,campaign_id TEXT NOT NULL,ad_set_id TEXT,external_id TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'UNKNOWN',creative_task_id TEXT,creative_url TEXT,headline TEXT,copy TEXT,created_at TIMESTAMP NOT NULL DEFAULT NOW(),updated_at TIMESTAMP NOT NULL DEFAULT NOW(),UNIQUE(campaign_id,external_id));
CREATE TABLE IF NOT EXISTS ad_performance_daily (id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,campaign_id TEXT NOT NULL,ad_set_id TEXT,ad_id TEXT,date TIMESTAMP NOT NULL,breakdown_type TEXT NOT NULL DEFAULT 'TOTAL',breakdown_value TEXT NOT NULL DEFAULT 'ALL',spend REAL NOT NULL DEFAULT 0,impressions INTEGER NOT NULL DEFAULT 0,reach INTEGER NOT NULL DEFAULT 0,clicks INTEGER NOT NULL DEFAULT 0,results INTEGER NOT NULL DEFAULT 0,qualified_leads INTEGER NOT NULL DEFAULT 0,purchases INTEGER NOT NULL DEFAULT 0,revenue REAL NOT NULL DEFAULT 0,frequency REAL NOT NULL DEFAULT 0,ctr REAL NOT NULL DEFAULT 0,cpc REAL NOT NULL DEFAULT 0,cpm REAL NOT NULL DEFAULT 0,cpl REAL NOT NULL DEFAULT 0,cpa REAL NOT NULL DEFAULT 0,roas REAL NOT NULL DEFAULT 0,created_at TIMESTAMP NOT NULL DEFAULT NOW(),UNIQUE(campaign_id,ad_id,date,breakdown_type,breakdown_value));
CREATE INDEX IF NOT EXISTS idx_perf_campaign_date ON ad_performance_daily(campaign_id,date);
CREATE TABLE IF NOT EXISTS media_actions (id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,campaign_id TEXT NOT NULL,user_id TEXT NOT NULL,action TEXT NOT NULL,old_value TEXT,new_value TEXT,reason TEXT,result_after TEXT,created_at TIMESTAMP NOT NULL DEFAULT NOW(),reviewed_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS media_plans (id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,workspace_id TEXT NOT NULL DEFAULT 'default',client_id TEXT NOT NULL,name TEXT NOT NULL,period_start TIMESTAMP NOT NULL,period_end TIMESTAMP NOT NULL,total_budget REAL NOT NULL DEFAULT 0,allocation TEXT NOT NULL DEFAULT '[]',forecast TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'DRAFT',submitted_by TEXT NOT NULL,approved_by TEXT,approved_at TIMESTAMP,client_note TEXT,created_at TIMESTAMP NOT NULL DEFAULT NOW(),updated_at TIMESTAMP NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS tracking_health (id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,client_id TEXT NOT NULL,platform TEXT NOT NULL,pixel_status TEXT NOT NULL DEFAULT 'UNKNOWN',capi_status TEXT NOT NULL DEFAULT 'UNKNOWN',utm_status TEXT NOT NULL DEFAULT 'UNKNOWN',landing_page_status TEXT NOT NULL DEFAULT 'UNKNOWN',events TEXT NOT NULL DEFAULT '[]',issues TEXT NOT NULL DEFAULT '[]',checked_at TIMESTAMP NOT NULL DEFAULT NOW(),UNIQUE(client_id,platform));


CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  company_name TEXT NOT NULL, industry TEXT, website TEXT, logo TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  health_score REAL NOT NULL DEFAULT 100,
  performance_score REAL NOT NULL DEFAULT 100,
  churn_risk TEXT NOT NULL DEFAULT 'LOW',
  churn_probability REAL NOT NULL DEFAULT 0,
  monthly_retainer REAL NOT NULL DEFAULT 0,
  media_budget REAL NOT NULL DEFAULT 0,
  contract_value REAL NOT NULL DEFAULT 0,
  contract_start TIMESTAMP, contract_end TIMESTAMP,
  meta_ads_link TEXT, tiktok_ads_link TEXT, snapchat_ads_link TEXT, google_ads_link TEXT,
  color_palette TEXT, internal_notes TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  nps_score REAL, lifetime_value REAL NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0, tasks_total INTEGER NOT NULL DEFAULT 0,
  user_id TEXT UNIQUE, account_manager_id TEXT, media_buyer_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL, name TEXT NOT NULL, title TEXT,
  email TEXT, phone TEXT, whatsapp TEXT, is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  client_id TEXT NOT NULL, platform TEXT NOT NULL, date TIMESTAMP NOT NULL,
  ad_spend REAL NOT NULL DEFAULT 0, leads INTEGER NOT NULL DEFAULT 0,
  purchases INTEGER NOT NULL DEFAULT 0, add_to_cart INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0, impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  roas REAL NOT NULL DEFAULT 0, cpl REAL NOT NULL DEFAULT 0, cpa REAL NOT NULL DEFAULT 0,
  agency_fee REAL NOT NULL DEFAULT 0, total_due REAL NOT NULL DEFAULT 0,
  remaining_budget REAL NOT NULL DEFAULT 0, prev_month_spend REAL, target_leads INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creative_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  client_id TEXT NOT NULL, title TEXT NOT NULL, brief TEXT NOT NULL,
  tov TEXT, deadline TIMESTAMP NOT NULL,
  priority task_priority NOT NULL DEFAULT 'MEDIUM',
  status task_status NOT NULL DEFAULT 'PENDING',
  type creative_type NOT NULL,
  caption TEXT, file_url TEXT, revision_notes TEXT,
  revision_count INTEGER NOT NULL DEFAULT 0,
  platform TEXT, dimensions TEXT,
  is_posted BOOLEAN NOT NULL DEFAULT false, posted_at TIMESTAMP,
  approved_by_client BOOLEAN NOT NULL DEFAULT false,
  client_approval_at TIMESTAMP, client_approval_ip TEXT, client_approval_name TEXT,
  created_by_id TEXT NOT NULL, assigned_to_id TEXT, completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  company_name TEXT NOT NULL, contact_person TEXT NOT NULL,
  phone TEXT, email TEXT, source TEXT NOT NULL DEFAULT 'OTHER',
  stage lead_stage NOT NULL DEFAULT 'NEW_LEAD',
  estimated_value REAL NOT NULL DEFAULT 0, probability INTEGER NOT NULL DEFAULT 0,
  notes TEXT, next_follow_up TIMESTAMP, follow_up_count INTEGER NOT NULL DEFAULT 0,
  lost_reason TEXT, industry TEXT, sales_rep_id TEXT, client_id TEXT,
  expected_close TIMESTAMP, won_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id TEXT NOT NULL, user_id TEXT NOT NULL,
  type TEXT NOT NULL, notes TEXT, outcome TEXT, next_action TEXT, next_action_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  client_id TEXT NOT NULL, month INTEGER NOT NULL, year INTEGER NOT NULL,
  retainer REAL NOT NULL DEFAULT 0, media_buying_fee REAL NOT NULL DEFAULT 0,
  extra_services REAL NOT NULL DEFAULT 0, total_revenue REAL NOT NULL DEFAULT 0,
  paid REAL NOT NULL DEFAULT 0, outstanding REAL NOT NULL DEFAULT 0,
  invoice_number TEXT, invoice_status invoice_status DEFAULT 'DRAFT',
  due_date TIMESTAMP, paid_date TIMESTAMP, payment_method TEXT, notes TEXT,
  commission_rate REAL, commission_paid REAL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  category TEXT NOT NULL, description TEXT NOT NULL, amount REAL NOT NULL,
  date TIMESTAMP NOT NULL, receipt TEXT, approved_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
  link TEXT, is_read BOOLEAN NOT NULL DEFAULT false, priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
  old_values TEXT, new_values TEXT, ip_address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL, task_id TEXT, title TEXT NOT NULL, date TIMESTAMP NOT NULL,
  platform TEXT, caption TEXT, hashtags TEXT, status TEXT NOT NULL DEFAULT 'scheduled',
  posted_by TEXT, engagements INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_feedback (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL, score INTEGER NOT NULL, comment TEXT,
  month INTEGER NOT NULL, year INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id TEXT NOT NULL, user_id TEXT NOT NULL,
  comment TEXT NOT NULL, is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_alerts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL, alert_type TEXT NOT NULL, threshold REAL NOT NULL,
  triggered BOOLEAN NOT NULL DEFAULT false, triggered_at TIMESTAMP,
  month INTEGER NOT NULL, year INTEGER NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL, step_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP, completed_by TEXT, notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL, retainer REAL NOT NULL DEFAULT 0,
  day_of_month INTEGER NOT NULL DEFAULT 1, is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL, url TEXT NOT NULL, events TEXT NOT NULL,
  secret TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true,
  last_called_at TIMESTAMP, fail_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, key_prefix TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT 'read', last_used_at TIMESTAMP, expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creator_profiles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL UNIQUE, bio TEXT, skills TEXT, portfolio_url TEXT,
  rate_per_task REAL DEFAULT 0, rating REAL DEFAULT 5, total_jobs INTEGER DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true, specialties TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_bids (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id TEXT NOT NULL, creator_id TEXT NOT NULL, amount REAL NOT NULL,
  proposal TEXT NOT NULL, delivery_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_generations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL, type TEXT NOT NULL, prompt TEXT NOT NULL, result TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "to" TEXT NOT NULL, subject TEXT NOT NULL, type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', resend_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id TEXT NOT NULL, client_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE,
  action TEXT NOT NULL DEFAULT 'approve', expires_at TIMESTAMP NOT NULL, used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_id TEXT NOT NULL, referred_email TEXT NOT NULL, code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING', discount_pct REAL NOT NULL DEFAULT 20,
  signed_up_at TIMESTAMP, converted_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id TEXT NOT NULL, title TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'RETAINER',
  value REAL NOT NULL DEFAULT 0, start_date TIMESTAMP NOT NULL, end_date TIMESTAMP NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT false, renewal_days INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'ACTIVE', document_url TEXT,
  signed_by_client BOOLEAN NOT NULL DEFAULT false, signed_at TIMESTAMP, notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL, user_id TEXT, event TEXT NOT NULL, metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON creative_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON creative_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON creative_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON creative_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_metrics_client ON media_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON media_metrics(date);
CREATE INDEX IF NOT EXISTS idx_finance_client ON finance_records(client_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifs_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON sales_leads(stage);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_token ON approval_tokens(token);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);

-- ═══════════════════════════════════════════════════════════════
-- ERP v18 — 8 Production Tables
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payroll (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  base_salary REAL NOT NULL DEFAULT 0,
  bonus REAL NOT NULL DEFAULT 0,
  deductions REAL NOT NULL DEFAULT 0,
  net_pay REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  type TEXT NOT NULL,
  from_date TIMESTAMP NOT NULL,
  to_date TIMESTAMP NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'PENDING',
  reason TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  assigned_to_id TEXT,
  serial_number TEXT,
  purchase_date TIMESTAMP,
  value REAL NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'Good',
  renewal_date TIMESTAMP,
  seats INTEGER,
  seats_used INTEGER,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  payment_terms INTEGER NOT NULL DEFAULT 30,
  tax_id TEXT,
  bank_details TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  vendor_id TEXT,
  vendor_name TEXT NOT NULL,
  po_number TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  approved_by TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  task_id TEXT,
  client_id TEXT,
  date TIMESTAMP NOT NULL,
  hours REAL NOT NULL DEFAULT 0,
  rate_per_hour REAL NOT NULL DEFAULT 0,
  billable BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_claims (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  date TIMESTAMP NOT NULL,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  approved_by TEXT,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_budgets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'RETAINER',
  total_budget REAL NOT NULL DEFAULT 0,
  spent_budget REAL NOT NULL DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_user   ON payroll(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month  ON payroll(month, year);
CREATE INDEX IF NOT EXISTS idx_leave_user     ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_status   ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_assets_cat     ON assets(category);
CREATE INDEX IF NOT EXISTS idx_po_status      ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_vendor      ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_time_user      ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_task      ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_claims_user    ON expense_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_status  ON expense_claims(status);
CREATE INDEX IF NOT EXISTS idx_budget_client  ON project_budgets(client_id);

-- ═══════════════════════════════════════════════════════════════
-- ERP v20 — 10 New Production Tables
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  code TEXT NOT NULL, name TEXT NOT NULL,
  type TEXT NOT NULL, subtype TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  balance REAL NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  date TIMESTAMP NOT NULL, description TEXT NOT NULL,
  reference TEXT, status TEXT NOT NULL DEFAULT 'DRAFT',
  total_debit REAL NOT NULL DEFAULT 0, total_credit REAL NOT NULL DEFAULT 0,
  created_by_id TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entry_id TEXT NOT NULL, account_id TEXT NOT NULL,
  description TEXT, debit REAL NOT NULL DEFAULT 0, credit REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  invoice_id TEXT NOT NULL, client_id TEXT NOT NULL,
  amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL DEFAULT 'stripe', stripe_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', paid_at TIMESTAMP,
  receipt_url TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  "to" TEXT NOT NULL, template TEXT NOT NULL, body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SENT', wa_message_id TEXT,
  client_id TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  lead_id TEXT, client_id TEXT, title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  total_value REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD',
  valid_until TIMESTAMP, sent_at TIMESTAMP, viewed_at TIMESTAMP, accepted_at TIMESTAMP,
  signature_url TEXT, notes TEXT, services TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_scores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id TEXT NOT NULL UNIQUE, total_score INTEGER NOT NULL DEFAULT 0,
  budget_score INTEGER NOT NULL DEFAULT 0, industry_score INTEGER NOT NULL DEFAULT 0,
  source_score INTEGER NOT NULL DEFAULT 0, engage_score INTEGER NOT NULL DEFAULT 0,
  classification TEXT NOT NULL DEFAULT 'COLD', updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_catalog (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL, description TEXT, category TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD',
  billing_type TEXT NOT NULL DEFAULT 'MONTHLY',
  deliverables TEXT, is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creator_points (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL, workspace_id TEXT NOT NULL DEFAULT 'default',
  month INTEGER NOT NULL, year INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  tasks_on_time INTEGER NOT NULL DEFAULT 0,
  zero_revisions INTEGER NOT NULL DEFAULT 0,
  client_favorite INTEGER NOT NULL DEFAULT 0,
  badges TEXT, updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL, trigger TEXT NOT NULL,
  conditions TEXT NOT NULL, actions TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  run_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
  target_list TEXT NOT NULL DEFAULT 'leads',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  scheduled_at TIMESTAMP, sent_at TIMESTAMP,
  recipients INTEGER NOT NULL DEFAULT 0,
  opens INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS currency_rates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  from_currency TEXT NOT NULL, to_currency TEXT NOT NULL,
  rate REAL NOT NULL, fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_workspace ON journal_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_client ON payment_records(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON payment_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_client ON whatsapp_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_creator_points_user ON creator_points(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_workspace ON workflow_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON email_campaigns(workspace_id);

-- ═══════════════════════════════════════════════════════════════
-- v21 Performance Indexes
-- ═══════════════════════════════════════════════════════════════
-- Compound indexes for most common query patterns
CREATE INDEX IF NOT EXISTS idx_media_client_date    ON media_metrics(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_media_platform_date  ON media_metrics(platform, date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status_deadline ON creative_tasks(status, deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON creative_tasks(assigned_to_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_client_status  ON creative_tasks(client_id, status);
CREATE INDEX IF NOT EXISTS idx_finance_client_year  ON finance_records(client_id, year, month);
CREATE INDEX IF NOT EXISTS idx_notifs_user_read     ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_stage_updated  ON sales_leads(stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sales_rep      ON sales_leads(sales_rep_id, stage);
CREATE INDEX IF NOT EXISTS idx_calendar_client_date ON calendar_events(client_id, date);
CREATE INDEX IF NOT EXISTS idx_calendar_status_date ON calendar_events(status, date);
CREATE INDEX IF NOT EXISTS idx_audit_entity         ON audit_logs(entity, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date_cat    ON company_expenses(date DESC, category);
CREATE INDEX IF NOT EXISTS idx_clients_workspace    ON clients(workspace_id, is_active, churn_risk);
CREATE INDEX IF NOT EXISTS idx_users_workspace_role ON users(workspace_id, role, is_active);

-- ═══════════════════════════════════════════════════════════════
-- PRODUCTION FIXES — All 120 Issues
-- ═══════════════════════════════════════════════════════════════

-- Fix 52: Unique constraint on mediaMetrics (clientId, platform, date)
ALTER TABLE media_metrics ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_metrics_client_platform_date
  ON media_metrics(client_id, platform, date);

-- Fix 53: Unique constraint on financeRecords (clientId, month, year)
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_records_client_month_year
  ON finance_records(client_id, month, year);

-- Fix 54: creativeTasks deadline NOT NULL with default
ALTER TABLE creative_tasks ALTER COLUMN deadline SET DEFAULT (NOW() + INTERVAL '7 days');

-- Fix 55: Ensure amount fields are numeric not text
-- (Already numeric in schema — adding CHECK constraints)
ALTER TABLE finance_records ADD CONSTRAINT chk_retainer_positive CHECK (retainer >= 0);
ALTER TABLE finance_records ADD CONSTRAINT chk_paid_positive     CHECK (paid >= 0);
ALTER TABLE company_expenses ADD CONSTRAINT chk_expense_positive  CHECK (amount >= 0);

-- Fix 56: Cascade deletes for data integrity
ALTER TABLE media_metrics    DROP CONSTRAINT IF EXISTS media_metrics_client_id_fkey;
ALTER TABLE creative_tasks   DROP CONSTRAINT IF EXISTS creative_tasks_client_id_fkey;
ALTER TABLE finance_records  DROP CONSTRAINT IF EXISTS finance_records_client_id_fkey;
ALTER TABLE calendar_events  DROP CONSTRAINT IF EXISTS calendar_events_client_id_fkey;
ALTER TABLE client_feedback  DROP CONSTRAINT IF EXISTS client_feedback_client_id_fkey;
ALTER TABLE onboarding_progress DROP CONSTRAINT IF EXISTS onboarding_progress_client_id_fkey;

ALTER TABLE media_metrics    ADD CONSTRAINT media_metrics_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE creative_tasks   ADD CONSTRAINT creative_tasks_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE finance_records  ADD CONSTRAINT finance_records_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE calendar_events  ADD CONSTRAINT calendar_events_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE client_feedback  ADD CONSTRAINT client_feedback_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Fix 57: Index on auditLogs.createdAt for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Fix 96: DB-level validation constraints
ALTER TABLE clients ADD CONSTRAINT chk_health_score
  CHECK (health_score >= 0 AND health_score <= 100);
ALTER TABLE clients ADD CONSTRAINT chk_churn_probability
  CHECK (churn_probability >= 0 AND churn_probability <= 1);
ALTER TABLE media_metrics ADD CONSTRAINT chk_roas_positive
  CHECK (roas >= 0);
ALTER TABLE media_metrics ADD CONSTRAINT chk_spend_positive
  CHECK (ad_spend >= 0);

-- Fix 97: Amount CHECK constraints
ALTER TABLE media_metrics ADD CONSTRAINT chk_leads_positive
  CHECK (leads >= 0);

-- Fix 98: Soft delete on creative_tasks
ALTER TABLE creative_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE creative_tasks ADD COLUMN IF NOT EXISTS deleted_by  TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_not_deleted ON creative_tasks(deleted_at)
  WHERE deleted_at IS NULL;

-- Fix 99: Link calendar_events to creative_tasks
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS task_id TEXT
  REFERENCES creative_tasks(id) ON DELETE SET NULL;

-- Fix 101: Notification cleanup index
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read) WHERE is_read = false;

-- Fix 102: AuditLog retention index
CREATE INDEX IF NOT EXISTS idx_audit_entity_created
  ON audit_logs(entity, created_at DESC);

-- Fix 115: Financial audit trail
CREATE INDEX IF NOT EXISTS idx_finance_audit
  ON audit_logs(entity, entity_id) WHERE entity = 'finance_records';

-- workspaceId defaults for multi-tenant
ALTER TABLE clients          ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE users            ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE creative_tasks   ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE finance_records  ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE sales_leads      ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE calendar_events  ADD COLUMN IF NOT EXISTS workspace_id TEXT NOT NULL DEFAULT 'default';

-- robots.txt equivalent — mark internal pages
CREATE INDEX IF NOT EXISTS idx_clients_workspace_active
  ON clients(workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status
  ON creative_tasks(workspace_id, status);

-- ═══════════════════════════════════════════════════════════════
-- SAAS PERMISSIONS SYSTEM TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workspace_roles (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name         TEXT NOT NULL,
  description  TEXT,
  color        TEXT NOT NULL DEFAULT '#2196F3',
  is_system    BOOLEAN NOT NULL DEFAULT false,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  permissions  TEXT NOT NULL DEFAULT '[]',
  created_by   TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id      TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  assigned_by  TEXT,
  assigned_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id   TEXT NOT NULL DEFAULT 'default',
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'ACTIVE',
  joined_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  invited_by     TEXT,
  last_active_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invitations (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  email        TEXT NOT NULL,
  role_id      TEXT,
  token        TEXT NOT NULL UNIQUE,
  invited_by   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  expires_at   TIMESTAMP NOT NULL,
  accepted_at  TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_roles_ws ON workspace_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user    ON user_roles(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members  ON workspace_members(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_token  ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email  ON invitations(email, workspace_id);

-- Seed default system roles for 'default' workspace
INSERT INTO workspace_roles (id, workspace_id, name, description, color, is_system, permissions) VALUES
  ('role-super-admin', 'default', 'Super Admin',     'Full access to everything',                          '#DC2626', true,
   '["view_dashboard","view_analytics","view_kpis","view_reports","export_data","view_clients","create_clients","edit_clients","delete_clients","view_tasks","create_tasks","edit_tasks","delete_tasks","approve_tasks","assign_tasks","view_finance","create_invoices","edit_invoices","approve_invoices","view_payroll","manage_payroll","view_media","edit_media","manage_budgets","view_sales","create_leads","edit_leads","delete_leads","view_proposals","create_proposals","view_team","manage_team","view_salaries","approve_leaves","use_ai_studio","view_ai_history","manage_workspace","manage_users","manage_roles","manage_billing","manage_api_keys","view_audit_logs","manage_integrations"]'),
  ('role-account-manager', 'default', 'Account Manager', 'Manage clients, tasks, media, and reports',     '#2196F3', true,
   '["view_dashboard","view_analytics","view_reports","export_data","view_clients","create_clients","edit_clients","view_tasks","create_tasks","edit_tasks","approve_tasks","assign_tasks","view_finance","create_invoices","view_media","edit_media","view_sales","create_leads","edit_leads","view_proposals","create_proposals","use_ai_studio","view_ai_history"]'),
  ('role-media-buyer', 'default', 'Media Buyer',      'Media buying, budgets, and campaign analytics',     '#F59E0B', true,
   '["view_dashboard","view_analytics","view_clients","view_tasks","view_media","edit_media","manage_budgets","view_reports","export_data"]'),
  ('role-creator', 'default', 'Creator',              'View and work on assigned tasks only',              '#8B5CF6', true,
   '["view_tasks","view_dashboard"]'),
  ('role-accountant', 'default', 'Accountant',        'Full finance access, no client or task management', '#10B981', true,
   '["view_dashboard","view_finance","create_invoices","edit_invoices","approve_invoices","view_payroll","manage_payroll","view_reports","export_data","view_clients","view_team","view_salaries"]'),
  ('role-sales', 'default', 'Sales',                  'CRM, leads, proposals, and sales analytics',        '#EF4444', true,
   '["view_dashboard","view_sales","create_leads","edit_leads","delete_leads","view_proposals","create_proposals","view_clients","view_reports"]'),
  ('role-client', 'default', 'Client',                'Client portal access only',                         '#64748B', true,
   '["view_portal","approve_creatives","pay_invoices"]')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- ENTERPRISE ERP TABLES — v30
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  formula TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  target REAL DEFAULT 100,
  unit TEXT DEFAULT '%',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kpi_scores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kpi_id TEXT NOT NULL,
  period TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  target REAL DEFAULT 100,
  achievement REAL DEFAULT 0,
  evidence TEXT,
  reviewed_by TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, kpi_id, period)
);

CREATE TABLE IF NOT EXISTS salary_recommendations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  base_salary NUMERIC NOT NULL,
  kpi_achievement REAL NOT NULL DEFAULT 0,
  recommended_salary NUMERIC NOT NULL,
  bonus_amount NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  total_package NUMERIC NOT NULL,
  ai_explanation TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  submitted_by TEXT,
  finance_reviewed_by TEXT,
  finance_reviewed_at TIMESTAMP,
  finance_notes TEXT,
  manager_approved_by TEXT,
  manager_approved_at TIMESTAMP,
  cfo_approved_by TEXT,
  cfo_approved_at TIMESTAMP,
  cfo_notes TEXT,
  locked_at TIMESTAMP,
  locked_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period)
);

CREATE TABLE IF NOT EXISTS payroll_locks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  period TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'OPEN',
  locked_at TIMESTAMP,
  locked_by TEXT,
  reopened_at TIMESTAMP,
  reopened_by TEXT,
  reopen_reason TEXT,
  total_gross NUMERIC DEFAULT 0,
  total_net NUMERIC DEFAULT 0,
  total_tax NUMERIC DEFAULT 0,
  approval_chain TEXT DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_workflows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC,
  requested_by TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'PENDING',
  steps TEXT NOT NULL DEFAULT '[]',
  rejected_at TIMESTAMP,
  rejected_by TEXT,
  rejection_reason TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  client_id TEXT,
  revenue_collected NUMERIC NOT NULL DEFAULT 0,
  commission_rate REAL NOT NULL DEFAULT 0.10,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'ACCOUNT_MANAGER',
  status TEXT NOT NULL DEFAULT 'PENDING',
  approved_by TEXT,
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_health_scores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  period TEXT NOT NULL,
  overall_score REAL NOT NULL DEFAULT 0,
  revenue_growth REAL DEFAULT 0,
  profitability REAL DEFAULT 0,
  client_retention REAL DEFAULT 0,
  cash_flow REAL DEFAULT 0,
  collection_rate REAL DEFAULT 0,
  employee_utilization REAL DEFAULT 0,
  mrr NUMERIC DEFAULT 0,
  arr NUMERIC DEFAULT 0,
  active_clients INTEGER DEFAULT 0,
  at_risk_clients INTEGER DEFAULT 0,
  breakdown TEXT DEFAULT '{}',
  recommendations TEXT DEFAULT '[]',
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_planning (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  planned_hours REAL DEFAULT 160,
  billable_hours REAL DEFAULT 0,
  non_billable_hours REAL DEFAULT 0,
  utilization REAL DEFAULT 0,
  capacity REAL DEFAULT 100,
  overloaded BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period)
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT true,
  author_id TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT NOT NULL DEFAULT 'default',
  lead_id TEXT NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'PENDING',
  completed_at TIMESTAMP,
  missed_at TIMESTAMP,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for enterprise tables
CREATE INDEX IF NOT EXISTS idx_kpi_scores_user_period ON kpi_scores(user_id, period);
CREATE INDEX IF NOT EXISTS idx_salary_rec_user_period ON salary_recommendations(user_id, period);
CREATE INDEX IF NOT EXISTS idx_payroll_locks_period ON payroll_locks(period, status);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_entity ON approval_workflows(entity_type, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_user_period ON commissions(user_id, period);
CREATE INDEX IF NOT EXISTS idx_agency_health_period ON agency_health_scores(workspace_id, period);
CREATE INDEX IF NOT EXISTS idx_follow_up_status ON follow_up_reminders(user_id, status, scheduled_at);

-- Seed default KPI definitions
INSERT INTO kpi_definitions (workspace_id, name, category, formula, weight, target, unit, description) VALUES
  ('default','Revenue Target Achievement','SALES','(actual_revenue/target_revenue)*100',1.5,100,'%','% of revenue target achieved this month'),
  ('default','Lead Conversion Rate','SALES','(won_leads/total_leads)*100',1.2,40,'%','% of leads converted to clients'),
  ('default','Client Retention Rate','ACCOUNT_MANAGER','((clients_end-new_clients)/clients_start)*100',1.5,85,'%','% of clients retained month-over-month'),
  ('default','Task Delivery Rate','CREATIVE','(approved_tasks/total_tasks)*100',1.2,90,'%','% of tasks delivered on time and approved'),
  ('default','ROAS Achievement','MEDIA','(actual_roas/target_roas)*100',1.3,100,'%','ROAS vs target performance'),
  ('default','Invoice Collection Rate','FINANCE','(collected/invoiced)*100',1.4,90,'%','% of invoices collected on time'),
  ('default','NPS Score','ACCOUNT_MANAGER','avg_nps_score',1.0,8,'score','Average NPS score from clients'),
  ('default','Billable Utilization','HR','(billable_hours/total_hours)*100',1.1,80,'%','% of work hours that are billable')
ON CONFLICT DO NOTHING;
