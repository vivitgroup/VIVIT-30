import fs from 'node:fs';
import path from 'node:path';

const roots=['lib/vgroup','app/group','app/api/vgroup'];
const files=[];
for(const root of roots){
  if(!fs.existsSync(root)) continue;
  const walk=(dir)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.(ts|tsx|js|mjs)$/.test(entry.name))files.push(p)}};
  walk(root);
}

const failures=[];
const forbidden=[
  {re:/from\s+["']@\/lib\/db["']/,msg:'VGroup code imports Marketing db runtime'},
  {re:/process\.env\.DATABASE_URL/,msg:'VGroup code references Marketing DATABASE_URL directly'},
  {re:/process\.env\.SUPABASE_URL/,msg:'VGroup code references Marketing SUPABASE_URL directly'},
  {re:/process\.env\.SUPABASE_SERVICE_KEY/,msg:'VGroup code references Marketing SUPABASE_SERVICE_KEY directly'},
];

for(const file of files){
  const body=fs.readFileSync(file,'utf8');
  for(const rule of forbidden){if(rule.re.test(body)&&file!=='lib/vgroup/env.ts'&&file!=='lib/vgroup/db.ts')failures.push(`${file}: ${rule.msg}`)}
}

const db=fs.readFileSync('lib/vgroup/db.ts','utf8');
if(!db.includes('VGROUP_DATABASE_URL')) failures.push('lib/vgroup/db.ts must require VGROUP_DATABASE_URL');
if(!db.includes('must not equal DATABASE_URL')) failures.push('DB equality isolation guard missing');
const env=fs.readFileSync('lib/vgroup/env.ts','utf8');
for(const key of ['VGROUP_DATABASE_URL','VGROUP_SUPABASE_URL','VGROUP_SUPABASE_SERVICE_KEY','VGROUP_AUTH_SECRET']) if(!env.includes(key)) failures.push(`Missing isolated env guard for ${key}`);
const architecture=fs.readFileSync('docs/vivit-group/ARCHITECTURE.md','utf8');
if(!architecture.includes('No merge/promotion to current Marketing production until Stage 18')) failures.push('Final-integration production guard missing');

if(failures.length){console.error('VGROUP ISOLATION QA: FAIL');for(const failure of failures)console.error(`- ${failure}`);process.exit(1)}
console.log(`VGROUP ISOLATION QA: PASS (${files.length} runtime files checked)`);
