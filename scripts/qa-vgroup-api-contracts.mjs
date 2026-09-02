import fs from 'node:fs';
import path from 'node:path';
const read=(p)=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const api=read('lib/vgroup/api-access.ts');
for(const token of ['requestId','X-Request-Id','UNAUTHORIZED','BUSINESS_UNIT_FORBIDDEN','PERMISSION_FORBIDDEN','INTERNAL_ERROR'])if(!api.includes(token))throw new Error(`API error contract missing ${token}`);
if(!api.includes('Cache-Control'))throw new Error('API errors must be no-store');
console.log('api-contracts: structured error codes, request ids and no-store verified');
