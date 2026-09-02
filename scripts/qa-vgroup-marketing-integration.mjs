import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const contract=read('docs/vivit-group/MARKETING-INTEGRATION-CONTRACT.md');
const env=read('.env.vgroup.example');
const state=read('lib/vgroup/marketing-integration.ts');
const selector=read('app/group/page.tsx');
const entry=read('app/group/enter/[workspace]/page.tsx');
const gate=read('app/group/marketing/page.tsx');
const marketingTypes=read('lib/types.ts');
const marketingAuth=read('auth.config.ts');
const nextAuthTypes=read('types/next-auth.d.ts');
const pinned='b66542a3cfee8d5d54299450e8bc6a79b2a51062';
for(const phrase of [pinned,'single-use','fails closed','explicit production cutover approval']){
  if(!contract.toLowerCase().includes(phrase.toLowerCase()))throw new Error(`Marketing integration contract missing: ${phrase}`);
}
if(!env.includes('VGROUP_MARKETING_INTEGRATION_ENABLED="false"'))throw new Error('Marketing integration must default to disabled');
if(!env.includes(`VGROUP_MARKETING_CANDIDATE_SHA="${pinned}"`))throw new Error('Pinned Marketing SHA missing from env contract');
if(!state.includes(`VGROUP_PINNED_MARKETING_SHA="${pinned}"`))throw new Error('Runtime Marketing candidate pin missing');
if(!state.includes('if(enabled&&!certified)'))throw new Error('Marketing runtime does not fail closed on candidate drift');
if(!selector.includes('code:"marketing"'))throw new Error('Marketing selector card must remain visible');
if(!entry.includes('workspace==="marketing"')||!entry.includes('reason=unavailable'))throw new Error('Marketing entry must remain fail-closed before cutover');
if(!gate.includes('does not mutate Marketing data, storage, OAuth, hosting, or deployment'))throw new Error('Readiness gate lacks production-mutation boundary');
if(!marketingTypes.includes('HR = "HR"'))throw new Error('Inherited Marketing role contract is missing HR');
for(const phrase of ['token.roles','token.permissions','user_role_assignments','user_permission_grants']){
  if(!marketingAuth.includes(phrase))throw new Error(`Inherited Marketing auth compatibility missing: ${phrase}`);
}
for(const phrase of ['roles?: Role[]','permissions?: Permission[]']){
  if(!nextAuthTypes.includes(phrase))throw new Error(`Inherited Marketing session typing missing: ${phrase}`);
}
console.log('marketing-integration: visible selector, fail-closed entry, candidate pin, disabled default, auth/session compatibility, drift guard and no-production-mutation boundary verified');
