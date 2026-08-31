-- Business-logic guards applied to production on 2026-08-31.
-- Keep task completion tied to final client approval and finance approvals separated.

create or replace function public.enforce_creative_task_business_state()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'COMPLETED' and coalesce(new.approved_by_client,false) = false then
    raise exception 'COMPLETED requires client approval';
  end if;

  if coalesce(new.approved_by_client,false) = true then
    if tg_op = 'UPDATE' and old.status not in ('APPROVED','COMPLETED') and coalesce(old.approved_by_client,false) = false then
      raise exception 'Client approval requires prior internal APPROVED state';
    end if;
    new.status := 'COMPLETED';
    new.completed_at := coalesce(new.completed_at, now());
    new.client_approval_at := coalesce(new.client_approval_at, now());
  elsif new.status <> 'COMPLETED' then
    new.completed_at := null;
    if new.status in ('PENDING','IN_PROGRESS','REVIEW','REVISION','REJECTED','APPROVED') then
      new.client_approval_at := null;
      new.client_approval_name := null;
    end if;
  end if;

  if new.status = 'REVISION' then
    new.approved_by_client := false;
    new.completed_at := null;
    new.client_approval_at := null;
    new.client_approval_name := null;
  end if;

  return new;
end;
$$;

drop trigger if exists creative_tasks_business_state_guard on public.creative_tasks;
create trigger creative_tasks_business_state_guard
before insert or update on public.creative_tasks
for each row execute function public.enforce_creative_task_business_state();

create or replace function public.enforce_erp_invoice_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.invoice_number ~ '^INV-[0-9]{4}-[0-9]{2}-[A-Z0-9]{4}$' then
    new.invoice_status := 'DRAFT';
  end if;

  if tg_op = 'UPDATE' and old.invoice_status = 'DRAFT' and new.invoice_status in ('PAID','OVERDUE') then
    raise exception 'Draft invoice must be approved/sent before collection';
  end if;

  return new;
end;
$$;

drop trigger if exists finance_records_erp_lifecycle_guard on public.finance_records;
create trigger finance_records_erp_lifecycle_guard
before insert or update on public.finance_records
for each row execute function public.enforce_erp_invoice_lifecycle();

create or replace function public.enforce_manual_expense_maker_checker()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.approved_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists company_expenses_maker_checker_guard on public.company_expenses;
create trigger company_expenses_maker_checker_guard
before insert on public.company_expenses
for each row execute function public.enforce_manual_expense_maker_checker();

create or replace function public.enforce_manual_ledger_maker_checker()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.source_sheet = 'ERP Manual Expense' then
    new.approved_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists financial_ledger_manual_expense_guard on public.financial_ledger_entries;
create trigger financial_ledger_manual_expense_guard
before insert on public.financial_ledger_entries
for each row execute function public.enforce_manual_ledger_maker_checker();
