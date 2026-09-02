import fs from 'node:fs';
import path from 'node:path';
const read=(p)=>fs.readFileSync(path.join(process.cwd(),p),'utf8');

const techPortal=read('app/api/vgroup/tech/client-portal/route.ts');
const ownerPortal=read('app/api/vgroup/hospitality/owner-portal/route.ts');
const audit=read('app/api/vgroup/admin/audit/route.ts');
const archive=read('app/api/vgroup/admin/archive/route.ts');
const crApprove=read('app/api/vgroup/tech/change-requests/[id]/approve/route.ts');
const crPrice=read('app/api/vgroup/tech/change-requests/[id]/price/route.ts');
const payment=read('app/api/vgroup/tech/installments/[id]/pay/route.ts');

const checks=[
  [techPortal.includes('portal_user_id=${session.userId}::uuid'),'Tech client portal is not scoped to portal user'],
  [techPortal.includes('isClient'),'Tech client role isolation branch missing'],
  [ownerPortal.includes('user_id=${session.userId}::uuid'),'Hospitality owner portal is not scoped to owner user'],
  [ownerPortal.includes('isOwner'),'Hospitality owner isolation branch missing'],
  [audit.includes('requireApiGroupSuperAdmin'),'Audit API is not API-native super-admin protected'],
  [archive.includes('requireApiGroupSuperAdmin'),'Archive API is not API-native super-admin protected'],
  [crApprove.includes('change_requests:approve'),'CR approval permission missing'],
  [crPrice.includes('change_requests:update'),'CR pricing permission missing'],
  [payment.includes('billing:update'),'Installment payment permission missing'],
];
for(const [ok,message] of checks){if(!ok)throw new Error(message)}
console.log(`portal-isolation: ${checks.length} client/owner/admin/sensitive-action contracts verified`);
