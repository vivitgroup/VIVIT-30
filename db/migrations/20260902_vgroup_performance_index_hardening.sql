drop index if exists hospitality.owner_statements_owner_period_uq;
drop index if exists hospitality.idx_security_deposits_reservation_status;
drop index if exists tech.change_requests_project_status_idx;
drop index if exists tech.cr_project_status_idx;
drop index if exists tech.installments_project_due_idx;

create index if not exists contracts_business_unit_id_idx on hospitality.contracts(business_unit_id);
create index if not exists invoices_approved_by_idx on hospitality.invoices(approved_by);
create index if not exists invoices_business_unit_id_idx on hospitality.invoices(business_unit_id);
create index if not exists owner_payouts_business_unit_id_idx on hospitality.owner_payouts(business_unit_id);
create index if not exists owner_payouts_statement_id_idx on hospitality.owner_payouts(statement_id);
create index if not exists owner_statements_business_unit_id_idx on hospitality.owner_statements(business_unit_id);
create index if not exists owners_user_id_idx on hospitality.owners(user_id);
create index if not exists properties_business_unit_id_idx on hospitality.properties(business_unit_id);
create index if not exists purchase_orders_business_unit_id_idx on hospitality.purchase_orders(business_unit_id);
create index if not exists refunds_approved_by_idx on hospitality.refunds(approved_by);
create index if not exists refunds_business_unit_id_idx on hospitality.refunds(business_unit_id);
create index if not exists refunds_requested_by_idx on hospitality.refunds(requested_by);
create index if not exists reservations_channel_connection_id_idx on hospitality.reservations(channel_connection_id);
create index if not exists security_deposits_business_unit_id_idx on hospitality.security_deposits(business_unit_id);
create index if not exists work_orders_business_unit_id_idx on hospitality.work_orders(business_unit_id);

create index if not exists delivery_acceptances_decided_by_idx on tech.delivery_acceptances(decided_by);
create index if not exists delivery_acceptances_phase_id_idx on tech.delivery_acceptances(phase_id);
create index if not exists project_dependencies_depends_on_milestone_id_idx on tech.project_dependencies(depends_on_milestone_id);
create index if not exists project_dependencies_depends_on_project_id_idx on tech.project_dependencies(depends_on_project_id);
create index if not exists project_risks_owner_id_idx on tech.project_risks(owner_id);
create index if not exists projects_business_unit_id_idx on tech.projects(business_unit_id);
create index if not exists sla_incidents_sla_rule_id_idx on tech.sla_incidents(sla_rule_id);
create index if not exists sla_incidents_subscription_id_idx on tech.sla_incidents(subscription_id);
create index if not exists sla_rules_business_unit_id_idx on tech.sla_rules(business_unit_id);
create index if not exists subscriptions_business_unit_id_idx on tech.subscriptions(business_unit_id);

create index if not exists intercompany_transactions_approved_by_idx on vgroup.intercompany_transactions(approved_by);
create index if not exists intercompany_transactions_from_bu_idx on vgroup.intercompany_transactions(from_business_unit_id);
create index if not exists intercompany_transactions_to_bu_idx on vgroup.intercompany_transactions(to_business_unit_id);
