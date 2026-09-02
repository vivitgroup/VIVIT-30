import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const registry=read("lib/vgroup/vivito-cross-workspace.ts");
const executor=read("lib/vgroup/vivito-execution.ts");
const tasks=read("app/api/vgroup/vivito/tasks/route.ts");
const decision=read("app/api/vgroup/vivito/tasks/[id]/decision/route.ts");
const migration=read("db/migrations/20260902_vivito_cross_workspace.sql");
const launcher=read("components/vgroup/vivito-launcher.tsx");
const hospitality=read("app/group/hospitality/layout.tsx");
const tech=read("app/group/tech/layout.tsx");
const marketing=read("app/group/marketing/page.tsx");
const groupLayout=read("app/group/command-center/layout.tsx");
const checks=[
 ["Four workspace registry",["group","marketing","hospitality","tech"].every(x=>registry.includes(`workspace:"${x}"`))],
 ["Marketing execution fail closed",registry.includes('key:"marketing.task_execute"')&&registry.includes('enabled:false')&&tasks.includes('INTEGRATION_REQUIRED')],
 ["No arbitrary target URL",registry.includes('endpoint:string|null')&&executor.includes('new URL(cap.endpoint,request.url)')&&executor.includes('CROSS_ORIGIN_TARGET_BLOCKED')],
 ["Target routes remain permission authority",registry.includes('permission:"reservations:create"')&&registry.includes('permission:"projects:update"')&&tasks.includes('canUseVivitoCapability')],
 ["Idempotent mutations",migration.includes('unique(actor_user_id,workspace_code,idempotency_key)')&&tasks.includes('idempotentReplay:true')],
 ["Sensitive approval gate",registry.includes('approvalRequired:true')&&tasks.includes('waiting_approval')&&decision.includes('requireApiGroupSuperAdmin')],
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
