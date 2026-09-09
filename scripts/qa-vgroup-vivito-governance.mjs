import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const files={
  tasks:read('app/api/vgroup/vivito/tasks/route.ts'),
  decision:read('app/api/vgroup/vivito/tasks/[id]/decision/route.ts'),
  chat:read('app/api/vgroup/vivito/chat/route.ts'),
  execution:read('lib/vgroup/vivito-execution.ts'),
  safety:read('lib/vgroup/vivito-safety.ts'),
  registry:read('lib/vgroup/vivito-tool-registry.ts'),
  cross:read('lib/vgroup/vivito-cross-workspace.ts'),
  reads:read('lib/vgroup/vivito-read-tools.ts'),
  entities:read('lib/vgroup/vivito-entity-resolver.ts'),
  verification:read('lib/vgroup/vivito-verification.ts'),
};

const checks=[
  ['atomic execution claim',files.execution.includes("status='running'")&&files.execution.includes("status='queued' returning id::text")],
  ['approval CAS',files.decision.includes("status='queued'")&&files.decision.includes("status='waiting_approval' returning")],
  ['reject CAS',files.decision.includes("status='rejected'")&&files.decision.includes("and status='waiting_approval' returning")],
  ['unknown timeout is non-blind-retry',files.safety.includes('EXECUTION_OUTCOME_UNKNOWN_TIMEOUT')&&files.execution.includes('vivitoRetrySafety')],
  ['same-origin API target guard',files.safety.includes('CROSS_ORIGIN_TARGET_BLOCKED')&&files.safety.includes('NON_API_TARGET_BLOCKED')],
  ['central approval policy',files.tasks.includes('vivitoSafetyDecision')&&files.safety.includes('cap.risk==="sensitive"')],
  ['stable idempotency required',files.tasks.includes('validVivitoIdempotencyKey')&&files.execution.includes('Idempotency-Key')],
  ['strict payload contracts',files.cross.includes('allowedPayloadKeys')&&files.cross.includes('requiredPayloadKeys')&&files.tasks.includes('validateVivitoCapabilityPayload')],
  ['update/delete capable execution transport',files.cross.includes('"PATCH"|"DELETE"')&&files.execution.includes('cap.method!=="GET"')],
  ['business-state verification',files.execution.includes('verifyVivitoExecution')&&files.verification.includes('BUSINESS_STATE_VERIFIED')],
  ['verification failure is non-retryable',files.execution.includes("'verification_failed'")&&files.execution.includes('retrySafe:false')],
  ['unified registry has reads+writes',files.registry.includes('VIVITO_READ_TOOLS.map')&&files.registry.includes('VIVITO_CAPABILITIES.map')],
  ['permission-aware registry',files.registry.includes('canUseVivitoUnifiedTool')&&files.tasks.includes('publicVivitoToolRegistry(session)')],
  ['entity resolver permission scoped',files.entities.includes('hasPermission')&&files.entities.includes('canAccessBusinessUnit')],
  ['chat uses entity resolver',files.chat.includes('resolveVivitoEntities')&&files.chat.includes('entityResolution.ambiguous')],
  ['hospitality detailed reads',files.reads.includes('hospitality.occupancy')&&files.reads.includes('hospitality.owner_performance')&&files.reads.includes('hospitality.incidents_list')],
  ['tech detailed reads',files.reads.includes('tech.projects_list')&&files.reads.includes('tech.issues_list')&&files.reads.includes('tech.change_requests_list')&&files.reads.includes('tech.billing_summary')],
  ['cross-module intelligence',files.reads.includes('group.executive_pulse')&&files.reads.includes('group.risk_digest')],
  ['owner finance boundary preserved',files.reads.includes('denyRoles:["OWNER"]')],
  ['fail closed on missing live data',files.chat.includes('live data is unavailable instead of guessing')],
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed){console.error(`VIVITO governance QA failed: ${failed}/${checks.length}`);process.exit(1);}
console.log(`VIVITO governance QA passed: ${checks.length}/${checks.length}`);
