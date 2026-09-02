drop table if exists hospitality.ledger_transactions;

create table vgroup.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references vgroup.business_units(id),
  source_system text not null check (source_system in ('hospitality','tech','marketing','group')),
  source_type text not null,
  source_id uuid,
  transaction_type text not null,
  direction text not null check (direction in ('debit','credit')),
  account_code text not null,
  counterparty_type text,
  counterparty_id uuid,
  currency text not null default 'EGP',
  amount numeric(18,2) not null check (amount>=0),
  occurred_at timestamptz not null default now(),
  description text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references vgroup.users(id),
  created_at timestamptz not null default now()
);
create index idx_vgroup_ledger_bu_time on vgroup.ledger_transactions(business_unit_id,occurred_at);
create index idx_vgroup_ledger_source on vgroup.ledger_transactions(source_system,source_type,source_id);
create index idx_vgroup_ledger_account on vgroup.ledger_transactions(account_code,occurred_at);
create index idx_vgroup_ledger_created_by on vgroup.ledger_transactions(created_by);
alter table vgroup.ledger_transactions enable row level security;
revoke all on vgroup.ledger_transactions from anon, authenticated;
grant all on vgroup.ledger_transactions to service_role;
create policy ledger_transactions_server_only on vgroup.ledger_transactions for all to authenticated using(false) with check(false);

create or replace view vgroup.finance_summary as
select business_unit_id,currency,date_trunc('month',occurred_at) as period_month,
  sum(case when transaction_type in ('revenue','subscription_revenue','project_revenue') and direction='credit' then amount else 0 end) as revenue,
  sum(case when transaction_type in ('expense','cost','platform_fee','vendor_cost') and direction='debit' then amount else 0 end) as expenses,
  sum(case when direction='credit' then amount else -amount end) as net_movement
from vgroup.ledger_transactions
group by business_unit_id,currency,date_trunc('month',occurred_at);
revoke all on vgroup.finance_summary from anon, authenticated;
grant select on vgroup.finance_summary to service_role;
