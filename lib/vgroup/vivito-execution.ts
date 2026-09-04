import {getVGroupSql} from "@/lib/vgroup/db";
import {findVivitoCapability,redactVivito} from "@/lib/vgroup/vivito-cross-workspace";

export async function executeVivitoTask(request:Request,task:{id:string;capability_key:string;payload_redacted:unknown}){
  const cap=findVivitoCapability(task.capability_key);
  if(!cap?.enabled||!cap.endpoint)throw new Error("CAPABILITY_NOT_EXECUTABLE");
  const payload=task.payload_redacted&&typeof task.payload_redacted==="object"&&!Array.isArray(task.payload_redacted)?task.payload_redacted as Record<string,unknown>:{};
  const outbound={...payload,...(cap.staticPayload??{})};
  const sql=getVGroupSql();
  await sql`update vgroup.vivito_tasks set status='running',started_at=now(),updated_at=now() where id=${task.id}::uuid and status in ('queued','waiting_approval')`;
  await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'started','{}'::jsonb)`;
  try{
    const target=new URL(cap.endpoint,request.url);
    if(target.origin!==new URL(request.url).origin)throw new Error("CROSS_ORIGIN_TARGET_BLOCKED");
    const response=await fetch(target,{method:cap.method,headers:{"Content-Type":"application/json","Cookie":request.headers.get("cookie")??"","X-Vivito-Task-Id":task.id},body:cap.method==="POST"?JSON.stringify(outbound):undefined,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
    const text=(await response.text()).slice(0,64_000);
    let parsed:unknown=text;try{parsed=JSON.parse(text)}catch{}
    const safe=redactVivito(parsed);
    if(!response.ok){
      await sql`update vgroup.vivito_tasks set status='failed',result_redacted=${sql.json(safe)},error_code=${`TARGET_HTTP_${response.status}`},completed_at=now(),updated_at=now() where id=${task.id}::uuid`;
      await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'failed',${sql.json({status:response.status})})`;
      return {ok:false,status:response.status,result:safe};
    }
    await sql`update vgroup.vivito_tasks set status='succeeded',result_redacted=${sql.json(safe)},completed_at=now(),updated_at=now() where id=${task.id}::uuid`;
    await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'succeeded','{}'::jsonb)`;
    return {ok:true,status:response.status,result:safe};
  }catch(error){
    const code=error instanceof Error?error.message:"EXECUTION_FAILED";
    await sql`update vgroup.vivito_tasks set status='failed',error_code=${code.slice(0,120)},completed_at=now(),updated_at=now() where id=${task.id}::uuid`;
    await sql`insert into vgroup.vivito_task_events(task_id,event_type,metadata_redacted) values(${task.id}::uuid,'failed',${sql.json({code:code.slice(0,120)})})`;
    throw error;
  }
}
