create table if not exists hospitality.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references vgroup.business_units(id),
  property_id uuid not null references hospitality.properties(id) on delete cascade,
  channel_connection_id uuid not null references hospitality.channel_connections(id) on delete cascade,
  external_uid text not null,
  summary text not null default 'Unavailable',
  starts_on date not null,
  ends_on date not null,
  source text not null default 'airbnb',
  last_seen_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_blocks_dates_check check (ends_on > starts_on),
  constraint calendar_blocks_source_check check (source in ('airbnb','booking','direct','other')),
  constraint calendar_blocks_channel_uid_key unique (channel_connection_id, external_uid)
);
create index if not exists calendar_blocks_property_dates_idx on hospitality.calendar_blocks(property_id, starts_on, ends_on) where archived_at is null;
create index if not exists calendar_blocks_channel_active_idx on hospitality.calendar_blocks(channel_connection_id, starts_on) where archived_at is null;
alter table hospitality.calendar_blocks enable row level security;
revoke all on hospitality.calendar_blocks from anon, authenticated;
