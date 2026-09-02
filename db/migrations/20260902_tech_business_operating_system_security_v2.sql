alter function tech.enforce_capacity_guard() set search_path = pg_catalog;
alter function tech.quote_recalculate(uuid) set search_path = pg_catalog;
alter function tech.subscription_proration(uuid,uuid,timestamptz) set search_path = pg_catalog;

do $$
declare t text;
begin
 foreach t in array array['resource_capacity','timesheets','support_contracts','recurring_services','deliverables','uat_cycles','issues','environments','release_records','project_asset_registry','change_request_approval_rules','revenue_recognition','credit_notes','collection_cases','client_credit_profiles','saas_addons','subscription_addons','subscription_adjustments','trial_events','customer_success_health','renewal_pipeline','external_resources','external_resource_assignments','service_catalog','project_templates','quotations','quotation_items','proposal_approvals','client_feedback','project_postmortems'] loop
   execute format('drop policy if exists server_only on tech.%I',t);
   execute format('create policy server_only on tech.%I for all to public using (false) with check (false)',t);
 end loop;
end$$;
