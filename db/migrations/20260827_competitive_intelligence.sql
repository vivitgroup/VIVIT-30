create table if not exists competitor_watchlists (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  client_id uuid not null,
  competitor_name text not null,
  notes text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists competitor_watchlists_client_idx on competitor_watchlists(workspace_id,client_id,is_active);

create table if not exists competitor_social_profiles (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references competitor_watchlists(id) on delete cascade,
  platform text not null,
  profile_url text not null,
  handle text,
  collection_mode text not null default 'PUBLIC_WEB',
  is_active boolean not null default true,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique(watchlist_id,platform,profile_url)
);

create table if not exists competitor_profile_snapshots (
  id bigserial primary key,
  social_profile_id uuid not null references competitor_social_profiles(id) on delete cascade,
  captured_at timestamptz not null default now(),
  followers bigint,
  following bigint,
  total_posts bigint,
  total_likes bigint,
  source text not null,
  confidence text not null default 'observed',
  raw_public jsonb not null default '{}'::jsonb
);
create index if not exists competitor_profile_snapshots_latest_idx on competitor_profile_snapshots(social_profile_id,captured_at desc);

create table if not exists competitor_posts (
  id uuid primary key default gen_random_uuid(),
  social_profile_id uuid not null references competitor_social_profiles(id) on delete cascade,
  external_post_id text,
  canonical_url text not null,
  post_type text,
  caption text,
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(social_profile_id,canonical_url)
);

create table if not exists competitor_post_snapshots (
  id bigserial primary key,
  competitor_post_id uuid not null references competitor_posts(id) on delete cascade,
  captured_at timestamptz not null default now(),
  likes bigint,
  comments bigint,
  shares bigint,
  views bigint,
  source text not null,
  confidence text not null default 'observed',
  raw_public jsonb not null default '{}'::jsonb
);
create index if not exists competitor_post_snapshots_latest_idx on competitor_post_snapshots(competitor_post_id,captured_at desc);

create table if not exists competitor_daily_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'default',
  client_id uuid not null,
  report_date date not null,
  summary text not null,
  report_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(workspace_id,client_id,report_date)
);
