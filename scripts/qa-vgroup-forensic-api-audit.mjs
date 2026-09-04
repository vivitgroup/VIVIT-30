import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const apiRoot=path.join(root,'app/api/vgroup');
const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,ent.name);if(ent.isDirectory())walk(full);else if(ent.name==='route.ts'||ent.name==='route.js')files.push(path.relative(root,full).replaceAll('\\','/'));}}
walk(apiRoot);

const browserFormExceptions=new Set([
  'app/api/vgroup/auth/login/route.ts',
  'app/api/vgroup/auth/logout/route.ts',
  'app/api/vgroup/auth/refresh/route.ts',
  'app/api/vgroup/workspace-entry/route.ts',
  'app/api/vgroup/access-requests/route.ts',
]);
const cron=/^app\/api\/vgroup\/cron\/[^/]+\/route\.(?:ts|js)$/;
const failures=[];
for(const file of files){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  const isException=browserFormExceptions.has(file)||cron.test(file);
  if(!isException && /from\s+["']@\/lib\/vgroup\/access["']/.test(text)) failures.push(`${file}: API route imports page redirect guard`);
  if(!isException && /\bredirect\s*\(/.test(text)) failures.push(`${file}: API route performs navigation redirect`);
  if(!isException && /require(?:BusinessPermission|BusinessUnitAccess|GroupSuperAdmin)\s*\(/.test(text) && !/requireApi(?:Permission|BusinessUnit|GroupSuperAdmin)|VGroupApiError/.test(text)) failures.push(`${file}: API route uses page authorization contract instead of API authorization contract`);
  const mutator=/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(text);
  if(mutator && !/(Cache-Control|no-store)/.test(text)) failures.push(`${file}: mutator missing explicit no-store contract`);
}
if(files.length<20) failures.push(`API route inventory unexpectedly small: ${files.length}`);
if(failures.length){console.error('VGROUP FORENSIC API AUDIT FAIL');for(const item of failures)console.error(`FAIL ${item}`);process.exit(1);}
console.log(`vgroup-forensic-api-audit: PASS — ${files.length} API routes verified for API/page auth separation and explicit no-store mutation boundaries`);
