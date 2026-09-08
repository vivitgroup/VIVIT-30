begin;

alter table public.finance_records
  add column if not exists currency text;

update public.finance_records f
set currency = upper(coalesce(nullif(trim(c.currency), ''), nullif(trim(w.currency), ''), 'EGP'))
from public.clients c
left join public.workspaces w on w.id = f.workspace_id
where c.id = f.client_id
  and c.workspace_id = f.workspace_id
  and (f.currency is null or f.currency !~ '^[A-Z]{3}$');

update public.finance_records f
set currency = upper(coalesce(nullif(trim(w.currency), ''), 'EGP'))
from public.workspaces w
where w.id = f.workspace_id
  and (f.currency is null or f.currency !~ '^[A-Z]{3}$');

update public.finance_records
set currency = 'EGP'
where currency is null or currency !~ '^[A-Z]{3}$';

alter table public.finance_records
  alter column currency set default 'EGP',
  alter column currency set not null;

alter table public.finance_records
  drop constraint if exists finance_records_currency_iso3_chk;
alter table public.finance_records
  add constraint finance_records_currency_iso3_chk check (currency ~ '^[A-Z]{3}$');

create or replace function public.set_finance_record_currency_snapshot()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  select upper(coalesce(nullif(trim(c.currency), ''), nullif(trim(w.currency), ''), 'EGP'))
    into new.currency
  from public.clients c
  left join public.workspaces w on w.id = new.workspace_id
  where c.id = new.client_id and c.workspace_id = new.workspace_id
  limit 1;
  if new.currency is null then
    select upper(coalesce(nullif(trim(w.currency), ''), 'EGP')) into new.currency
    from public.workspaces w where w.id = new.workspace_id limit 1;
  end if;
  new.currency := coalesce(new.currency, 'EGP');
  return new;
end
$$;

drop trigger if exists trg_finance_record_currency_snapshot on public.finance_records;
create trigger trg_finance_record_currency_snapshot
before insert on public.finance_records
for each row execute function public.set_finance_record_currency_snapshot();

create or replace function public.set_payment_currency_from_invoice()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.invoice_id is not null then
    select f.currency into new.currency
    from public.finance_records f
    where f.id = new.invoice_id
      and f.workspace_id = new.workspace_id
      and f.client_id = new.client_id
    limit 1;
  end if;
  if new.currency is null or new.currency !~ '^[A-Z]{3}$' then
    raise exception 'Valid invoice currency snapshot is required';
  end if;
  return new;
end
$$;

drop trigger if exists trg_payment_currency_from_invoice on public.payment_records;
create trigger trg_payment_currency_from_invoice
before insert on public.payment_records
for each row execute function public.set_payment_currency_from_invoice();

commit;
