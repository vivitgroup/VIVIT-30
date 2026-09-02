import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const mustExist=[
  'docs/vivit-group/ISOLATION.md',
  'docs/vivit-group/ARCHITECTURE.md',
  'docs/vivit-group/RELEASE-RUNBOOK.md',
  '.env.vgroup.example',
  'lib/vgroup/env.ts',
  'scripts/qa-vgroup-isolation.mjs',
  'scripts/qa-vgroup-role-contracts.mjs',
  'scripts/qa-vgroup-portal-isolation.mjs',
];
for(const file of mustExist){if(!fs.existsSync(path.join(root,file)))throw new Error(`Missing release prerequisite: ${file}`)}
const env=read('lib/vgroup/env.ts');
for(const key of ['VGROUP_DATABASE_URL','VGROUP_SUPABASE_URL','VGROUP_SUPABASE_SERVICE_KEY','VGROUP_AUTH_SECRET']){
  if(!env.includes(key))throw new Error(`Missing isolated env guard for ${key}`);
}
if(!env.includes('Vivit Group isolation violation'))throw new Error('Shared credential rejection guard missing');
const runbook=read('docs/vivit-group/RELEASE-RUNBOOK.md');
for(const phrase of ['Exact-head CTO Foundation','Rollback triggers','Final integration rule']){
  if(!runbook.includes(phrase))throw new Error(`Release runbook incomplete: ${phrase}`);
}
const isolation=read('docs/vivit-group/ISOLATION.md');
if(!/Marketing/i.test(isolation)||!/production/i.test(isolation))throw new Error('Isolation documentation no longer asserts Marketing production boundary');
console.log('release-readiness: docs, runtime isolation guards and rollback prerequisites verified');
