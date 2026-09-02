-- Mirrors the isolated Group Supabase migration tech_business_operating_system_v2.
-- Adds resource planning, timesheets, retainers, UAT, issues/releases, commercial controls,
-- SaaS expansion, renewals, service catalog/quotations, feedback/postmortems and portfolio views.

create table if not exists tech.resource_capacity (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references vgroup.users(id), project_id uuid references tech.projects(id) on delete cascade,
  period_start date not null, period_end date not null, capacity_hours numeric(10,2) not null default 0 check(capacity_hours>=0), allocated_hours numeric(10,2) not null default 0 check(allocated_hours>=0),
  allocation_percent numeric(6,2) not null default 0 check(allocation_percent between 0 and 200), status text not null default 'planned' check(status in ('planned','confirmed','released')),
  created_at timestamptz not null default now(), unique(user_id,project_id,period_start,period_end), check(period_end>=period_start)
);
create table if not exists tech.timesheets (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references tech.projects(id) on delete cascade, user_id uuid not null references vgroup.users(id), checklist_item_id uuid references tech.checklist_items(id) on delete set null,
  work_date date not null, hours numeric(6,2) not null check(hours>0 and hours<=24), hourly_cost numeric(12,2) not null default 0 check(hourly_cost>=0), billable boolean not null default true,
  description text, status text not null default 'submitted' check(status in ('draft','submitted','approved','rejected')), approved_by uuid references vgroup.users(id), approved_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists timesheets_project_date_idx on tech.timesheets(project_id,work_date);
create index if not exists timesheets_user_date_idx on tech.timesheets(user_id,work_date);

create table if not exists tech.support_contracts (
 id uuid primary key default gen_random_uuid(), business_unit_id uuid not null references vgroup.business_units(id), client_id uuid not null references tech.clients(id), project_id uuid references tech.projects(id),
 contract_type text not null check(contract_type in ('retainer','maintenance','warranty','support')), name text not null, currency text not null default 'EGP', monthly_fee numeric(14,2) not null default 0 check(monthly_fee>=0), included_hours numeric(10,2) not null default 0,
 overage_hour_rate numeric(12,2) not null default 0, start_date date not null, end_date date, billing_day int not null default 1 check(billing_day between 1 and 28), status text not null default 'draft' check(status in ('draft','active','paused','expired','cancelled')), sla_rule_id uuid references tech.sla_rules(id), created_at timestamptz not null default now(), check(end_date is null or end_date>=start_date)
);
create table if not exists tech.recurring_services (
 id uuid primary key default gen_random_uuid(), support_contract_id uuid references tech.support_contracts(id) on delete cascade, client_id uuid not null references tech.clients(id), project_id uuid references tech.projects(id),
 service_code text not null, name text not null, billing_period text not null check(billing_period in ('monthly','quarterly','yearly')), currency text not null default 'EGP', amount numeric(14,2) not null check(amount>=0), next_bill_date date not null, status text not null default 'active' check(status in ('active','paused','cancelled')), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists tech.deliverables (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tech.projects(id) on delete cascade, phase_id uuid references tech.project_phases(id) on delete set null, milestone_id uuid references tech.milestones(id) on delete set null,
 title text not null, description text, version text, status text not null default 'draft' check(status in ('draft','submitted','changes_requested','accepted','rejected')), requires_client_signoff boolean not null default true,
 submitted_at timestamptz, decided_by uuid references vgroup.users(id), decided_at timestamptz, decision_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists tech.uat_cycles (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tech.projects(id) on delete cascade, deliverable_id uuid references tech.deliverables(id) on delete set null,
 cycle_number int not null default 1, status text not null default 'planned' check(status in ('planned','testing','issues_raised','fixing','retest','accepted','rejected')), starts_at timestamptz, ends_at timestamptz,
 accepted_by uuid references vgroup.users(id), accepted_at timestamptz, notes text, created_at timestamptz not null default now(), unique(project_id,deliverable_id,cycle_number)
);
create table if not exists tech.issues (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tech.projects(id) on delete cascade, uat_cycle_id uuid references tech.uat_cycles(id) on delete set null, deliverable_id uuid references tech.deliverables(id) on delete set null,
 issue_type text not null default 'bug' check(issue_type in ('bug','uat','support','security','performance','request')), title text not null, description text, severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
 status text not null default 'open' check(status in ('open','triaged','in_progress','blocked','fixed','verified','closed','wont_fix')), owner_id uuid references vgroup.users(id), target_release_id uuid, due_at timestamptz, resolved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists tech_issues_project_status_idx on tech.issues(project_id,status,severity);

create table if not exists tech.environments (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tech.projects(id) on delete cascade, name text not null, environment_type text not null check(environment_type in ('development','staging','production','sandbox','qa')),
 url text, region text, status text not null default 'active' check(status in ('active','maintenance','retired')), secret_reference text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(project_id,name)
);
create table if not exists tech.release_records (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tech.projects(id) on delete cascade, environment_id uuid references tech.environments(id) on delete set null,
 version text not null, release_type text not null default 'standard' check(release_type in ('standard','hotfix','rollback','emergency')), status text not null default 'planned' check(status in ('planned','approved','deploying','deployed','failed','rolled_back')),
 release_notes text, rollback_reference text, approved_by uuid references vgroup.users(id), deployed_by uuid references vgroup.users(id), deployed_at timestamptz, created_at timestamptz not null default now(), unique(project_id,environment_id,version)
);
alter table tech.issues add constraint issues_target_release_id_fkey foreign key(target_release_id) references tech.release_records(id) on delete set null;
create table if not exists tech.project_asset_registry (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tech.projects(id) on delete cascade, asset_type text not null check(asset_type in ('repository','domain','hosting','cloud','design','analytics','store','other')),
 label text not null, external_url text, external_reference text, secret_reference text, owner text, status text not null default 'active', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists tech.change_request_approval_rules (
 id uuid primary key default gen_random_uuid(), business_unit_id uuid not null references vgroup.business_units(id), min_amount numeric(14,2) not null default 0, max_amount numeric(14,2), required_role text not null,
 min_margin_percent numeric(6,2), active boolean not null default true, created_at timestamptz not null default now(), check(max_amount is null or max_amount>=min_amount)
);
create table if not exists tech.revenue_recognition (
 id uuid primary key default gen_random_uuid(), project_id uuid references tech.projects(id) on delete cascade, subscription_id uuid references tech.subscriptions(id) on delete cascade, support_contract_id uuid references tech.support_contracts(id) on delete cascade,
 recognition_method text not null check(recognition_method in ('milestone','percentage_completion','straight_line','invoice','manual_adjustment')), period_start date not null, period_end date not null,
 currency text not null default 'EGP', amount numeric(14,2) not null, source_reference text, status text not null default 'draft' check(status in ('draft','recognized','reversed')), recognized_at timestamptz, created_at timestamptz not null default now(), check(period_end>=period_start)
);
create table if not exists tech.credit_notes (
 id uuid primary key default gen_random_uuid(), project_id uuid references tech.projects(id), subscription_invoice_id uuid references tech.subscription_invoices(id), installment_id uuid references tech.payment_installments(id),
 currency text not null default 'EGP', amount numeric(14,2) not null check(amount>0), reason text not null, status text not null default 'draft' check(status in ('draft','approved','posted','void')), requested_by uuid references vgroup.users(id), approved_by uuid references vgroup.users(id), posted_at timestamptz, created_at timestamptz not null default now(), check(requested_by is null or approved_by is null or requested_by<>approved_by)
);
create table if not exists tech.collection_cases (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references tech.clients(id), project_id uuid references tech.projects(id), installment_id uuid references tech.payment_installments(id), subscription_invoice_id uuid references tech.subscription_invoices(id),
 stage int not null default 1 check(stage between 1 and 5), status text not null default 'open' check(status in ('open','promise_to_pay','finance_hold','service_suspended','resolved','written_off')), amount_due numeric(14,2) not null default 0, next_action_at timestamptz, owner_id uuid references vgroup.users(id), notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists tech.client_credit_profiles (
 client_id uuid primary key references tech.clients(id) on delete cascade, currency text not null default 'EGP', credit_limit numeric(14,2) not null default 0, payment_terms_days int not null default 0, risk_rating text not null default 'standard' check(risk_rating in ('low','standard','elevated','high','blocked')), on_hold boolean not null default false, updated_at timestamptz not null default now()
);

create table if not exists tech.saas_addons (
 id uuid primary key default gen_random_uuid(), business_unit_id uuid not null references vgroup.business_units(id), code text not null unique, name text not null, billing_period text not null check(billing_period in ('monthly','yearly','usage')), currency text not null default 'EGP', unit_price numeric(14,4) not null check(unit_price>=0), unit text not null default 'unit', active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists tech.subscription_addons (
 id uuid primary key default gen_random_uuid(), subscription_id uuid not null references tech.subscriptions(id) on delete cascade, addon_id uuid not null references tech.saas_addons(id), quantity numeric(14,4) not null default 1 check(quantity>=0), effective_from timestamptz not null default now(), effective_to timestamptz, status text not null default 'active' check(status in ('active','paused','cancelled')), unique(subscription_id,addon_id,effective_from)
);
create table if not exists tech.subscription_adjustments (
 id uuid primary key default gen_random_uuid(), subscription_id uuid not null references tech.subscriptions(id) on delete cascade, adjustment_type text not null check(adjustment_type in ('proration','overage','credit','upgrade','downgrade')), currency text not null default 'EGP', amount numeric(14,2) not null, period_start timestamptz, period_end timestamptz, metadata jsonb not null default '{}'::jsonb, invoiced_at timestamptz, created_at timestamptz not null default now()
);
alter table tech.subscriptions add column if not exists paused_at timestamptz;
alter table tech.subscriptions add column if not exists resume_at timestamptz;
alter table tech.subscriptions add column if not exists pause_reason text;
alter table tech.subscriptions add column if not exists churn_risk text not null default 'unknown';
create table if not exists tech.trial_events (
 id uuid primary key default gen_random_uuid(), subscription_id uuid not null references tech.subscriptions(id) on delete cascade, event_type text not null check(event_type in ('trial_started','trial_ending','converted','expired','extended')), occurred_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb
);
create table if not exists tech.customer_success_health (
 client_id uuid primary key references tech.clients(id) on delete cascade, usage_score numeric(6,2) not null default 0, billing_score numeric(6,2) not null default 0, support_score numeric(6,2) not null default 0, engagement_score numeric(6,2) not null default 0,
 health_score numeric(6,2) generated always as (round((usage_score+billing_score+support_score+engagement_score)/4,2)) stored, churn_risk text not null default 'unknown', updated_at timestamptz not null default now()
);
create table if not exists tech.renewal_pipeline (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references tech.clients(id), subscription_id uuid references tech.subscriptions(id), support_contract_id uuid references tech.support_contracts(id),
 renewal_date date not null, expected_value numeric(14,2) not null default 0, currency text not null default 'EGP', probability numeric(5,2) not null default 50 check(probability between 0 and 100), stage text not null default 'upcoming' check(stage in ('upcoming','contacted','proposal','negotiation','renewed','lost')), owner_id uuid references vgroup.users(id), created_at timestamptz not null default now()
);

create table if not exists tech.external_resources (
 id uuid primary key default gen_random_uuid(), name text not null, resource_type text not null check(resource_type in ('vendor','freelancer','contractor')), email text, phone text, currency text not null default 'EGP', hourly_rate numeric(12,2), status text not null default 'active', created_at timestamptz not null default now()
);
create table if not exists tech.external_resource_assignments (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tech.projects(id) on delete cascade, external_resource_id uuid not null references tech.external_resources(id), role text, agreed_amount numeric(14,2), actual_amount numeric(14,2) not null default 0, start_date date, end_date date, status text not null default 'active', created_at timestamptz not null default now()
);

create table if not exists tech.service_catalog (
 id uuid primary key default gen_random_uuid(), business_unit_id uuid not null references vgroup.business_units(id), code text not null unique, name text not null, category text not null, default_currency text not null default 'EGP', base_price numeric(14,2) not null default 0, default_duration_days int not null default 0, default_margin_floor numeric(6,2) not null default 0, active boolean not null default true, workflow_template jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists tech.project_templates (
 id uuid primary key default gen_random_uuid(), service_id uuid references tech.service_catalog(id), name text not null, description text, phases jsonb not null default '[]'::jsonb, checklist jsonb not null default '[]'::jsonb, installment_template jsonb not null default '[]'::jsonb, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists tech.quotations (
 id uuid primary key default gen_random_uuid(), business_unit_id uuid not null references vgroup.business_units(id), client_id uuid not null references tech.clients(id), service_id uuid references tech.service_catalog(id),
 title text not null, currency text not null default 'EGP', subtotal numeric(14,2) not null default 0, discount numeric(14,2) not null default 0, total numeric(14,2) not null default 0, estimated_cost numeric(14,2) not null default 0,
 margin_percent numeric(8,2) generated always as (case when total=0 then 0 else round(((total-estimated_cost)/total)*100,2) end) stored, duration_days int not null default 0, status text not null default 'draft' check(status in ('draft','internal_review','approved','sent','accepted','rejected','expired','converted')), valid_until date, created_by uuid references vgroup.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists tech.quotation_items (
 id uuid primary key default gen_random_uuid(), quotation_id uuid not null references tech.quotations(id) on delete cascade, description text not null, quantity numeric(12,2) not null default 1, unit_price numeric(14,2) not null default 0, estimated_cost numeric(14,2) not null default 0, total numeric(14,2) generated always as (round(quantity*unit_price,2)) stored
);
create table if not exists tech.proposal_approvals (
 id uuid primary key default gen_random_uuid(), quotation_id uuid not null references tech.quotations(id) on delete cascade, approval_type text not null check(approval_type in ('commercial','margin','timeline','management')), requested_by uuid not null references vgroup.users(id), decided_by uuid references vgroup.users(id), decision text not null default 'pending' check(decision in ('pending','approved','rejected')), notes text, requested_at timestamptz not null default now(), decided_at timestamptz, check(decided_by is null or requested_by<>decided_by)
);
create table if not exists tech.client_feedback (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references tech.projects(id) on delete cascade, client_id uuid not null references tech.clients(id), feedback_type text not null default 'delivery', score int not null check(score between 1 and 5), nps_score int check(nps_score between 0 and 10), comments text, submitted_at timestamptz not null default now()
);
create table if not exists tech.project_postmortems (
 id uuid primary key default gen_random_uuid(), project_id uuid not null unique references tech.projects(id) on delete cascade, outcome text not null check(outcome in ('successful','partial','delayed','loss','cancelled')), summary text not null, what_went_well text, what_went_wrong text, lessons_learned text, action_items jsonb not null default '[]'::jsonb, created_by uuid references vgroup.users(id), created_at timestamptz not null default now()
);

create or replace function tech.enforce_capacity_guard() returns trigger language plpgsql as $$
declare total numeric;
begin
 select coalesce(sum(allocation_percent),0) into total from tech.resource_capacity where user_id=new.user_id and status<>'released' and daterange(period_start,period_end,'[]') && daterange(new.period_start,new.period_end,'[]') and id<>new.id;
 if total+new.allocation_percent>100 then raise exception 'RESOURCE_OVERALLOCATED'; end if;
 return new;
end$$;
drop trigger if exists resource_capacity_guard on tech.resource_capacity;
create trigger resource_capacity_guard before insert or update on tech.resource_capacity for each row execute function tech.enforce_capacity_guard();

create or replace function tech.quote_recalculate(p_quote uuid) returns void language plpgsql as $$
begin
 update tech.quotations q set subtotal=x.subtotal,total=greatest(0,x.subtotal-q.discount),estimated_cost=x.cost,updated_at=now()
 from (select coalesce(sum(total),0) subtotal,coalesce(sum(estimated_cost*quantity),0) cost from tech.quotation_items where quotation_id=p_quote) x where q.id=p_quote;
end$$;

create or replace function tech.subscription_proration(p_subscription uuid,p_new_plan uuid,p_effective_at timestamptz default now()) returns numeric language plpgsql as $$
declare old_price numeric; new_price numeric; pstart timestamptz; pend timestamptz; fraction numeric; amount numeric;
begin
 select sp.price,s.current_period_start,s.current_period_end into old_price,pstart,pend from tech.subscriptions s join tech.subscription_plans sp on sp.id=s.plan_id where s.id=p_subscription for update;
 select price into new_price from tech.subscription_plans where id=p_new_plan;
 if old_price is null or new_price is null or pend is null or pstart is null or pend<=pstart then raise exception 'PRORATION_INPUT_INVALID'; end if;
 fraction:=greatest(0,least(1,extract(epoch from (pend-p_effective_at))/extract(epoch from (pend-pstart)))); amount:=round((new_price-old_price)*fraction,2);
 insert into tech.subscription_adjustments(subscription_id,adjustment_type,amount,period_start,period_end,metadata) values(p_subscription,'proration',amount,p_effective_at,pend,jsonb_build_object('new_plan_id',p_new_plan));
 update tech.subscriptions set plan_id=p_new_plan,updated_at=now() where id=p_subscription; return amount;
end$$;

create or replace view tech.project_budget_actual as
select p.id project_id,p.name,p.currency,p.current_price budget_revenue,
 coalesce((select sum(c.amount) from tech.project_cost_entries c where c.project_id=p.id),0)+coalesce((select sum(t.hours*t.hourly_cost) from tech.timesheets t where t.project_id=p.id and t.status='approved'),0)+coalesce((select sum(a.actual_amount) from tech.external_resource_assignments a where a.project_id=p.id),0) actual_cost,
 p.current_price-(coalesce((select sum(c.amount) from tech.project_cost_entries c where c.project_id=p.id),0)+coalesce((select sum(t.hours*t.hourly_cost) from tech.timesheets t where t.project_id=p.id and t.status='approved'),0)+coalesce((select sum(a.actual_amount) from tech.external_resource_assignments a where a.project_id=p.id),0)) forecast_margin
from tech.projects p where p.archived_at is null;
create or replace view tech.project_profitability_forecast as
select b.*, case when budget_revenue=0 then 0 else round((forecast_margin/budget_revenue)*100,2) end forecast_margin_percent,
 coalesce((select avg(score) from tech.project_risks r where r.project_id=b.project_id and r.status<>'closed'),0) risk_score,
 coalesce((select sum(greatest(0,current_date-m.due_date)) from tech.milestones m where m.project_id=b.project_id and m.status<>'completed' and m.due_date<current_date),0) schedule_delay_days
from tech.project_budget_actual b;
create or replace view tech.capacity_utilization as
select user_id,period_start,period_end,sum(capacity_hours) capacity_hours,sum(allocated_hours) allocated_hours,sum(allocation_percent) allocation_percent from tech.resource_capacity where status<>'released' group by user_id,period_start,period_end;
create or replace view tech.portfolio_summary as
select count(*) filter(where p.archived_at is null) projects,
 count(*) filter(where p.status in ('active','in_progress')) active_projects,
 coalesce(sum(p.current_price) filter(where p.archived_at is null),0) contracted_revenue,
 coalesce(sum(f.forecast_margin) filter(where p.archived_at is null),0) forecast_margin,
 coalesce(avg(h.health_score) filter(where p.archived_at is null),0) avg_health_score,
 count(*) filter(where f.forecast_margin<0 and p.archived_at is null) loss_risk_projects,
 count(*) filter(where exists(select 1 from tech.collection_cases c where c.project_id=p.id and c.status not in ('resolved','written_off')) and p.archived_at is null) collection_risk_projects
from tech.projects p left join tech.project_profitability_forecast f on f.project_id=p.id left join tech.project_health h on h.project_id=p.id;
create or replace view tech.renewal_forecast as
select stage,currency,count(*) opportunities,coalesce(sum(expected_value*probability/100),0) weighted_value,min(renewal_date) next_renewal from tech.renewal_pipeline group by stage,currency;

insert into tech.service_catalog(business_unit_id,code,name,category,base_price,default_duration_days,default_margin_floor) select id,'WEB','Website / Web App','delivery',0,30,30 from vgroup.business_units where code='tech' on conflict(code) do nothing;
insert into tech.service_catalog(business_unit_id,code,name,category,base_price,default_duration_days,default_margin_floor) select id,'MOBILE','Mobile Application','delivery',0,60,30 from vgroup.business_units where code='tech' on conflict(code) do nothing;
insert into tech.service_catalog(business_unit_id,code,name,category,base_price,default_duration_days,default_margin_floor) select id,'ERP','ERP / Business System','delivery',0,90,35 from vgroup.business_units where code='tech' on conflict(code) do nothing;
insert into tech.service_catalog(business_unit_id,code,name,category,base_price,default_duration_days,default_margin_floor) select id,'AI','AI & Automation','delivery',0,45,35 from vgroup.business_units where code='tech' on conflict(code) do nothing;
insert into tech.service_catalog(business_unit_id,code,name,category,base_price,default_duration_days,default_margin_floor) select id,'SUPPORT','Support & Maintenance','recurring',0,30,40 from vgroup.business_units where code='tech' on conflict(code) do nothing;

alter table tech.resource_capacity enable row level security; alter table tech.timesheets enable row level security; alter table tech.support_contracts enable row level security; alter table tech.recurring_services enable row level security; alter table tech.deliverables enable row level security; alter table tech.uat_cycles enable row level security; alter table tech.issues enable row level security; alter table tech.environments enable row level security; alter table tech.release_records enable row level security; alter table tech.project_asset_registry enable row level security; alter table tech.change_request_approval_rules enable row level security; alter table tech.revenue_recognition enable row level security; alter table tech.credit_notes enable row level security; alter table tech.collection_cases enable row level security; alter table tech.client_credit_profiles enable row level security; alter table tech.saas_addons enable row level security; alter table tech.subscription_addons enable row level security; alter table tech.subscription_adjustments enable row level security; alter table tech.trial_events enable row level security; alter table tech.customer_success_health enable row level security; alter table tech.renewal_pipeline enable row level security; alter table tech.external_resources enable row level security; alter table tech.external_resource_assignments enable row level security; alter table tech.service_catalog enable row level security; alter table tech.project_templates enable row level security; alter table tech.quotations enable row level security; alter table tech.quotation_items enable row level security; alter table tech.proposal_approvals enable row level security; alter table tech.client_feedback enable row level security; alter table tech.project_postmortems enable row level security;
