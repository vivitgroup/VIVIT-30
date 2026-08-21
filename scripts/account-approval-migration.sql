ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role role;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_note TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

UPDATE users SET approval_status = 'APPROVED' WHERE is_active = true;

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
