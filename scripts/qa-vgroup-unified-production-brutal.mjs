import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const source="9817ec42750b17104c5292eb2ec4d02358b53290";
const failures=[];
const pass=name=>console.log(`PASS ${name}`);
const check=(name,ok)=>{if(ok)pass(name);else{console.error(`FAIL ${name}`);failures.push(name)}};

const groupEnv=read(".env.vgroup.example");
const marketingEnv=read(".env.example");
const state=read("lib/vgroup/marketing-integration.ts");
const groupAuth=read("lib/vgroup/session.ts");
const marketingAuth=read("lib/auth.ts");
const receiver=read("app/api/integrations/vgroup-handoff/route.ts");
const verifier=read("lib/group-handoff.ts");
const bridge=read("app/api/vgroup/vivito/marketing/route.ts");
const vivitoRegistry=read("lib/vgroup/vivito-cross-workspace.ts");
const vivitoTasks=read("app/api/vgroup/vivito/tasks/route.ts");
const vivitoDecision=read("app/api/vgroup/vivito/tasks/[id]/decision/route.ts");
const vivitoPanel=read("components/vgroup/vivito-control-panel.tsx");
const nonceMigration=read("db/migrations/20260902_marketing_group_handoff_nonce.sql");
const workflow=read(".github/workflows/vgroup-cto-foundation.yml");

let sourceAncestor=false;
try{execFileSync("git",["merge-base","--is-ancestor",source,"HEAD"],{stdio:"ignore"});sourceAncestor=true}catch{}
check("Latest Marketing/Vivito source is an ancestor of unified HEAD",sourceAncestor);
check("Runtime source pin matches merged Marketing source",state.includes(`VGROUP_MARKETING_BASE_SHA="${source}"`)&&state.includes(`VGROUP_PINNED_MARKETING_SHA="${source}"`));
check("Integration flags default disabled",groupEnv.includes('VGROUP_MARKETING_INTEGRATION_ENABLED="false"')&&marketingEnv.includes('VGROUP_MARKETING_HANDOFF_RECEIVER_ENABLED="false"'));
check("No tracked sample enables Marketing cutover",!groupEnv.includes('VGROUP_MARKETING_INTEGRATION_ENABLED="true"')&&!marketingEnv.includes('VGROUP_MARKETING_HANDOFF_RECEIVER_ENABLED="true"'));
check("Group and Marketing credential namespaces stay distinct",groupEnv.includes("VGROUP_DATABASE_URL")&&groupEnv.includes("VGROUP_AUTH_SECRET")&&marketingEnv.includes("DATABASE_URL")&&marketingEnv.includes("AUTH_SECRET")&&!groupEnv.includes('DATABASE_URL="postgresql://postgres.YOUR_PROJECT_ID'));
check("Marketing password auth hardening survived merge",marketingAuth.includes("consumeAuthRateLimit")&&marketingAuth.includes("dummyPasswordHash")&&marketingAuth.includes('id:"group-handoff"'));
check("Group session implementation remains isolated",groupAuth.includes("VGROUP_")&&!groupAuth.includes("SUPABASE_SERVICE_KEY"));
check("Browser handoff is POST-only and exact-origin gated",receiver.includes("export async function POST")&&receiver.includes("export async function GET")&&receiver.includes("METHOD_NOT_ALLOWED")&&receiver.includes("VGROUP_GROUP_ORIGIN")&&!receiver.includes("?assertion="));
check("Handoff signature uses timing-safe HMAC verification",verifier.includes('createHmac("sha256"')&&verifier.includes("timingSafeEqual")&&verifier.includes("exp-c.iat>60"));
check("Marketing identity is revalidated live",verifier.includes('approval_status!=="APPROVED"')&&verifier.includes("verifyWorkspace")&&verifier.includes("isRole(user.role)"));
check("Handoff replay is single-use",verifier.includes("createHash(\"sha256\")")&&verifier.includes("handoff_replay_detected")&&nonceMigration.includes("nonce_hash text primary key"));
check("Nonce table denies direct client access",nonceMigration.includes("enable row level security")&&nonceMigration.includes("revoke all on table group_handoff_nonces from anon")&&nonceMigration.includes("revoke all on table group_handoff_nonces from authenticated"));
check("Vivito Marketing bridge requires Group Marketing membership",bridge.includes('canAccessBusinessUnit(session,"marketing")'));
check("Vivito Marketing bridge reuses signed identity boundary",bridge.includes("createMarketingHandoffAssertion")&&bridge.includes("authorizeGroupHandoff"));
check("Vivito Marketing action names are allowlisted",bridge.includes("VIVITO_ACTION_CATALOG")&&bridge.includes("isVivitoActionOp"));
check("Marketing role approval policy stays authoritative",bridge.includes("buildVivitoDryRun")&&bridge.includes('dry.approval.mode==="BLOCK"'));
check("Cross-database Marketing task execution is idempotent",bridge.includes('vivito:vgroup:${taskId}')&&bridge.includes("on conflict (id) do nothing")&&bridge.includes("MARKETING_TASK_ALREADY_CLAIMED"));
check("Vivito outer sensitive actions require Group Super Admin approval",vivitoRegistry.includes("approvalRequired:true")&&vivitoDecision.includes("requireApiGroupSuperAdmin")&&vivitoTasks.includes("waiting_approval"));
check("Vivito approval/history UI is present",vivitoPanel.includes("Approve")&&vivitoPanel.includes("Reject")&&vivitoPanel.includes("View history")&&vivitoPanel.includes("eventMap"));
check("Marketing execution endpoint is never user-controlled",vivitoRegistry.includes('endpoint:marketingEnabled?"/api/vgroup/vivito/marketing":null')&&!bridge.includes("new URL("));
check("Unified CTO workflow has no Vercel deployment action",!workflow.toLowerCase().includes("vercel deploy")&&!workflow.toLowerCase().includes("amondnet/vercel")&&!workflow.toLowerCase().includes("vercel-action"));
check("Exact build and built-runtime smoke remain mandatory",workflow.includes("npm run type-check")&&workflow.includes("npx next build")&&workflow.includes("qa-vgroup-runtime-smoke.mjs"));

const scanRoots=["app/group","app/api/vgroup","lib/vgroup","components/vgroup","lib/group-handoff.ts","app/api/integrations/vgroup-handoff","app/api/assistant","lib/vivito"];
function walk(target){const full=path.join(root,target);if(!fs.existsSync(full))return[];const stat=fs.statSync(full);if(stat.isFile())return[full];return fs.readdirSync(full,{withFileTypes:true}).flatMap(e=>walk(path.join(target,e.name)))}
const sourceFiles=scanRoots.flatMap(walk).filter(f=>/\.(ts|tsx|js|mjs)$/.test(f));
const conflicted=sourceFiles.filter(f=>{const s=fs.readFileSync(f,"utf8");return s.includes("<<<<<<<")||s.includes(">>>>>>>")});
check("No unresolved merge conflict markers in unified runtime",conflicted.length===0);
const tsNoCheck=sourceFiles.filter(f=>fs.readFileSync(f,"utf8").includes("@ts-nocheck"));
check("No TypeScript nocheck shields in unified critical runtime",tsNoCheck.length===0);

if(failures.length){console.error(`Unified production brutal audit FAILED: ${failures.length} control(s)`);process.exit(1)}
console.log(`Unified production brutal audit PASSED: 24/24 controls across ${sourceFiles.length} critical runtime files`);
