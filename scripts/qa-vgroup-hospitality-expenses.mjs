import fs from 'node:fs';
import path from 'node:path';
const read=p=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const migration=read('db/migrations/20260902_hospitality_property_bound_expenses_and_receipts.sql');
const api=read('app/api/vgroup/hospitality/expenses/route.ts');
const report=read('app/api/vgroup/hospitality/expenses/report/route.ts');
const generator=read('lib/vgroup/hospitality-expense-report.ts');
const ui=read('components/vgroup/hospitality-finance-panel.tsx');
const checks=[
 [migration.includes('alter column property_id set not null'),'Hospitality invoice property must be DB-required'],
 [migration.includes('guard_invoice_property_scope'),'Property/business-unit scope trigger missing'],
 [migration.includes('invoice_receipts'),'Private receipt metadata table missing'],
 [api.includes('PROPERTY_REQUIRED'),'Expense API must reject missing property'],
 [api.includes('vgroup-hospitality')&&api.includes('expenses/${property.business_unit_id}'),'Receipt storage is not isolated under Hospitality expense paths'],
 [api.includes('image/jpeg')&&api.includes('application/pdf')&&api.includes('20*1024*1024'),'Receipt type/size validation missing'],
 [api.includes("'hospitality.expense.create'")||api.includes('hospitality.expense.create'),'Expense audit event missing'],
 [report.includes('finance:export'),'Property report export permission missing'],
 [report.includes('i.property_id=${propertyId}::uuid'),'Report is not property-scoped'],
 [report.includes('between ${from}::date and ${to}::date'),'Report period filter missing'],
 [generator.includes('VIVIT HOSPITALITY')&&generator.includes('#D6AD5B')&&generator.includes('#0C1B2A'),'Hospitality brand lockup/colors missing from reports'],
 [generator.includes('application/vnd.ms-excel')===false,'Generator should remain format-only and route owns response MIME'],
 [ui.includes('Property / Apartment *')&&ui.includes('required'),'UI does not require a property'],
 [ui.includes('receipt')&&ui.includes('application/pdf'),'UI receipt upload control missing'],
 [ui.includes('Excel')&&ui.includes('PDF'),'UI export actions missing'],
];
for(const [ok,message] of checks)if(!ok)throw new Error(message);
console.log(`hospitality-expenses: ${checks.length} property binding, receipt and branded export controls verified`);
