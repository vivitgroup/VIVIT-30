import {getVGroupSql} from "@/lib/vgroup/db";
import {findVivitoCapability,redactVivito} from "@/lib/vgroup/vivito-cross-workspace";

function toVivitoFormData(input:Record<string,unknown>){
  const form=new FormData();
  for(const [key,value] of Object.entries(input)){
    if(value===null||value===undefined)continue;
    if(typeof value==="object")form.append(key,JSON.stringify(value));
    else form.append(key,String(value));
  }
  return form;
}

function executionErrorCode(error:unknown){
  if(error instanceof DOMException&&error.name==="TimeoutError")return "EXECUTION_OUTCOME_UNKNOWN_TIMEOUT";
  if(error instanceof Error&&/timeout|timed out/i.test(error.message))return "EXECUTION_OUTCOME_UNKNOWN_TIMEOUT";
  return error instanceof Error?error.message:"EXECUTION_FAILED";
}

export async function executeVivitoTask(request:Request,task:{id:string;capability_key:string;payload_redacted:unknown}){
  const cap=findVivitoCapability(task.capability_key);
  if(!cap?.enabled||!cap.endpoint)throw new Error("CAPABILITY_NOT_EXECUTABLE");
  const payload=task.payload_redacted&&typeof task.payload_redacted==="object"&&!Array.isArray(task.payload_redacted)?task.payload_redacted as Record<string,unknown>:{};
  const outbound={...payload,...(cap.staticPayload??{})};
  const sql=getVGroupSql();

  // Single-consumer claim. Approval routes must first transition waiting_approval -> queued.
  // Only one caller can then transition queued -> running and perform the side effect.
  const [claimed]=await sql<{id:string}[]>`update vgroup.vivito_tasks set status='running',started_at=coalesce(started_at,now()),updated_at=now() where id=${task.id}::uuid and status='queued' returning id::text`;
  if(!claimed){
    const [current]=await sql<{status:string}[]>`select status from vgroup.vivito_tasks where id=${task.id}::uuid limit 1`;
    const error=new Error(current?`TASK_NOT_EXECUTABLE_FROM_${current.status.toUpperCase()}`:"TASK_NOT_FOUND");
    await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) select ${task.id}::uuid,'execution_claim_rejected',jsonb_build_object('status',${current?.status??"missing"}::text) where exists(select 1 from vgroup.vivito_tasks where id=${task.id}::uuid)`;
    throw error;
  }
  await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'started',jsonb_build_object('claim','atomic'))`;
  try{
    const target=new URL(cap.endpoint,request.url);
    if(target.origin!==new URL(request.url).origin)throw new Error("CROSS_ORIGIN_TARGET_BLOCKED");
    const headers=new Headers({"Cookie":request.headers.get("cookie")??"","X-Vivito-Task-Id":task.id,"Idempotency-Key":task.id});
    let body:BodyInit|undefined;
    if(cap.method==="POST"){
      if(cap.transport==="form")body=toVivitoFormData(outbound);
      else{headers.set("Content-Type","application/json");body=JSON.stringify(outbound)}
    }
    const response=await fetch(target,{method:cap.method,headers,body,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
    const text=(await response.text()).slice(0,64_000);
    let parsed:unknown=text;try{parsed=JSON.parse(text)}catch{}
    const safe=redactVivito(parsed);
    if(!response.ok){
      await sql`update vgroup.vivito_tasks set status='failed',result_redacted=${sql.json(safe)},error_code=${`TARGET_HTTP_${response.status}`},completed_at=now(),updated_at=now() where id=${task.id}::uuid and status='running'`;
      await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'failed',${sql.json({status:response.status,retrySafe:true})})`;
      return {ok:false,status:response.status,result:safe};
    }
    await sql`update vgroup.vivito_tasks set status='succeeded',result_redacted=${sql.json(safe)},completed_at=now(),updated_at=now() where id=${task.id}::uuid and status='running'`;
    await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'succeeded','{}'::jsonb)`;
    return {ok:true,status:response.status,result:safe};
  }catch(error){
    const code=executionErrorCode(error),outcomeUnknown=code.startsWith("EXECUTION_OUTCOME_UNKNOWN");
    await sql`update vgroup.vivito_tasks set status='failed',error_code=${code.slice(0,120)},completed_at=now(),updated_at=now() where id=${task.id}::uuid and status='running'`;
    await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,${outcomeUnknown?"outcome_unknown":"failed"},${sql.json({code:code.slice(0,120),retrySafe:!outcomeUnknown})})`;
    throw error;
  }
}
