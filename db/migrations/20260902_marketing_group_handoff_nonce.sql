create table if not exists group_handoff_nonces (
  nonce_hash text primary key,
  group_user_id text not null,
  email text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_group_handoff_nonces_expires_at
  on group_handoff_nonces(expires_at);

alter table group_handoff_nonces enable row level security;

do $$
begin
  if exists(select 1 from pg_roles where rolname='anon') then
    execute 'revoke all on table group_handoff_nonces from anon';
  end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    execute 'revoke all on table group_handoff_nonces from authenticated';
  end if;
end $$;
