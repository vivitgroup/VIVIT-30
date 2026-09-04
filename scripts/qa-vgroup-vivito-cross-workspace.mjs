import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const registry=read("lib/vgroup/vivito-cross-workspace.ts");
const executor=read("lib/vgroup/vivito-execution.ts");
const tasks=read("app/api/vgroup/vivito/tasks/route.ts");
const decision=read("app/api/vgroup/vivito/tasks/[id]/decision/route.ts");
const marketingBridge=read("app/api/integrations/vgroup-vivito-marketing/route.ts");
const marketingIdentity=read("lib/group-handoff.ts");
const marketingIntegration=read("lib/vgroup/marketing-integration.ts");
const panel=read("components/vgroup/vivito-control-panel.tsx");
const migration=read("db/migrations/20260902_vivito_cross_workspace.sql");
const launcher=read("components/vgroup/vivito-launcher.tsx");
const hospitality=read("app/group/hospitality/layout.tsx");
const tech=read("app/group/tech/layout.tsx");
const marketing=read("app/group/marketing/page.tsx");
const groupLayout=read("app/group/command-center/layout.tsx");
const checks=[
 ["Four workspace registry",["group","marketing","hospitality","tech"].every(x=>registry.includes(`workspace:"${x}"`))],
 ["Marketing execution defaults fail closed",registry.includes('marketingEnabled=process.env.VGROUP_MARKETING_INTEGRATION_ENABLED==="true"')&&registry.includes('endpoint:marketingEnabled?"/api/integrations/vgroup-vivito-marketing":null')&&tasks.includes('INTEGRATION_REQUIRED')],
 ["Marketing adapter stays outside VGroup API namespace",fs.existsSync("app/api/integrations/vgroup-vivito-marketing/route.ts")&&!fs.existsSync("app/api/vgroup/vivito/marketing/route.ts")],
 ["Marketing source drift guard",marketingIntegration.includes('VGROUP_PINNED_MARKETING_SHA')&&marketingIntegration.includes('9817ec42750b17104c5292eb2ec4d02358b53290')&&marketingIntegration.includes('re-certification required')],
 ["Marketing bridge revalidates Group and Marketing identity",marketingBridge.includes('canAccessBusinessUnit(session,"marketing")')&&marketingBridge.includes('authorizeGroupHandoff')&&marketingIdentity.includes('approval_status!=="APPROVED"')&&marketingIdentity.includes('verifyWorkspace')],
 ["Marketing handoff is short-lived and single-use",marketingIntegration.includes('exp:now+45')&&marketingIdentity.includes('c.exp-c.iat>60')&&marketingIdentity.includes('handoff_replay_detected')],
 ["Marketing bridge task receipt is idempotent",marketingBridge.includes('vivito:vgroup:${taskId}')&&marketingBridge.includes('on conflict (id) do nothing')&&marketingBridge.includes('MARKETING_TASK_ALREADY_CLAIMED')],
 ["No arbitrary target URL",registry.includes('endpoint:string|null')&&executor.includes('new URL(cap.endpoint,request.url)')&&executor.includes('CROSS_ORIGIN_TARGET_BLOCKED')],
 ["Target routes remain permission authority",registry.includes('permission:"reservations:create"')&&registry.includes('permission:"projects:update"')&&tasks.includes('canUseVivitoCapability')],
 ["Idempotent mutations",migration.includes('unique(actor_user_id,workspace_code,idempotency_key)')&&tasks.includes('idempotentReplay:true')],
 ["Sensitive approval gate",registry.includes('approvalRequired:true')&&tasks.includes('waiting_approval')&&decision.includes('requireApiGroupSuperAdmin')],
 ["Approval UI exists",panel.includes('Approve')&&panel.includes('Reject')&&panel.includes('/decision')&&tasks.includes('canApprove')],
 ["Task event history UI exists",tasks.includes('vivito_task_events')&&panel.includes('View history')&&panel.includes('eventMap')],
 ["Task and event audit ledger",migration.includes('vgroup.vivito_tasks')&&migration.includes('vgroup.vivito_task_events')&&executor.includes('vivito_task_events')],
 ["Server-only RLS",migration.includes('enable row level security')&&migration.includes('to anon,authenticated using(false)')&&migration.includes('revoke all on vgroup.vivito_tasks')],
 ["Secret redaction",registry.includes('token_ref')&&registry.includes('[REDACTED]')&&executor.includes('redactVivito')],
 ["Dry run has no execution",tasks.includes('dryRun===true')&&tasks.indexOf('dryRun===true')<tasks.indexOf('insert into vgroup.vivito_tasks')],
 ["Bounded internal execution",executor.includes('AbortSignal.timeout(12000)')&&executor.includes('.slice(0,64_000)')&&executor.includes('redirect:"error"')],
 ["Vivito visible in Group",groupLayout.includes('VivitoLauncher workspace="group"')],
 ["Vivito visible in Marketing",marketing.includes('VivitoLauncher workspace="marketing"')],
 ["Vivito visible in Hospitality",hospitality.includes('VivitoLauncher workspace="hospitality"')],
 ["Vivito visible in Technology",tech.includes('VivitoLauncher workspace="tech"')],
 ["Launcher routes to governed console",launcher.includes('/group/vivito?workspace=${workspace}')],
];
const failed=checks.filter(([,ok])=>!ok);for(const [name,ok] of checks)console.log(`${ok?"PASS":"FAIL"} ${name}`);if(failed.length){console.error(`Vivito cross-workspace QA failed: ${failed.length}/${checks.length}`);process.exit(1)}console.log(`Vivito cross-workspace QA passed: ${checks.length}/${checks.length}`);
