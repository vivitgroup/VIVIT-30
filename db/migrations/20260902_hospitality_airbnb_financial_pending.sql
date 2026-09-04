alter table hospitality.calendar_blocks
  add column if not exists finance_status text not null default 'pending',
  add column if not exists currency text not null default 'EGP',
  add column if not exists gross_amount numeric(14,2),
  add column if not exists airbnb_fee numeric(14,2),
  add column if not exists cleaning_fee numeric(14,2),
  add column if not exists taxes numeric(14,2),
  add column if not exists net_payout numeric(14,2),
  add column if not exists financial_completed_at timestamptz,
  add column if not exists financial_completed_by uuid references vgroup.users(id) on delete set null,
  add column if not exists reservation_id uuid references hospitality.reservations(id) on delete set null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='calendar_blocks_finance_status_check' and conrelid='hospitality.calendar_blocks'::regclass) then
    alter table hospitality.calendar_blocks add constraint calendar_blocks_finance_status_check check (finance_status in ('pending','complete','not_a_booking'));
  end if;
  if not exists (select 1 from pg_constraint where conname='calendar_blocks_financial_values_check' and conrelid='hospitality.calendar_blocks'::regclass) then
    alter table hospitality.calendar_blocks add constraint calendar_blocks_financial_values_check check (
      (gross_amount is null or gross_amount>=0) and
      (airbnb_fee is null or airbnb_fee>=0) and
      (cleaning_fee is null or cleaning_fee>=0) and
      (taxes is null or taxes>=0) and
      (net_payout is null or net_payout>=0)
    );
  end if;
end $$;

create index if not exists idx_calendar_blocks_finance_pending on hospitality.calendar_blocks(property_id,starts_on) where archived_at is null and finance_status='pending';
create index if not exists idx_calendar_blocks_reservation_id on hospitality.calendar_blocks(reservation_id) where reservation_id is not null;

alter table hospitality.reservations
  add column if not exists airbnb_cleaning_fee numeric(14,2),
  add column if not exists airbnb_taxes numeric(14,2),
  add column if not exists airbnb_net_payout numeric(14,2);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='reservations_airbnb_financial_values_check' and conrelid='hospitality.reservations'::regclass) then
    alter table hospitality.reservations add constraint reservations_airbnb_financial_values_check check (
      (airbnb_cleaning_fee is null or airbnb_cleaning_fee>=0) and
      (airbnb_taxes is null or airbnb_taxes>=0) and
      (airbnb_net_payout is null or airbnb_net_payout>=0)
    );
  end if;
end $$;

create or replace function hospitality.set_reservation_net_owner()
returns trigger
language plpgsql
set search_path to 'hospitality','public'
as $$
begin
  if new.source='airbnb' and new.airbnb_net_payout is not null then
    new.net_owner_amount := greatest(0,new.airbnb_net_payout);
  else
    new.net_owner_amount := greatest(0,coalesce(new.gross_amount,0)-coalesce(new.platform_fee,0)-coalesce(new.company_commission,0));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_reservation_net_owner on hospitality.reservations;
create trigger trg_set_reservation_net_owner
before insert or update of gross_amount,platform_fee,company_commission,airbnb_net_payout,source
on hospitality.reservations
for each row execute function hospitality.set_reservation_net_owner();
