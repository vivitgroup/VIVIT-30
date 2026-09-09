import {NextResponse} from "next/server";
import {requireVGroupSession} from "@/lib/vgroup/session";
import {getVGroupSql} from "@/lib/vgroup/db";
import {canUseVivitoCapability,findVivitoCapability,redactVivito} from "@/lib/vgroup/vivito-cross-workspace";
import {executeVivitoTask} from "@/lib/vgroup/vivito-execution";
import {publicVivitoToolRegistry} from "@/lib/vgroup/vivito-tool-registry";
import {validVivitoIdempotencyKey,validateVivitoCapabilityPayload,vivitoSafetyDecision} from "@/lib/vgroup/vivito-safety";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};

export async function GET(){
  const session=await requireVGroupSession();
  const sql=getVGroupSql();
  const canApprove=session.memberships.some(m=>m.role==="GROUP_SUPER_ADMIN");
  const tasks=canApprove
    ?await sql`select id::text,actor_user_id::text,workspace_code,capability_key,status,risk_level,idempotency_key,error_code,approved_at,started_at,completed_at,created_at from vgroup.vivito_tasks order by created_at desc limit 100`
    :await sql`select id::text,actor_user_id::text,workspace_code,capability_key,status,risk_level,idempotency_key,error_code,approved_at,started_at,completed_at,created_at from vgroup.vivito_tasks where actor_user_id=${session.userId}::uuid order by created_at desc limit 100`;
  const events=canApprove
    ?await sql`select e.id::text,e.task_id::text,e.actor_user_id::text,e.event_type,e.metadata_redacted,e.created_at from vgroup.vivito_task_events e join (select id from vgroup.vivito_tasks order by created_at desc limit 100) t on t.id=e.task_id order by e.created_at desc limit 500`
    :await sql`select e.id::text,e.task_id::text,e.actor_user_id::text,e.event_type,e.metadata_redacted,e.created_at from vgroup.vivito_task_events e join vgroup.vivito_tasks t on t.id=e.task_id where t.actor_user_id=${session.userId}::uuid order by e.created_at desc limit 500`;
  return NextResponse.json({canApprove,tools:publicVivitoToolRegistry(session),tasks:Array.from(tasks),events:Array.from(events)},{headers:NO_STORE});
}

export async function POST(request:Request){
  const session=await requireVGroupSession();
  const body=await request.json().catch(()=>null) as {capabilityKey?:string;idempotencyKey?:string;payload?:unknown;dryRun?:boolean}|null;
  const cap=findVivitoCapability(String(body?.capabilityKey??""));
  const idempotencyKey=String(body?.idempotencyKey??"");
  if(!cap)return NextResponse.json({error:{code:"CAPABILITY_NOT_FOUND",message:"Vivito capability is not registered"}},{status:404,headers:NO_STORE});
  const safety=vivitoSafetyDecision(cap);
  if(!safety.allowed)return NextResponse.json({error:{code:"INTEGRATION_REQUIRED",message:"This capability is fail-closed until its controlled integration is enabled"}},{status:409,headers:NO_STORE});
  if(!canUseVivitoCapability(session,cap))return NextResponse.json({error:{code:"CAPABILITY_FORBIDDEN",message:"Current user cannot execute this capability"}},{status:403,headers:NO_STORE});
  if(!validVivitoIdempotencyKey(idempotencyKey))return NextResponse.json({error:{code:"INVALID_IDEMPOTENCY_KEY",message:"A stable 8-128 character idempotency key is required"}},{status:400,headers:NO_STORE});
  const validation=validateVivitoCapabilityPayload(cap,body?.payload??{});
  if(validation.ok===false)return NextResponse.json({error:{code:validation.code,message:validation.message}},{status:400,headers:NO_STORE});
  const payload=redactVivito(validation.payload);
  if(body?.dryRun===true)return NextResponse.json({ok:true,dryRun:true,capability:{key:cap.key,workspace:cap.workspace,risk:cap.risk,approvalRequired:safety.approvalRequired},payload},{headers:NO_STORE});
  const sql=getVGroupSql();
  const initialStatus=safety.approvalRequired?"waiting_approval":"queued";
  const [created]=await sql<{id:string;status:string;capability_key:string;payload_redacted:unknown}[]>`insert into vgroup.vivito_tasks(actor_user_id,workspace_code,capability_key,status,risk_level,idempotency_key,payload_redacted) values(${session.userId}::uuid,${cap.workspace},${cap.key},${initialStatus},${cap.risk},${idempotencyKey},${sql.json(payload)}) on conflict(actor_user_id,workspace_code,idempotency_key) do nothing returning id::text,status,capability_key,payload_redacted`;
  if(!created){
    const [existing]=await sql`select id::text,status,workspace_code,capability_key,created_at from vgroup.vivito_tasks where actor_user_id=${session.userId}::uuid and workspace_code=${cap.workspace} and idempotency_key=${idempotencyKey} limit 1`;
    return NextResponse.json({ok:true,idempotentReplay:true,task:existing},{headers:NO_STORE});
  }
  await sql`insert into vgroup.vivito_task_events(task_id,actor_user_id,event_type,metadata_redacted) values(${created.id}::uuid,${session.userId}::uuid,'created',${sql.json({approvalRequired:safety.approvalRequired})})`;
  if(safety.approvalRequired){
    await sql`insert into vgroup.vivito_task_events(task_id,actor_user_id,event_type,metadata_redacted) values(${created.id}::uuid,${session.userId}::uuid,'approval_required','{}'::jsonb)`;
    return NextResponse.json({ok:true,taskId:created.id,status:"waiting_approval",approvalRequired:true},{status:202,headers:NO_STORE});
  }
  try{
    const execution=await executeVivitoTask(request,created);
    return NextResponse.json({ok:execution.ok,taskId:created.id,status:execution.ok?"succeeded":"failed",result:execution.result,verification:execution.verification??null},{status:execution.ok?200:502,headers:NO_STORE});
  }catch{return NextResponse.json({error:{code:"EXECUTION_FAILED",message:"Vivito task execution failed"},taskId:created.id},{status:502,headers:NO_STORE})}
}
