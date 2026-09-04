begin;

-- Candidate-only migration. Do not apply to Production before Hospitality release gates pass.
-- reservation.net_owner_amount is the canonical stay-level owner value:
--   * direct stays: gross - platform fee - VIVIT commission
--   * Airbnb stays: trusted airbnb_net_payout - VIVIT commission via trg_set_reservation_net_owner
create or replace function hospitality.generate_owner_statement(
  p_owner_id uuid,
  p_period_start date,
  p_period_end date
)
returns hospitality.owner_statements
language plpgsql
security definer
set search_path to 'hospitality', 'vgroup', 'public'
as $function$
declare
  v_bu uuid;
  v_gross numeric := 0;
  v_fees numeric := 0;
  v_stay_net numeric := 0;
  v_expenses numeric := 0;
  v_row hospitality.owner_statements;
begin
  if p_period_end < p_period_start then
    raise exception 'invalid_statement_period';
  end if;

  select business_unit_id into v_bu
  from hospitality.owners
  where id = p_owner_id and archived_at is null;

  if v_bu is null then
    raise exception 'owner_not_found';
  end if;

  select
    coalesce(sum(r.gross_amount), 0),
    coalesce(sum(greatest(coalesce(r.gross_amount,0) - coalesce(r.net_owner_amount,0), 0)), 0),
    coalesce(sum(r.net_owner_amount), 0)
  into v_gross, v_fees, v_stay_net
  from hospitality.reservations r
  join hospitality.properties p on p.id = r.property_id
  where p.owner_id = p_owner_id
    and p.archived_at is null
    and r.archived_at is null
    and r.status not in ('cancelled','no_show')
    and r.check_in between p_period_start and p_period_end;

  select coalesce(sum(i.total), 0)
  into v_expenses
  from hospitality.invoices i
  where i.archived_at is null
    and i.status in ('approved','paid')
    and (
      i.owner_id = p_owner_id
      or i.property_id in (
        select id from hospitality.properties
        where owner_id = p_owner_id and archived_at is null
      )
    )
    and i.issued_at between p_period_start and p_period_end
    and i.invoice_type in ('owner_charge','vendor_bill','other');

  insert into hospitality.owner_statements(
    business_unit_id, owner_id, period_start, period_end, currency,
    gross_revenue, total_expenses, total_fees, net_payable, status, generated_at
  ) values (
    v_bu, p_owner_id, p_period_start, p_period_end, 'EGP',
    v_gross, v_expenses, v_fees, greatest(v_stay_net - v_expenses, 0), 'final', now()
  )
  on conflict(owner_id, period_start, period_end) do update set
    gross_revenue = excluded.gross_revenue,
    total_expenses = excluded.total_expenses,
    total_fees = excluded.total_fees,
    net_payable = excluded.net_payable,
    status = 'final',
    generated_at = now()
  returning * into v_row;

  return v_row;
end
$function$;

commit;
