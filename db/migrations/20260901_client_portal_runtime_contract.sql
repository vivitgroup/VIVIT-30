-- Stage 4 Client Portal runtime contract hardening.
-- DO NOT apply to Production before Final CTO Acceptance / release migration gate.
-- Idempotent additive migration only; no destructive rewrite or data deletion.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text;

ALTER TABLE public.creative_tasks
  ADD COLUMN IF NOT EXISTS archived_at timestamp,
  ADD COLUMN IF NOT EXISTS archived_by text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp,
  ADD COLUMN IF NOT EXISTS deleted_by text;

ALTER TABLE public.file_documents
  ADD COLUMN IF NOT EXISTS archived_at timestamp,
  ADD COLUMN IF NOT EXISTS archived_by text;

ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS archived_at timestamp,
  ADD COLUMN IF NOT EXISTS reported_result_label text,
  ADD COLUMN IF NOT EXISTS reported_result_type text;

ALTER TABLE public.ad_performance_daily
  ADD COLUMN IF NOT EXISTS add_to_cart integer NOT NULL DEFAULT 0;
