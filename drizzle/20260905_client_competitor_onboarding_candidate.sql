BEGIN;

CREATE TABLE IF NOT EXISTS competitor_watchlists (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  competitor_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_watchlists_workspace_client
  ON competitor_watchlists(workspace_id, client_id);
CREATE INDEX IF NOT EXISTS idx_competitor_watchlists_created_by
  ON competitor_watchlists(created_by);

CREATE TABLE IF NOT EXISTS competitor_social_profiles (
  id text PRIMARY KEY,
  watchlist_id text NOT NULL REFERENCES competitor_watchlists(id) ON DELETE CASCADE,
  platform text NOT NULL,
  profile_url text NOT NULL,
  collection_mode text NOT NULL DEFAULT 'PUBLIC_WEB',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT competitor_social_profiles_platform_check
    CHECK (platform IN ('FACEBOOK','INSTAGRAM','TIKTOK')),
  CONSTRAINT competitor_social_profiles_collection_mode_check
    CHECK (collection_mode IN ('PUBLIC_WEB')),
  CONSTRAINT uq_competitor_social_profile
    UNIQUE (watchlist_id, platform, profile_url)
);

CREATE INDEX IF NOT EXISTS idx_competitor_social_profiles_watchlist
  ON competitor_social_profiles(watchlist_id);

CREATE TABLE IF NOT EXISTS competitive_report_preferences (
  workspace_id text NOT NULL,
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cadence text NOT NULL DEFAULT 'WEEKLY',
  send_to_client boolean NOT NULL DEFAULT false,
  next_due_at timestamp NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT competitive_report_preferences_pkey PRIMARY KEY (workspace_id, client_id),
  CONSTRAINT competitive_report_preferences_cadence_check
    CHECK (cadence IN ('DAILY','EVERY_3_DAYS','WEEKLY'))
);

CREATE INDEX IF NOT EXISTS idx_competitive_report_preferences_due
  ON competitive_report_preferences(next_due_at);

COMMIT;
