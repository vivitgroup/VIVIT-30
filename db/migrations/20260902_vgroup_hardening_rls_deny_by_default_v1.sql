do $$
declare r record;
begin
  for r in select * from (values
    ('hospitality','property_owner_assignments'),('hospitality','property_images'),('hospitality','cancellation_events'),('hospitality','expense_approval_rules'),('hospitality','inventory_reorder_alerts'),('hospitality','owner_statement_adjustments'),('hospitality','maintenance_sla_rules'),('hospitality','work_order_escalations'),
    ('tech','project_cost_entries'),('tech','installment_escalations'),('tech','subscription_entitlements'),('tech','subscription_usage'),('tech','project_acceptances'),
    ('vgroup','finance_periods'),('vgroup','approval_requests'),('vgroup','permission_delegations'),('vgroup','operational_exceptions'),('vgroup','notification_escalation_rules'),('vgroup','kpi_targets'),('vgroup','data_retention_policies'),('vgroup','intercompany_settlements')
  ) as x(schema_name,table_name)
  loop
    execute format('drop policy if exists backend_only_deny on %I.%I',r.schema_name,r.table_name);
    execute format('create policy backend_only_deny on %I.%I for all to anon, authenticated using (false) with check (false)',r.schema_name,r.table_name);
  end loop;
end $$;
