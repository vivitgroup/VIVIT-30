-- VIVIT ERP finance history reconciliation
-- Release-time data step only. Safe to re-run.
-- Adds synthetic historical payments only for the positive gap between
-- finance_records.paid and already-linked completed/successful payment rows.
-- Fail-closed: any remaining gap aborts the transaction before commit.

begin;

-- Preflight visibility: rows this run is expected to reconcile.
with recorded as (
  select invoice_id, coalesce(sum(amount),0)::real as recorded_amount
  from payment_records
  where workspace_id='default'
    and status in ('COMPLETED','SUCCEEDED','SUCCESS','PAID')
  group by invoice_id
)
select count(*) as invoices_to_reconcile
from finance_records f
left join recorded r on r.invoice_id=f.id
where f.workspace_id='default'
  and coalesce(f.paid,0)>coalesce(r.recorded_amount,0)+0.01;

with recorded as (
  select invoice_id, coalesce(sum(amount),0)::real as recorded_amount
  from payment_records
  where workspace_id='default'
    and status in ('COMPLETED','SUCCEEDED','SUCCESS','PAID')
  group by invoice_id
), gaps as (
  select
    f.id as invoice_id,
    f.client_id,
    greatest(0, coalesce(f.paid,0)-coalesce(r.recorded_amount,0))::real as gap,
    coalesce(f.paid_date,f.updated_at,f.created_at,now()) as paid_at,
    coalesce(nullif(f.payment_method,''),'historical_reconciliation') as method
  from finance_records f
  left join recorded r on r.invoice_id=f.id
  where f.workspace_id='default'
    and coalesce(f.paid,0)>coalesce(r.recorded_amount,0)+0.01
)
insert into payment_records (
  id,workspace_id,invoice_id,client_id,amount,currency,method,status,paid_at,created_at,source_key,source_ref
)
select
  gen_random_uuid()::text,
  'default',
  g.invoice_id,
  g.client_id,
  g.gap,
  coalesce((select currency from workspaces where id='default'),'EGP'),
  g.method,
  'COMPLETED',
  g.paid_at,
  now(),
  'finance_history_reconciliation',
  'invoice:'||g.invoice_id||':gap:'||g.gap::text
from gaps g
where g.gap>0.01
  and not exists (
    select 1 from payment_records p
    where p.workspace_id='default'
      and p.invoice_id=g.invoice_id
      and p.source_key='finance_history_reconciliation'
      and p.source_ref='invoice:'||g.invoice_id||':gap:'||g.gap::text
  );

-- Fail closed. If anything remains unreconciled, raise and roll back this run.
do $$
declare
  remaining bigint;
begin
  select count(*) into remaining
  from finance_records f
  left join lateral (
    select coalesce(sum(p.amount),0) recorded
    from payment_records p
    where p.workspace_id='default'
      and p.invoice_id=f.id
      and p.status in ('COMPLETED','SUCCEEDED','SUCCESS','PAID')
  ) p on true
  where f.workspace_id='default'
    and coalesce(f.paid,0)>coalesce(p.recorded,0)+0.01;

  if remaining <> 0 then
    raise exception 'Finance history reconciliation incomplete: % invoice(s) still have unrecorded paid amount', remaining;
  end if;
end $$;

commit;

-- Final operator verification: should return zero after a successful commit.
select count(*) as invoices_with_unrecorded_paid_amount
from finance_records f
left join lateral (
  select coalesce(sum(p.amount),0) recorded
  from payment_records p
  where p.workspace_id='default'
    and p.invoice_id=f.id
    and p.status in ('COMPLETED','SUCCEEDED','SUCCESS','PAID')
) p on true
where f.workspace_id='default'
  and coalesce(f.paid,0)>coalesce(p.recorded,0)+0.01;
