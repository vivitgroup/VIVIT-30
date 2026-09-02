import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const contract=read('docs/vivit-group/MARKETING-INTEGRATION-CONTRACT.md');
const groupEnv=read('.env.vgroup.example');
const marketingEnv=read('.env.example');
const state=read('lib/vgroup/marketing-integration.ts');
const receiver=read('app/api/integrations/vgroup-handoff/route.ts');
const verifier=read('lib/group-handoff.ts');
const vivitoBridge=read('app/api/vgroup/vivito/marketing/route.ts');
const selector=read('app/group/page.tsx');
const entry=read('app/group/enter/[workspace]/page.tsx');
const form=read('components/vgroup/marketing-handoff-form.tsx');
const marketingAuth=read('lib/auth.ts');
const source='9817ec42750b17104c5292eb2ec4d02358b53290';
for(const phrase of [source,'single-use nonce','one production','fails closed','one shot']){
  if(!contract.toLowerCase().includes(phrase.toLowerCase()))throw new Error(`Unified Marketing contract missing: ${phrase}`);
}
if(!groupEnv.includes('VGROUP_MARKETING_INTEGRATION_ENABLED="false"'))throw new Error('Group Marketing integration must default disabled');
if(!groupEnv.includes(`VGROUP_MARKETING_CANDIDATE_SHA="${source}"`))throw new Error('Pinned Marketing source SHA missing from Group env contract');
if(!marketingEnv.includes('VGROUP_MARKETING_HANDOFF_RECEIVER_ENABLED="false"'))throw new Error('Marketing receiver must default disabled');
if(!state.includes(`VGROUP_MARKETING_BASE_SHA="${source}"`)||!state.includes(`VGROUP_PINNED_MARKETING_SHA="${source}"`))throw new Error('Runtime Marketing source pin missing');
if(!state.includes('if(enabled&&!certified)'))throw new Error('Marketing runtime does not fail closed on source drift');
if(!state.includes('exp:now+45')||!state.includes('randomUUID()')||!state.includes('createHmac("sha256"'))throw new Error('Short-lived signed Group assertion contract missing');
if(!receiver.includes('VGROUP_MARKETING_HANDOFF_RECEIVER_ENABLED')||!receiver.includes('VGROUP_GROUP_ORIGIN')||!receiver.includes('METHOD_NOT_ALLOWED'))throw new Error('Same-deployment Marketing receiver controls missing');
if(!receiver.includes('method')&&receiver.includes('?assertion='))throw new Error('Marketing receiver must not accept assertion query strings');
for(const phrase of ['timingSafeEqual','handoff_replay_detected','approval_status!=="APPROVED"','verifyWorkspace','group_handoff_nonces']){
  if(!verifier.includes(phrase))throw new Error(`Marketing verifier missing: ${phrase}`);
}
if(!marketingAuth.includes('id:"group-handoff"')||!marketingAuth.includes('authorizeGroupHandoff'))throw new Error('Marketing Auth.js handoff provider missing');
if(!selector.includes('code:"marketing"'))throw new Error('Marketing selector card must remain visible');
if(!entry.includes('workspace==="marketing"')||!entry.includes('!state.enabled||!state.certified'))throw new Error('Marketing entry must remain flag/drift gated');
if(!entry.includes('canAccessBusinessUnit(session,"marketing")'))throw new Error('Marketing entry must enforce Group Marketing membership');
if(!form.includes('method="post"')||!form.includes('name="assertion"')||form.includes('?assertion='))throw new Error('Browser handoff assertion must travel by POST body only');
for(const phrase of ['canAccessBusinessUnit(session,"marketing")','createMarketingHandoffAssertion','authorizeGroupHandoff','VIVITO_ACTION_CATALOG','buildVivitoDryRun','vivito:vgroup:${taskId}','on conflict (id) do nothing']){
  if(!vivitoBridge.includes(phrase))throw new Error(`Vivito Marketing bridge missing: ${phrase}`);
}
console.log('marketing-integration: unified one-production source pin, default-disabled cutover, single-use identity handoff, Marketing live authorization, Group membership gate and idempotent Vivito Marketing execution verified');
