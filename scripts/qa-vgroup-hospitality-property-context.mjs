import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const reservations=read("app/group/hospitality/reservations/page.tsx");
const financePage=read("app/group/hospitality/finance/page.tsx");
const operations=read("app/group/hospitality/operations/page.tsx");
const ownerPage=read("app/group/hospitality/owner-portal/page.tsx");
const financePanel=read("components/vgroup/hospitality-finance-panel.tsx");
const ownerPanel=read("components/vgroup/owner-portal-panel.tsx");
const financeApi=read("app/api/vgroup/hospitality/finance/route.ts");
const ownerApi=read("app/api/vgroup/hospitality/owner-portal/route.ts");

const failClosed=source=>source.includes('rawPropertyId&&!uuid.test(rawPropertyId)')&&source.includes("notFound()")&&source.includes("archived_at is null");
const checks=[
 ["Reservations page fails closed on invalid/missing property",failClosed(reservations)],
 ["Finance page fails closed on invalid/missing property",failClosed(financePage)],
 ["Operations page fails closed on invalid/missing property",failClosed(operations)],
 ["Owner Portal page fails closed on invalid/missing property",failClosed(ownerPage)],
 ["Reservation creation locks selected property",reservations.includes('readOnly:Boolean(propertyId)')&&reservations.includes('defaultValue:propertyId||undefined')],
 ["Finance client carries property context to reads",financePanel.includes('/api/vgroup/hospitality/finance${query}')&&financePanel.includes('/api/vgroup/hospitality/expenses${query}')],
 ["Finance expense mutation overrides property from context",financePanel.includes('if(propertyId)form.set("propertyId",propertyId)')],
 ["Finance property report selector locks in scoped view",financePanel.includes('disabled={Boolean(propertyId)}')],
 ["Finance API validates and scopes property",financeApi.includes('property_not_found')&&financeApi.includes('where property_id=${propertyId}::uuid')&&financeApi.includes('propertyScoped:true')],
 ["Portfolio statements/payouts hidden in property finance",financeApi.includes('statements:[],payouts:[]')&&financePanel.includes('!propertyId&&<section><h2>Owner statements')],
 ["Owner Portal client carries property context",ownerPanel.includes('/api/vgroup/hospitality/owner-portal${query}')],
 ["Owner Portal API rejects inaccessible property",ownerApi.includes('property_not_accessible')&&ownerApi.includes('allProperties.some(p=>p.id===propertyId)')],
 ["Owner Portal property data is scoped",ownerApi.includes('allProperties.filter(p=>p.id===propertyId)')&&ownerApi.includes('r.property_id=any(${propertyIds}::uuid[])')],
 ["Owner-wide statements hidden in property portal",ownerApi.includes('const statements:StatementRow[]=propertyId?[]')&&ownerPanel.includes('!propertyId&&<div')],
 ["Operations work orders are property-scoped",operations.includes('w.property_id=${effectivePropertyId}::uuid')],
 ["Operations purchase orders are property-scoped",operations.includes('po.property_id=${effectivePropertyId}::uuid')],
 ["Operations reservations/calendar are property-scoped",operations.includes('r.property_id=${effectivePropertyId}::uuid')&&operations.includes('properties:PropertyRow[]=effectivePropertyId')],
];

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?"PASS":"FAIL"} ${name}`);
if(failed.length){console.error(`Hospitality property-context QA failed: ${failed.length}/${checks.length}`);process.exit(1)}
console.log(`Hospitality property-context QA passed: ${checks.length}/${checks.length}`);
