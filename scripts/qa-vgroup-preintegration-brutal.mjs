import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const exists=p=>fs.existsSync(p);
const hospitality=read('app/group/hospitality/page.tsx');
const hospitalityLayout=read('app/group/hospitality/layout.tsx');
const propertyDash=read('app/group/hospitality/properties/[id]/page.tsx');
const tech=read('app/group/tech/page.tsx');
const techLayout=read('app/group/tech/layout.tsx');
const access=read('lib/vgroup/access.ts');
const apiAccess=read('lib/vgroup/api-access.ts');
const dashboard=read('lib/vgroup/dashboard.ts');
const expensesApi=read('app/api/vgroup/hospitality/expenses/route.ts');
const propertiesApi=read('app/api/vgroup/hospitality/properties/route.ts');
const techOps=read('app/api/vgroup/tech/operations/route.ts');
const accounting=read('scripts/qa-vgroup-accounting-integration-contract.mjs');
const checks=[
  ['Hospitality entry is access-gated',/requireBusinessUnitAccess\("hospitality"\)/.test(hospitality)],
  ['Hospitality entry is property-first',/Choose your property/.test(hospitality)&&/properties\/\$\{property\.id\}/.test(hospitality)],
  ['Hospitality selector uses property cover photos',/property_images/.test(hospitality)&&/signedCover/.test(hospitality)],
  ['Hospitality selector excludes archived units',/p\.archived_at is null/.test(hospitality)],
  ['Per-property dashboard exists',exists('app/group/hospitality/properties/[id]/page.tsx')&&/PROPERTY CONTEXT ACTIVE/.test(propertyDash)],
  ['Per-property dashboard scopes operational data by property',/property_id=\$\{id\}::uuid/.test(propertyDash)],
  ['Per-property dashboard covers reservations, maintenance, expenses and owner net',/Recent reservations/.test(propertyDash)&&/Recent expenses/.test(propertyDash)&&/open_work_orders/.test(propertyDash)&&/owner_net/.test(propertyDash)],
  ['Hospitality brand shell is navy-gold',/#0C1B2A/.test(hospitalityLayout)&&/#D6AD5B/.test(hospitalityLayout)],
  ['Hospitality brand shell overrides nested workspace surfaces',/main article/.test(hospitalityLayout)&&/main form/.test(hospitalityLayout)&&/main input/.test(hospitalityLayout)],
  ['Technology brand shell is dark-blue',/#070B12/.test(techLayout)&&/#42ADF5/.test(techLayout)],
  ['Technology home uses matching blue identity',/#42adf5/i.test(tech)&&/#52baff/i.test(tech)],
  ['Business-unit server access checks exist',/requireBusinessUnitAccess/.test(access)&&/requireBusinessPermission/.test(access)],
  ['API permission checks are centralized',/requireApiPermission/.test(apiAccess)],
  ['Hospitality expense API exists and is permission-gated',/requireApiPermission/.test(expensesApi)&&/hospitality/.test(expensesApi)],
  ['Hospitality property API is permission-gated',/requireApiPermission/.test(propertiesApi)],
  ['Tech operations API is permission-gated',/requireApiPermission/.test(techOps)],
  ['Dashboard aggregation is server-side',/getVGroupSql/.test(dashboard)&&/ledger_transactions/.test(dashboard)],
  ['Accounting integration contract gate exists',/chart_of_accounts|account/i.test(accounting)],
  ['Marketing integration remains outside this gate',!hospitality.includes('MARKETING_INTEGRATION_ENABLED')&&!tech.includes('MARKETING_INTEGRATION_ENABLED')],
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'}  ${name}`);
if(failed.length){console.error(`preintegration-brutal: ${failed.length}/${checks.length} failed`);process.exit(1)}
console.log(`preintegration-brutal: ${checks.length}/${checks.length} critical contracts verified`);
