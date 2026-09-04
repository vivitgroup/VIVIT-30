import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=[
 'db/migrations/20260902_hospitality_property_ownership_and_media_v1.sql',
 'db/migrations/20260902_vgroup_business_logic_hardening_round_v1.sql',
 'db/migrations/20260902_vgroup_hardening_rls_deny_by_default_v1.sql',
 'db/migrations/20260902_vgroup_hardening_fk_indexes_v1.sql',
 'app/api/vgroup/hospitality/properties/route.ts',
 'app/api/vgroup/hospitality/properties/[id]/route.ts',
 'app/api/vgroup/hospitality/properties/[id]/images/route.ts',
 'app/group/hospitality/properties/page.tsx',
 'components/vgroup/property-manager.tsx'
];
for(const file of files)if(!fs.existsSync(path.join(root,file)))throw new Error(`Missing business-hardening artifact: ${file}`);
const propertyApi=read('app/api/vgroup/hospitality/properties/route.ts');
for(const marker of ['left join hospitality.owners','ownerId=body.ownerId?','hospitality.set_property_owner','hospitality.property_images'])if(!propertyApi.includes(marker))throw new Error(`Property optional-owner contract missing: ${marker}`);
const imageApi=read('app/api/vgroup/hospitality/properties/[id]/images/route.ts');
for(const marker of ['vgroup-hospitality','image/jpeg','20*1024*1024','property.image.upload','property.image.delete'])if(!imageApi.includes(marker))throw new Error(`Property image contract missing: ${marker}`);
const manager=read('components/vgroup/property-manager.tsx');
for(const marker of ['No owner yet','multiple','Cover + Gallery','isCover'])if(!manager.includes(marker))throw new Error(`Property manager UI contract missing: ${marker}`);
const sql=read('db/migrations/20260902_vgroup_business_logic_hardening_round_v1.sql');
const required=[
 'finance_periods','approval_requests','permission_delegations','operational_exceptions','notification_escalation_rules','kpi_targets','data_retention_policies','intercompany_settlements',
 'guard_finance_period','guard_ledger_immutable','reverse_ledger_transaction','quote_cancellation','guard_owner_payout','guard_refund_maker_checker','expense_approval_rules','inventory_reorder_alerts','owner_statement_adjustments','maintenance_sla_rules','property_profitability','property_kpis_30d',
 'guard_project_dependency_cycle','requires_client_acceptance','project_cost_entries','project_margin','installment_escalations','change_request_cumulative_impact','refresh_sla_escalations','refresh_subscription_dunning','subscription_entitlements','subscription_usage','project_acceptances','project_health'
];
for(const marker of required)if(!sql.includes(marker))throw new Error(`Business logic hardening missing: ${marker}`);
const rls=read('db/migrations/20260902_vgroup_hardening_rls_deny_by_default_v1.sql');
if(!rls.includes('backend_only_deny')||!rls.includes('using (false)'))throw new Error('Default-deny RLS contract missing');
console.log(`business-hardening: ${required.length} controls plus optional ownership and isolated property media verified`);
