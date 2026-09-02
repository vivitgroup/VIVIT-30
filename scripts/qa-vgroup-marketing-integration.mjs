import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const contract=read('docs/vivit-group/MARKETING-INTEGRATION-CONTRACT.md');
const env=read('.env.vgroup.example');
const state=read('lib/vgroup/marketing-integration.ts');
const selector=read('app/group/page.tsx');
const gate=read('app/group/marketing/page.tsx');
const pinned='b66542a3cfee8d5d54299450e8bc6a79b2a51062';
for(const phrase of [pinned,'single-use','fails closed','explicit production cutover approval']){
  if(!contract.toLowerCase().includes(phrase.toLowerCase()))throw new Error(`Marketing integration contract missing: ${phrase}`);
}
if(!env.includes('VGROUP_MARKETING_INTEGRATION_ENABLED="false"'))throw new Error('Marketing integration must default to disabled');
if(!env.includes(`VGROUP_MARKETING_CANDIDATE_SHA="${pinned}"`))throw new Error('Pinned Marketing SHA missing from env contract');
if(!state.includes(`VGROUP_PINNED_MARKETING_SHA="${pinned}"`))throw new Error('Runtime Marketing candidate pin missing');
if(!state.includes('if(enabled&&!certified)'))throw new Error('Marketing runtime does not fail closed on candidate drift');
if(!selector.includes('disabled:true'))throw new Error('Marketing selector card must remain disabled before cutover');
if(!gate.includes('does not mutate Marketing data, storage, OAuth, hosting, or deployment'))throw new Error('Readiness gate lacks production-mutation boundary');
console.log('marketing-integration: pinned candidate, disabled default, drift guard and no-production-mutation boundary verified');
