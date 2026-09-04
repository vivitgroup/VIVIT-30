create table if not exists vgroup.accounting_event_mappings (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null,
  business_unit_code text not null check (business_unit_code in ('hospitality','tech','marketing','group')),
  source_type text not null,
  event_type text not null,
  transaction_type text not null,
  direction text not null check (direction in ('debit','credit')),
  account_code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_unit_code, source_type, event_type)
);

alter table vgroup.accounting_event_mappings enable row level security;
revoke all on vgroup.accounting_event_mappings from anon, authenticated;
grant all on vgroup.accounting_event_mappings to service_role;
drop policy if exists accounting_event_mappings_server_only on vgroup.accounting_event_mappings;
create policy accounting_event_mappings_server_only on vgroup.accounting_event_mappings for all to authenticated using(false) with check(false);

insert into vgroup.accounting_event_mappings(contract_version,business_unit_code,source_type,event_type,transaction_type,direction,account_code) values
('2026-09-02-v1','hospitality','reservation','revenue_recognized','hospitality_revenue','credit','4000_hospitality_room_revenue'),
('2026-09-02-v1','hospitality','invoice','receivable_created','receivable','debit','1100_accounts_receivable'),
('2026-09-02-v1','hospitality','expense','expense_posted','hospitality_expense','debit','5000_hospitality_operating_expense'),
('2026-09-02-v1','hospitality','owner_payout','owner_payable_created','owner_payable','credit','2100_owner_payable'),
('2026-09-02-v1','hospitality','refund','refund_posted','revenue_credit','debit','4900_contra_revenue'),
('2026-09-02-v1','tech','project','revenue_recognized','project_revenue','credit','4100_tech_project_revenue'),
('2026-09-02-v1','tech','change_request','revenue_recognized','change_request_revenue','credit','4110_tech_cr_revenue'),
('2026-09-02-v1','tech','support_contract','revenue_recognized','support_revenue','credit','4120_tech_support_revenue'),
('2026-09-02-v1','tech','subscription','revenue_recognized','subscription_revenue','credit','4130_tech_saas_revenue'),
('2026-09-02-v1','tech','payment_installment','receivable_created','receivable','debit','1100_accounts_receivable'),
('2026-09-02-v1','tech','collection','cash_collected','collection','debit','1000_cash'),
('2026-09-02-v1','tech','project_cost','cost_posted','project_cost','debit','5100_tech_delivery_cost'),
('2026-09-02-v1','tech','external_resource','cost_posted','external_resource_cost','debit','5110_tech_external_resource_cost'),
('2026-09-02-v1','tech','credit_note','credit_posted','revenue_credit','debit','4900_contra_revenue'),
('2026-09-02-v1','marketing','service_invoice','revenue_recognized','marketing_revenue','credit','4200_marketing_service_revenue'),
('2026-09-02-v1','marketing','client_invoice','receivable_created','receivable','debit','1100_accounts_receivable'),
('2026-09-02-v1','marketing','media_spend','spend_posted','media_spend','debit','5200_marketing_media_spend'),
('2026-09-02-v1','marketing','operating_expense','expense_posted','marketing_expense','debit','5210_marketing_operating_expense'),
('2026-09-02-v1','marketing','refund','refund_posted','revenue_credit','debit','4900_contra_revenue'),
('2026-09-02-v1','group','intercompany','receivable_created','intercompany_receivable','debit','1300_intercompany_receivable'),
('2026-09-02-v1','group','intercompany','payable_created','intercompany_payable','credit','2300_intercompany_payable'),
('2026-09-02-v1','group','ledger_reversal','reverse_revenue','reversal','debit','4900_contra_revenue')
on conflict (business_unit_code,source_type,event_type) do update set
 contract_version=excluded.contract_version, transaction_type=excluded.transaction_type, direction=excluded.direction, account_code=excluded.account_code, active=true;

create or replace function vgroup.resolve_accounting_event_mapping(p_business_unit_code text,p_source_type text,p_event_type text)
returns table(transaction_type text,direction text,account_code text)
language plpgsql
security definer
set search_path = pg_catalog, vgroup
as $$
begin
  return query select m.transaction_type,m.direction,m.account_code
  from vgroup.accounting_event_mappings m
  where m.business_unit_code=p_business_unit_code and m.source_type=p_source_type and m.event_type=p_event_type and m.active=true;
  if not found then raise exception 'UNMAPPED_ACCOUNTING_EVENT:%:%:%',p_business_unit_code,p_source_type,p_event_type using errcode='P0001'; end if;
end;
$$;
revoke all on function vgroup.resolve_accounting_event_mapping(text,text,text) from public, anon, authenticated;
grant execute on function vgroup.resolve_accounting_event_mapping(text,text,text) to service_role;

create or replace view vgroup.finance_summary as
select business_unit_id,currency,date_trunc('month',occurred_at) as period_month,
  sum(case when transaction_type in ('revenue','subscription_revenue','project_revenue','hospitality_revenue','change_request_revenue','support_revenue','marketing_revenue') and direction='credit' then amount else 0 end) as revenue,
  sum(case when transaction_type in ('expense','cost','platform_fee','vendor_cost','hospitality_expense','project_cost','external_resource_cost','media_spend','marketing_expense') and direction='debit' then amount else 0 end) as expenses,
  sum(case when direction='credit' then amount else -amount end) as net_movement
from vgroup.ledger_transactions
group by business_unit_id,currency,date_trunc('month',occurred_at);
revoke all on vgroup.finance_summary from anon, authenticated;
grant select on vgroup.finance_summary to service_role;
