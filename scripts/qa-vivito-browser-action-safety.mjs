import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const endpoint=read('app/api/vgroup/vivito/action/route.ts');
const bridge=read('lib/vgroup/vivito-marketing-chat-action.ts');
const local=read('lib/vivito/browser-local-llm.ts');
const ui=read('components/vgroup/group-vivito-chat.tsx');

const checks=[
  ['browser action endpoint requires authenticated Group session',/getVGroupSession\(\)/.test(endpoint)&&/UNAUTHORIZED/.test(endpoint)],
  ['browser action endpoint enforces Marketing access',/canAccessBusinessUnit\(session,"marketing"\)/.test(endpoint)&&/MARKETING_ACCESS_FORBIDDEN/.test(endpoint)],
  ['browser proposal is revalidated server side',/validateBrowserMarketingProposal/.test(endpoint)&&/parseVivitoActionProposal\(raw,marketingUser\.role\)/.test(bridge)],
  ['live Marketing role comes from signed Group handoff',/createMarketingHandoffAssertion/.test(bridge)&&/authorizeGroupHandoff/.test(bridge)&&/resolveLiveMarketingRole/.test(bridge)],
  ['no hard-coded SUPER_ADMIN planner authority',!/(?:const|let)\s+role\s*=\s*["']SUPER_ADMIN["']/.test(bridge)],
  ['writes route through governed task queue',/\/api\/vgroup\/vivito\/tasks/.test(bridge)&&/marketing\.task_execute/.test(bridge)],
  ['idempotency key is derived before queueing',/createHash\("sha256"\)/.test(bridge)&&/idempotencyKey:key/.test(bridge)],
  ['browser local prompt forbids claiming writes',/Never claim that an ERP write was executed/.test(local)],
  ['browser local action planner says proposal only and no execution authority',/Do not claim execution/.test(local)&&/server will validate/.test(local)],
  ['UI submits browser proposal only to governed action endpoint',/\/api\/vgroup\/vivito\/action/.test(ui)],
  ['UI does not call Marketing executor directly',!/\/api\/integrations\/vgroup-vivito-marketing/.test(ui)],
  ['proposal size is bounded server side',/raw\.length<2\|\|raw\.length>12000/.test(endpoint)],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`${failed}/${checks.length} browser action safety checks failed.`);process.exit(1)}
console.log(`${checks.length}/${checks.length} browser action safety checks passed.`);
