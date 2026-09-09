import {getVGroupSql} from "@/lib/vgroup/db";
import {findVivitoCapability,redactVivito} from "@/lib/vgroup/vivito-cross-workspace";
import {assertVivitoOutboundTarget,vivitoRetrySafety,vivitoSafetyDecision} from "@/lib/vgroup/vivito-safety";
import {verifyVivitoExecution} from "@/lib/vgroup/vivito-verification";

export async function executeVivitoTask(request:Request,task:{id:string;capability_key:string;payload_redacted:unknown}){
  const cap=findVivitoCapability(task.capability_key);
  if(!cap)throw new Error("CAPABILITY_NOT_FOUND");
  const safety=vivitoSafetyDecision(cap);
  if(!safety.allowed||!cap.endpoint)throw new Error("CAPABILITY_NOT_EXECUTABLE");
  const payload=task.payload_redacted&&typeof task.payload_redacted==="object"&&!Array.isArray(task.payload_redacted)?task.payload_redacted as Record<string,unknown>:{};
  const outbound={...payload,...(cap.staticPayload??{})};
  const sql=getVGroupSql();
  const [claimed]=await sql<{id:string}[]>`update vgroup.vivito_tasks set status='running',started_at=coalesce(started_at,now()),updated_at=now() where id=${task.id}::uuid and status='queued' returning id::text`;
  if(!claimed){
    await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'execution_claim_rejected',jsonb_build_object('reason','task_not_queued'))`;
    throw new Error("TASK_EXECUTION_NOT_CLAIMED");
  }
  await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'started',${sql.json({method:cap.method,endpoint:cap.endpoint})})`;
  try{
    const target=new URL(cap.endpoint,request.url);
    assertVivitoOutboundTarget(target,request.url);
    const hasBody=cap.method!=="GET";
    const response=await fetch(target,{method:cap.method,headers:{"Content-Type":"application/json","Cookie":request.headers.get("cookie")??"","X-Vivito-Task-Id":task.id,"Idempotency-Key":task.id},body:hasBody?JSON.stringify(outbound):undefined,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
    const text=(await response.text()).slice(0,64_000);
    let parsed:unknown=text;try{parsed=JSON.parse(text)}catch{}
    const safe=redactVivito(parsed);
    if(!response.ok){
      await sql`update vgroup.vivito_tasks set status='failed',result_redacted=${sql.json(safe)},error_code=${`TARGET_HTTP_${response.status}`},completed_at=now(),updated_at=now() where id=${task.id}::uuid and status='running'`;
      await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'failed',${sql.json({status:response.status,retrySafe:response.status>=500})})`;
      return {ok:false,status:response.status,result:safe};
    }
    const verification=await verifyVivitoExecution(cap.key,safe).catch(()=>({verified:false,code:"VERIFICATION_CHECK_FAILED"}));
    if(!verification.verified){
      await sql`update vgroup.vivito_tasks set status='failed',result_redacted=${sql.json(safe)},error_code=${verification.code},completed_at=now(),updated_at=now() where id=${task.id}::uuid and status='running'`;
      await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'verification_failed',${sql.json({...verification,retrySafe:false})})`;
      return {ok:false,status:502,result:safe,verification};
    }
    const [finished]=await sql<{id:string}[]>`update vgroup.vivito_tasks set status='succeeded',result_redacted=${sql.json(safe)},error_code=null,completed_at=now(),updated_at=now() where id=${task.id}::uuid and status='running' returning id::text`;
    if(!finished)throw new Error("TASK_STATE_CHANGED_DURING_EXECUTION");
    await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'succeeded',${sql.json({status:response.status,verification})})`;
    return {ok:true,status:response.status,result:safe,verification};
  }catch(error){
    const retry=vivitoRetrySafety(error);
    await sql`update vgroup.vivito_tasks set status='failed',error_code=${retry.errorCode.slice(0,120)},completed_at=now(),updated_at=now() where id=${task.id}::uuid and status='running'`;
    await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'failed',${sql.json({code:retry.errorCode.slice(0,120),retrySafe:retry.retrySafe})})`;
    throw error;
  }
}
