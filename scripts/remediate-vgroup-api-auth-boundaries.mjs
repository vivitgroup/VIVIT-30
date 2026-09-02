import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const apiRoot=path.join(root,'app/api/vgroup');
const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,ent.name);if(ent.isDirectory())walk(full);else if(ent.name==='route.ts'||ent.name==='route.js')files.push(full);}}
walk(apiRoot);
let changed=0;
for(const file of files){
  let text=fs.readFileSync(file,'utf8');
  const before=text;
  const hasNextResponse=/\bNextResponse\b/.test(text);
  if(!hasNextResponse)continue;

  if(text.includes('from "@/lib/vgroup/access"')||text.includes("from '@/lib/vgroup/access'")){
    const business=/import\s*\{\s*requireBusinessPermission\s*\}\s*from\s*["']@\/lib\/vgroup\/access["'];?/.test(text);
    const superAdmin=/import\s*\{\s*requireGroupSuperAdmin\s*\}\s*from\s*["']@\/lib\/vgroup\/access["'];?/.test(text);
    if(business) text=text.replace(/import\s*\{\s*requireBusinessPermission\s*\}\s*from\s*["']@\/lib\/vgroup\/access["'];?/, 'import {apiPermissionOrResponse} from "@/lib/vgroup/api-access";');
    if(superAdmin) text=text.replace(/import\s*\{\s*requireGroupSuperAdmin\s*\}\s*from\s*["']@\/lib\/vgroup\/access["'];?/, 'import {apiGroupSuperAdminOrResponse} from "@/lib/vgroup/api-access";');
  }

  text=text.replace(/const\s+(session)\s*=\s*await\s+requireBusinessPermission\(([^;]+)\);/g, 'const $1=await apiPermissionOrResponse($2); if($1 instanceof NextResponse)return $1;');
  text=text.replace(/await\s+requireBusinessPermission\(([^;]+)\);/g, 'const auth=await apiPermissionOrResponse($1); if(auth instanceof NextResponse)return auth;');
  text=text.replace(/const\s+(session)\s*=\s*await\s+requireGroupSuperAdmin\(\);/g, 'const $1=await apiGroupSuperAdminOrResponse(); if($1 instanceof NextResponse)return $1;');
  text=text.replace(/await\s+requireGroupSuperAdmin\(\);/g, 'const auth=await apiGroupSuperAdminOrResponse(); if(auth instanceof NextResponse)return auth;');

  if(text!==before){fs.writeFileSync(file,text);changed++;console.log(`remediated ${path.relative(root,file)}`)}
}
console.log(`API auth boundary remediation changed ${changed} route files`);
