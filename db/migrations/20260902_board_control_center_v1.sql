create table if not exists vgroup.board_decisions (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid null references vgroup.business_units(id) on delete restrict,
  title text not null,
  decision_type text not null check (decision_type in ('STRATEGIC','FINANCIAL','OPERATIONAL','RISK','PEOPLE','INVESTMENT')),
  status text not null default 'OPEN' check (status in ('OPEN','APPROVED','REJECTED','DEFERRED','CLOSED')),
  decision_text text,
  effective_date date,
  owner_id uuid null references vgroup.users(id) on delete set null,
  created_by uuid null references vgroup.users(id) on delete set null,
  decided_by uuid null references vgroup.users(id) on delete set null,
  decided_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vgroup.board_action_items (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid null references vgroup.board_decisions(id) on delete set null,
  business_unit_id uuid null references vgroup.business_units(id) on delete restrict,
  title text not null,
  owner_id uuid null references vgroup.users(id) on delete set null,
  priority text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','BLOCKED','DONE','CANCELLED')),
  due_at date,
  completed_at timestamptz,
  created_by uuid null references vgroup.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_board_decisions_bu_status on vgroup.board_decisions(business_unit_id,status);
create index if not exists idx_board_decisions_owner on vgroup.board_decisions(owner_id);
create index if not exists idx_board_actions_decision on vgroup.board_action_items(decision_id);
create index if not exists idx_board_actions_bu_status on vgroup.board_action_items(business_unit_id,status);
create index if not exists idx_board_actions_owner on vgroup.board_action_items(owner_id);
create index if not exists idx_board_actions_due on vgroup.board_action_items(due_at) where status not in ('DONE','CANCELLED');

alter table vgroup.board_decisions enable row level security;
alter table vgroup.board_action_items enable row level security;

drop policy if exists board_decisions_deny_client on vgroup.board_decisions;
create policy board_decisions_deny_client on vgroup.board_decisions for all to anon, authenticated using (false) with check (false);
drop policy if exists board_actions_deny_client on vgroup.board_action_items;
create policy board_actions_deny_client on vgroup.board_action_items for all to anon, authenticated using (false) with check (false);

revoke all on vgroup.board_decisions from public, anon, authenticated;
revoke all on vgroup.board_action_items from public, anon, authenticated;
grant select,insert,update,delete on vgroup.board_decisions to service_role;
grant select,insert,update,delete on vgroup.board_action_items to service_role;

create or replace view vgroup.board_finance_snapshot as
select
  b.id as business_unit_id,
  b.code,
  coalesce(sum(case when l.occurred_at >= date_trunc('month',now()) and l.direction='CREDIT' then l.amount else 0 end),0)::numeric(18,2) as month_revenue,
  coalesce(sum(case when l.occurred_at >= date_trunc('month',now()) and l.direction='DEBIT' then l.amount else 0 end),0)::numeric(18,2) as month_expenses,
  coalesce(sum(case when l.occurred_at >= date_trunc('month',now()) and l.direction='CREDIT' then l.amount when l.occurred_at >= date_trunc('month',now()) and l.direction='DEBIT' then -l.amount else 0 end),0)::numeric(18,2) as month_net,
  coalesce(sum(case when l.occurred_at >= date_trunc('year',now()) and l.direction='CREDIT' then l.amount else 0 end),0)::numeric(18,2) as ytd_revenue,
  coalesce(sum(case when l.occurred_at >= date_trunc('year',now()) and l.direction='DEBIT' then l.amount else 0 end),0)::numeric(18,2) as ytd_expenses,
  coalesce(sum(case when l.occurred_at >= date_trunc('year',now()) and l.direction='CREDIT' then l.amount when l.occurred_at >= date_trunc('year',now()) and l.direction='DEBIT' then -l.amount else 0 end),0)::numeric(18,2) as ytd_net
from vgroup.business_units b
left join vgroup.ledger_transactions l on l.business_unit_id=b.id
group by b.id,b.code;

revoke all on vgroup.board_finance_snapshot from public, anon, authenticated;
grant select on vgroup.board_finance_snapshot to service_role;
