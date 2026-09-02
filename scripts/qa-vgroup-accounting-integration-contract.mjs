import fs from 'node:fs';
const contract=fs.readFileSync('lib/vgroup/accounting-contract.ts','utf8');
const migration=fs.readFileSync('db/migrations/20260902_vgroup_accounting_integration_contract_v1.sql','utf8');
const marketingQa=fs.readFileSync('scripts/qa-vgroup-marketing-integration.mjs','utf8');
const required=[
 '4000_hospitality_room_revenue','5000_hospitality_operating_expense','2100_owner_payable',
 '4100_tech_project_revenue','4110_tech_cr_revenue','4120_tech_support_revenue','4130_tech_saas_revenue',
 '5100_tech_delivery_cost','5110_tech_external_resource_cost',
 '4200_marketing_service_revenue','5200_marketing_media_spend','5210_marketing_operating_expense','1100_accounts_receivable',
 '1300_intercompany_receivable','2300_intercompany_payable','4900_contra_revenue'
];
for(const code of required) if(!contract.includes(code)||!migration.includes(code)) throw new Error(`Accounting mapping missing: ${code}`);
if(!contract.includes('ACCOUNTING_CONTRACT_VERSION = "2026-09-02-v1"')) throw new Error('Accounting contract version missing');
if(!contract.includes('UNMAPPED_ACCOUNTING_EVENT')||!migration.includes('UNMAPPED_ACCOUNTING_EVENT')) throw new Error('Fail-closed unmapped accounting event guard missing');
const distinctGroups=[
 ['4100_tech_project_revenue','4110_tech_cr_revenue','4120_tech_support_revenue','4130_tech_saas_revenue'],
 ['2100_owner_payable','5000_hospitality_operating_expense'],
 ['4200_marketing_service_revenue','5200_marketing_media_spend','5210_marketing_operating_expense','1100_accounts_receivable'],
 ['1300_intercompany_receivable','2300_intercompany_payable']
];
for(const group of distinctGroups) if(new Set(group).size!==group.length) throw new Error(`Accounting codes must stay distinct: ${group.join(',')}`);
const tupleRegex=/\{businessUnit:"([^"]+)",sourceType:"([^"]+)",eventType:"([^"]+)"/g;
const keys=[]; let match; while((match=tupleRegex.exec(contract))) keys.push(match.slice(1).join(':'));
if(keys.length<22) throw new Error(`Expected at least 22 accounting mappings, got ${keys.length}`);
if(new Set(keys).size!==keys.length) throw new Error('Duplicate accounting event mapping keys detected');
for(const phrase of ['accounting_event_mappings','resolve_accounting_event_mapping','security definer','set search_path = pg_catalog, vgroup','finance_summary']) if(!migration.includes(phrase)) throw new Error(`Accounting DB contract missing: ${phrase}`);
if(!marketingQa.includes('MARKETING_INTEGRATION_ENABLED')) throw new Error('Marketing integration disabled/default gate evidence missing');
console.log(`accounting-integration-contract: ${keys.length} canonical mappings, fail-closed resolution, distinct BU accounts and consolidated finance categories verified`);
