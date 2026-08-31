import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),checks=[],check=(name,ok)=>checks.push({name,ok:Boolean(ok)});

const auto=read('app/api/auto-assign/route.ts');
check('Auto-assign derives workspace and user from session',auto.includes('workspaceId=String(session.user.workspaceId')&&auto.includes('userId=String(session.user.id'));
check('Auto-assign task lookup is workspace scoped',auto.includes('eq(creativeTasks.id,taskId),eq(creativeTasks.workspaceId,workspaceId)'));
check('Auto-assign enforces AM client ownership',auto.includes('eq(clients.accountManagerId,userId)'));
check('Auto-assign creators are same-workspace active approved creators',auto.includes('eq(users.workspaceId,workspaceId)')&&auto.includes('eq(users.approvalStatus,"APPROVED")'));
check('Auto-assign workload is workspace scoped',auto.includes('eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.assignedToId,c.id)'));
check('Auto-assign update and audit are atomic',auto.includes('db.transaction(async tx=>')&&auto.includes('action:"task_auto_assigned"'));

const signup=read('app/api/signup/route.ts');
check('Signup creation notification audit and OTP consumption are atomic',signup.includes('await db.transaction(async tx=>')&&signup.includes('tx.insert(users)')&&signup.includes('tx.insert(notifications)')&&signup.includes('tx.insert(auditLogs)')&&signup.includes('tx.delete(emailVerificationCodes)'));
check('Signup rechecks email inside transaction',signup.includes('tx.select({id:users.id})')&&signup.includes('if(already)return "DUPLICATE"'));

const clients=read('app/api/clients/route.ts');
check('Client create plus contact and audit are atomic',clients.includes('await db.transaction(async tx=>')&&clients.includes('tx.insert(clients)')&&clients.includes('tx.insert(contacts)')&&clients.includes('tx.insert(auditLogs)'));
check('Client create race duplicate is rechecked in transaction',clients.includes('raceDuplicate')&&clients.includes('CLIENT_EXISTS:'));
const identity=read('app/api/clients/[id]/logo/route.ts');
check('Client identity update contact and audit are atomic',identity.includes('await db.transaction(async tx=>')&&identity.includes('tx.update(contacts)')&&identity.includes('tx.insert(auditLogs)'));
check('Client identity audit is tenant scoped',identity.includes('workspaceId:a.workspaceId')&&identity.includes('client_profile_identity_updated'));

const recurring=read('app/api/recurring/route.ts');
check('Recurring invoice and notifications are atomic per client',recurring.includes('await db.transaction(async tx=>')&&recurring.includes('tx.insert(financeRecords)')&&recurring.includes('tx.insert(notifications)'));
check('Recurring generation serializes duplicate races',recurring.includes('pg_advisory_xact_lock')&&recurring.includes('lockKey'));
check('Recurring invoice generation writes audit trail',recurring.includes('action:"recurring_invoice_generated"'));

const task=read('lib/actions/create-task-role-safe.ts');
check('Task create notification and audit are atomic',task.includes('await db.transaction(async tx=>')&&task.includes('tx.insert(creativeTasks)')&&task.includes('tx.insert(notifications)')&&task.includes('tx.insert(auditLogs)'));
check('Task creator assignment requires same workspace and approval',task.includes('eq(users.workspaceId,workspaceId)')&&task.includes('eq(users.approvalStatus,"APPROVED")'));

const finance=read('app/dashboard/finance/page.tsx');
check('Manual invoice create and audit are atomic',/async function createInvoice[\s\S]*?db\.transaction\(async tx=>[\s\S]*?tx\.insert\(financeRecords\)[\s\S]*?tx\.insert\(auditLogs\)/.test(finance));
check('Manual invoice generation serializes duplicate races',/async function createInvoice[\s\S]*?pg_advisory_xact_lock/.test(finance));
check('Paid invoice transition remains atomic',/async function markPaid[\s\S]*?db\.transaction\(async tx=>/.test(finance));

const sales=read('app/dashboard/sales/page.tsx');
check('Sales lifecycle has explicit transition map',sales.includes('const TRANSITIONS:Record<string,string[]>')&&sales.includes('Invalid sales transition'));
check('Lead creation and audit are atomic',/async function createLead[\s\S]*?db\.transaction\(async tx=>[\s\S]*?tx\.insert\(salesLeads\)[\s\S]*?tx\.insert\(auditLogs\)/.test(sales));
check('Lead archive and audit are atomic',/async function archiveLead[\s\S]*?db\.transaction\(async tx=>[\s\S]*?tx\.(?:execute|update)[\s\S]*?tx\.insert\(auditLogs\)/.test(sales));

const creative=read('app/dashboard/creative/page.tsx');
check('Creative status transitions are explicit and role-specific',creative.includes('Invalid workflow transition')&&creative.includes('task.status==="REVIEW"'));
check('Creative status write notification and audit are atomic',/async function changeStatus[\s\S]*?db\.transaction\(async tx=>[\s\S]*?tx\.update\(creativeTasks\)[\s\S]*?tx\.insert\(auditLogs\)/.test(creative));
check('Creative status update uses compare-and-set concurrency guard',creative.includes('eq(creativeTasks.status,task.status)')&&creative.includes('changed concurrently'));
check('Creative archive and audit are atomic',/async function archiveTask[\s\S]*?db\.transaction\(async tx=>[\s\S]*?tx\.(?:execute|update)[\s\S]*?tx\.insert\(auditLogs\)/.test(creative));

const legacyActions=read('lib/actions/index.ts');
check('Legacy task action reserves COMPLETED for client approval',!legacyActions.includes('APPROVED:[\"COMPLETED\"]')&&!legacyActions.includes('completedAt:[\"APPROVED\",\"COMPLETED\"].includes(status)'));

const team=read('app/dashboard/team/page.tsx');
check('Leave approval state write and audit are atomic',/async function approveLeave[\s\S]*?db\.transaction\(async tx=>[\s\S]*?tx\.update\(leaveRequests\)[\s\S]*?tx\.insert\(auditLogs\)/.test(team));
check('Leave approval uses pending compare-and-set guard',/async function approveLeave[\s\S]*?eq\(leaveRequests\.status,"PENDING"\)[\s\S]*?returning/.test(team));
check('Account approval notification and audit are atomic',/async function reviewAccount[\s\S]*?db\.transaction\(async tx=>[\s\S]*?tx\.update\(users\)[\s\S]*?tx\.insert\(notifications\)[\s\S]*?tx\.insert\(auditLogs\)/.test(team));
check('Account approval uses pending compare-and-set guard',/async function reviewAccount[\s\S]*?eq\(users\.approvalStatus,"PENDING"\)[\s\S]*?returning/.test(team));

const vivito=read('app/api/assistant/actions/route.ts');
check('VIVITO requestId claims receipt before single-action execution',vivito.includes("vivito_action_started")&&vivito.includes('on conflict (id) do nothing returning id'));
check('VIVITO uncertain outcome blocks duplicate re-execution',vivito.includes('outcome is uncertain')&&vivito.includes('will not execute it twice'));
check('VIVITO success finalizes the claimed receipt',vivito.includes("action='vivito_action_executed'")&&vivito.includes("action='vivito_action_started' returning id"));

const failed=checks.filter(c=>!c.ok);for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'}  ${c.name}`);console.log(`\n${checks.length-failed.length}/${checks.length} critical business invariants passed.`);if(failed.length)process.exit(1);
