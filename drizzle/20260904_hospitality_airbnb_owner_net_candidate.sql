begin;

-- Candidate-only finance remediation. Do not apply to Production before Hospitality release gates pass.
-- Airbnb's trusted net payout is the amount received from the channel before VIVIT's commission.
-- The owner's canonical stay-level net is therefore channel net payout minus company commission.
create or replace function hospitality.set_reservation_net_owner()
returns trigger
language plpgsql
set search_path to 'hospitality','public'
as $function$
begin
  if new.source='airbnb' and new.airbnb_net_payout is not null then
    new.net_owner_amount := greatest(0,coalesce(new.airbnb_net_payout,0)-coalesce(new.company_commission,0));
  else
    new.net_owner_amount := greatest(0,coalesce(new.gross_amount,0)-coalesce(new.platform_fee,0)-coalesce(new.company_commission,0));
  end if;
  return new;
end
$function$;

-- Safe backfill if any candidate/test Airbnb rows exist when this migration is applied.
update hospitality.reservations
set updated_at=now()
where source='airbnb' and airbnb_net_payout is not null and archived_at is null;

commit;
