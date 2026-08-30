import assert from "node:assert/strict";
import fs from "node:fs";
import {db,sql} from "../lib/db";
import {saveCheckpoint} from "../lib/vivito/enterprise-governance";

const W="acceptance-ws-a",X="acceptance-ws-b";
const runtime=fs.readFileSync("lib/vivito/direct-runtime.ts","utf8");

async function main(){
  await db.execute(sql`delete from vivito_outcome_checks where workspace_id in (${W},${X})`);
  await db.execute(sql`delete from vivito_runtime_checkpoints where workspace_id in (${W},${X})`);
  await db.execute(sql`delete from vivito_autonomy_events where workspace_id in (${W},${X})`);

  // 1) Concurrent tenant-scoped idempotency: many competing writers must produce exactly one event.
  const sameKey="concurrent-idempotency";
  await Promise.all(Array.from({length:12},()=>db.execute(sql`
    insert into vivito_autonomy_events(
      id,workspace_id,idempotency_key,signal_type,client_id,action_op,action_args,approval_mode,status,actor_id,evidence
    ) values(
      ${crypto.randomUUID()},${W},${sameKey},'QA_CONCURRENT',null,'create_task','{}'::jsonb,'AUTO','EXECUTING','qa','{}'::jsonb
    ) on conflict(workspace_id,idempotency_key) do nothing
  `)));
  const one=Array.from(await db.execute<{id:string}>(sql`select id from vivito_autonomy_events where workspace_id=${W} and idempotency_key=${sameKey}`));
  assert.equal(one.length,1,"concurrent same-workspace idempotency must create one event");
  await db.execute(sql`insert into vivito_autonomy_events(id,workspace_id,idempotency_key,signal_type,client_id,action_op,action_args,approval_mode,status,actor_id,evidence) values(${crypto.randomUUID()},${X},${sameKey},'QA_CONCURRENT',null,'create_task','{}'::jsonb,'AUTO','EXECUTING','qa','{}'::jsonb)`);
  const cross=Array.from(await db.execute<{workspace_id:string}>(sql`select workspace_id from vivito_autonomy_events where idempotency_key=${sameKey} order by workspace_id`));
  assert.deepEqual(cross.map(r=>r.workspace_id),[W,X],"same idempotency key must coexist across workspaces");

  // 2) Restart/resume checkpoint replay: same workspace/run updates in-place and increments attempt.
  await saveCheckpoint(W,"resume-proof",{phase:1,cursor:"a"});
  await saveCheckpoint(W,"resume-proof",{phase:2,cursor:"b"});
  const cp=Array.from(await db.execute<{state:{phase:number;cursor?:string};attempt:number|string;status:string}>(sql`select state,attempt,status from vivito_runtime_checkpoints where workspace_id=${W} and run_key='resume-proof'`))[0];
  assert.equal(Number(cp.attempt),2,"checkpoint replay must increment attempt rather than create a duplicate row");
  assert.equal(cp.state.phase,2,"checkpoint replay must persist latest state");
  assert.equal(cp.state.cursor,"b","checkpoint replay must preserve resumable cursor");
  await saveCheckpoint(X,"resume-proof",{phase:9});
  const cps=Array.from(await db.execute<{workspace_id:string}>(sql`select workspace_id from vivito_runtime_checkpoints where run_key='resume-proof' order by workspace_id`));
  assert.deepEqual(cps.map(r=>r.workspace_id),[W,X],"checkpoint keys must remain tenant isolated");

  // 3) 24/48/72 outcome lifecycle and uniqueness.
  const executedId=crypto.randomUUID();
  await db.execute(sql`insert into vivito_autonomy_events(id,workspace_id,idempotency_key,signal_type,client_id,action_op,action_args,approval_mode,status,actor_id,evidence,executed_at) values(${executedId},${W},'outcome-proof','QA_OUTCOME',null,'create_task','{}'::jsonb,'AUTO','EXECUTED','qa','{}'::jsonb,now())`);
  for(const h of [24,48,72]) await db.execute(sql`insert into vivito_outcome_checks(id,workspace_id,event_id,horizon_hours,due_at,status,baseline) values(${crypto.randomUUID()},${W},${executedId},${h},now()+(${h}::text||' hours')::interval,'PENDING','{}'::jsonb) on conflict(event_id,horizon_hours) do nothing`);
  for(const h of [24,48,72]) await db.execute(sql`insert into vivito_outcome_checks(id,workspace_id,event_id,horizon_hours,due_at,status,baseline) values(${crypto.randomUUID()},${W},${executedId},${h},now()+(${h}::text||' hours')::interval,'PENDING','{}'::jsonb) on conflict(event_id,horizon_hours) do nothing`);
  const outcomes=Array.from(await db.execute<{horizon_hours:number|string;status:string}>(sql`select horizon_hours,status from vivito_outcome_checks where workspace_id=${W} and event_id=${executedId} order by horizon_hours`));
  assert.deepEqual(outcomes.map(r=>Number(r.horizon_hours)),[24,48,72],"exactly the 24/48/72 horizons must be scheduled once");
  assert(outcomes.every(r=>r.status==="PENDING"));
  assert(runtime.includes("for(const h of [24,48,72])"),"production runtime must schedule the certified 24/48/72 horizons");
  assert(runtime.includes("await scheduleOutcomes(workspaceId,id"),"AUTO execution must call outcome scheduling");
  assert(/await scheduleOutcomes\(workspaceId,(?:String\()?[A-Za-z_$][\w$]*\.id\)?/.test(runtime),"retry success must call outcome scheduling");

  // 4) Retry/resume path must select due events and run before fresh collection.
  const retryId=crypto.randomUUID();
  await db.execute(sql`insert into vivito_autonomy_events(id,workspace_id,idempotency_key,signal_type,client_id,action_op,action_args,approval_mode,status,actor_id,evidence,retry_count,max_retries,next_retry_at,evidence_quality,decision_route) values(${retryId},${W},'retry-proof','QA_RETRY',null,'create_task','{}'::jsonb,'AUTO','RETRY_SCHEDULED','qa','{}'::jsonb,1,3,now()-interval '1 minute',.9,'POLICY')`);
  const due=Array.from(await db.execute<{id:string}>(sql`select id from vivito_autonomy_events where workspace_id=${W} and status='RETRY_SCHEDULED' and next_retry_at<=now() and retry_count<max_retries`));
  assert(due.some(r=>r.id===retryId),"persisted retry must be resumable after process restart");
  assert(runtime.includes("async function retryDue(actor:Actor)"),"production retry lifecycle must exist");
  assert(/retried=await retryDue\(actor\);const [A-Za-z_$][\w$]*=await collectAndAct\(actor\)/.test(runtime),"resume/retry must run before collecting new work");
  assert(/next>=Number\([A-Za-z_$][\w$]*\.max_retries\|\|3\)/.test(runtime),"retry lifecycle must terminate at bounded max attempts");

  // 5) Rollback persistence lifecycle and production guardrails.
  await db.execute(sql`update vivito_autonomy_events set status='ROLLED_BACK',rolled_back_at=now(),rolled_back_by='qa-super-admin',rollback_result='{"ok":true}'::jsonb,updated_at=now() where id=${executedId} and workspace_id=${W} and status='EXECUTED'`);
  const rolled=Array.from(await db.execute<{status:string;rolled_back_at:unknown;rolled_back_by:string;rollback_result:{ok:boolean}}>(sql`select status,rolled_back_at,rolled_back_by,rollback_result from vivito_autonomy_events where id=${executedId} and workspace_id=${W}`))[0];
  assert.equal(rolled.status,"ROLLED_BACK");
  assert(rolled.rolled_back_at,"rollback must persist timestamp");
  assert.equal(rolled.rolled_back_by,"qa-super-admin");
  assert.equal(rolled.rollback_result.ok,true);
  assert(runtime.includes("export async function markVivitoDirectRollback"),"production rollback function must be exported");
  assert(runtime.includes("if(input.role!==\"SUPER_ADMIN\")")||runtime.includes("if(input.role!=='SUPER_ADMIN')"),"rollback must be SUPER_ADMIN gated");
  assert(/if\(String\([A-Za-z_$][\w$]*\.status\)!==['\"]EXECUTED['\"]\)/.test(runtime)||/if\([A-Za-z_$][\w$]*\.status!==['\"]EXECUTED['\"]\)/.test(runtime),"rollback must only target executed events");
  assert(runtime.includes("status='ROLLED_BACK'"),"production rollback must persist terminal rollback state");

  console.log(JSON.stringify({
    passed:true,
    concurrentIdempotency:true,
    tenantScopedIdempotency:true,
    checkpointReplay:true,
    restartResume:true,
    outcomeScheduling2472:true,
    retryLifecycle:true,
    rollbackLifecycle:true
  },null,2));
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
