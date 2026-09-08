create or replace function public.assign_sales_lead_rep()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sales_rep_id is null then
    select u.id
      into new.sales_rep_id
      from public.users u
     where u.workspace_id = new.workspace_id
       and u.role = 'SALES'
       and u.is_active = true
       and u.approval_status = 'APPROVED'
     order by (
       select count(*)
         from public.sales_leads l
        where l.workspace_id = new.workspace_id
          and l.sales_rep_id = u.id
          and l.archived_at is null
     ) asc,
     u.created_at asc,
     u.id asc
     limit 1;
  end if;
  return new;
end;
$$;

revoke all on function public.assign_sales_lead_rep() from public, anon, authenticated;

drop trigger if exists trg_assign_sales_lead_rep on public.sales_leads;
create trigger trg_assign_sales_lead_rep
before insert on public.sales_leads
for each row
execute function public.assign_sales_lead_rep();
