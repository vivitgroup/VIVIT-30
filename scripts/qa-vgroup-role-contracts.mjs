import fs from 'node:fs';
import path from 'node:path';

const read=(p)=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const contracts=read('lib/vgroup/contracts.ts');
const access=read('lib/vgroup/api-access.ts');

const requiredRoles=['GROUP_SUPER_ADMIN','HOSPITALITY_ADMIN','PROPERTY_MANAGER','HOSPITALITY_FINANCE','OWNER','TECH_ADMIN','PROJECT_MANAGER','DESIGNER_DEVELOPER','TECH_FINANCE','TECH_CLIENT'];
for(const role of requiredRoles){if(!contracts.includes(`"${role}"`))throw new Error(`Missing role contract: ${role}`)}
for(const action of ['view','create','update','delete','approve','export']){if(!contracts.includes(`"${action}"`))throw new Error(`Missing permission action: ${action}`)}
if(!contracts.includes('membership.businessUnit !== businessUnit'))throw new Error('Business-unit isolation check missing');
if(!contracts.includes('membership.role === "GROUP_SUPER_ADMIN"'))throw new Error('Super-admin override contract missing');
if(!access.includes('requireApiPermission'))throw new Error('Server-side API permission guard missing');

const protectedRoutes=[
 'app/api/vgroup/hospitality/reservations/route.ts',
 'app/api/vgroup/hospitality/owners/route.ts',
 'app/api/vgroup/hospitality/properties/route.ts',
 'app/api/vgroup/tech/projects/route.ts',
 'app/api/vgroup/admin/employees/route.ts',
];
const acceptedGuards=['requireApiPermission','requireBusinessPermission','requireGroupSuperAdmin'];
for(const route of protectedRoutes){
  const body=read(route);
  const guarded=acceptedGuards.some(guard=>body.includes(guard));
  if(!guarded)throw new Error(`Route missing server permission guard: ${route}`);
}
console.log(`role-contracts: ${requiredRoles.length} roles, protected routes and BU isolation verified`);
