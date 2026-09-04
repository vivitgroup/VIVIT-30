alter table hospitality.invoices alter column property_id set not null;

alter table hospitality.invoices
  add column if not exists notes text,
  add column if not exists created_by uuid references vgroup.users(id);

create table if not exists hospitality.invoice_receipts(
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references hospitality.invoices(id) on delete restrict,
  object_path text not null unique,
  file_name text not null,
  mime_type text not null,
  byte_size bigint not null check(byte_size > 0 and byte_size <= 20971520),
  created_by uuid not null references vgroup.users(id),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invoices_property_issued_idx on hospitality.invoices(property_id,issued_at desc) where archived_at is null;
create index if not exists invoice_receipts_invoice_idx on hospitality.invoice_receipts(invoice_id) where archived_at is null;

alter table hospitality.invoice_receipts enable row level security;
drop policy if exists invoice_receipts_server_only on hospitality.invoice_receipts;
create policy invoice_receipts_server_only on hospitality.invoice_receipts for all using(false) with check(false);

create or replace function hospitality.guard_invoice_property_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, hospitality, vgroup
as $$
begin
  if not exists(
    select 1 from hospitality.properties p
    where p.id=new.property_id
      and p.business_unit_id=new.business_unit_id
      and p.archived_at is null
  ) then
    raise exception 'EXPENSE_PROPERTY_SCOPE_INVALID';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoice_property_scope on hospitality.invoices;
create trigger trg_invoice_property_scope
before insert or update of property_id,business_unit_id on hospitality.invoices
for each row execute function hospitality.guard_invoice_property_scope();
