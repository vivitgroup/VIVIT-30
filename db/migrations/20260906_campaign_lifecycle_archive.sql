-- PR103 campaign lifecycle persistence.
-- Safe to run repeatedly before release.
ALTER TABLE ad_campaigns
  ADD COLUMN IF NOT EXISTS archived_at timestamp;

ALTER TABLE ad_campaigns
  ADD COLUMN IF NOT EXISTS archived_by text;

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_workspace_archived
  ON ad_campaigns (workspace_id, archived_at);
