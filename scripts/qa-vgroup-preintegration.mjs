import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const acceptance=read('docs/vivit-group/PRE-INTEGRATION-CTO-ACCEPTANCE.md');
const isolation=read('docs/vivit-group/ISOLATION.md');
const runbook=read('docs/vivit-group/RELEASE-RUNBOOK.md');
for(const phrase of ['backup/restore drill','exact SHA','Marketing integration']){
  if(!acceptance.toLowerCase().includes(phrase.toLowerCase()))throw new Error(`Pre-integration acceptance missing: ${phrase}`);
}
if(!acceptance.includes('Vercel is excluded'))throw new Error('Vercel exclusion not recorded in CTO acceptance');
if(!isolation.includes('Do not deploy, promote, configure, inspect, or mutate any Vercel project'))throw new Error('Isolation contract does not prohibit Vercel actions');
if(!runbook.includes('Vercel is explicitly outside this delivery scope'))throw new Error('Release runbook still lacks hosting-scope decision');
console.log('pre-integration: CTO evidence contract and no-Vercel boundary verified');
