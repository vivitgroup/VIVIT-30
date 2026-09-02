import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const roots=['app/group','app/api/vgroup','lib/vgroup','components/vgroup'];
const exts=new Set(['.ts','.tsx','.js','.mjs']);
const files=[];
function walk(dir){
  const full=path.join(root,dir);
  if(!fs.existsSync(full)) return;
  for(const ent of fs.readdirSync(full,{withFileTypes:true})){
    const rel=path.join(dir,ent.name).replaceAll('\\','/');
    if(ent.isDirectory()) walk(rel);
    else if(exts.has(path.extname(ent.name))) files.push(rel);
  }
}
for(const dir of roots) walk(dir);
if(files.length<20) throw new Error(`Deep audit inventory unexpectedly small: ${files.length}`);

const failures=[];
const warnings=[];
const banned=[
  ['@ts-nocheck',/@ts-nocheck/],
  ['@ts-ignore',/@ts-ignore/],
  ['eslint-disable',/eslint-disable/],
  ['hard-coded bearer token',/Bearer\s+[A-Za-z0-9._-]{24,}/],
  ['hard-coded private key',/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/],
  ['dangerous eval',/\beval\s*\(/],
  ['Function constructor',/\bnew\s+Function\s*\(/],
];
for(const file of files){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  for(const [label,re] of banned) if(re.test(text)) failures.push(`${file}: ${label}`);
  if(/\bconsole\.(log|debug)\s*\(/.test(text)) warnings.push(`${file}: console logging`);
  if(/\b(?:as\s+any|:\s*any\b|<any>)/.test(text)) warnings.push(`${file}: explicit any`);
  if(/process\.env\.[A-Z0-9_]+/.test(text) && !file.startsWith('lib/vgroup/')) warnings.push(`${file}: direct env access outside lib/vgroup`);
  if(file.startsWith('app/api/vgroup/') && /route\.(ts|js)$/.test(file)){
    const exportedMutator=/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(text);
    if(exportedMutator && !/require(?:BusinessPermission|GroupSuperAdmin|BusinessUnitAccess|VGroupSession)\s*\(/.test(text)) failures.push(`${file}: mutating API route missing explicit access guard`);
    if(exportedMutator && !/(Cache-Control|no-store)/.test(text)) warnings.push(`${file}: mutating API route missing explicit no-store marker`);
  }
}

const sqlFiles=[];
function walkSql(dir){
  const full=path.join(root,dir); if(!fs.existsSync(full)) return;
  for(const ent of fs.readdirSync(full,{withFileTypes:true})){
    const rel=path.join(dir,ent.name).replaceAll('\\','/');
    if(ent.isDirectory()) walkSql(rel); else if(ent.name.endsWith('.sql')) sqlFiles.push(rel);
  }
}
walkSql('db/migrations');
for(const file of sqlFiles.filter(f=>/vgroup|hospitality|tech|20260902/.test(f))){
  const text=fs.readFileSync(path.join(root,file),'utf8').toLowerCase();
  if(/security definer/.test(text) && !/set search_path/.test(text)) failures.push(`${file}: SECURITY DEFINER without fixed search_path marker`);
}

if(failures.length){
  console.error('VGROUP DEEP CODE AUDIT FAIL');
  for(const f of failures) console.error(`FAIL ${f}`);
  if(warnings.length) for(const w of warnings.slice(0,120)) console.error(`WARN ${w}`);
  process.exit(1);
}
console.log(`vgroup-deep-code-audit: PASS — ${files.length} runtime/source files scanned, ${sqlFiles.length} migrations inventoried, ${warnings.length} review warnings`);
for(const w of warnings.slice(0,120)) console.log(`WARN ${w}`);
