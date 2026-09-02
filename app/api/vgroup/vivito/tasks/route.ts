import {NextResponse} from "next/server";
import {requireVGroupSession} from "@/lib/vgroup/session";
import {getVGroupSql} from "@/lib/vgroup/db";
import {canUseVivitoCapability,findVivitoCapability,redactVivito,vivitoPublicCapabilities} from "@/lib/vgroup/vivito-cross-workspace";
import {executeVivitoTask} from "@/lib/vgroup/vivito-execution";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};
const keyPattern=/^[A-Za-z0-9._:-]{8,128}$/;

export async function GET(){
  const session=await requireVGroupSession();
  const sql=getVGroupSql();
  const tasks=await sql`select id::text,workspace_code,capability_key,status,risk_level,idempotency_key,error_code,approved_at,started_at,completed_at,created_at from vgroup.vivito_tasks where actor_user_id=${session.userId}::uuid order by created_at desc limit 100`;
  return NextResponse.json({capabilities:vivitoPublicCapabilities().filter(c=>c.workspace==='marketing'||canUseVivitoCapability(session,findVivitoCapability(c.key)!)),tasks:Array.from(tasks)},{headers:NO_STORE});
}

export async function POST(request:Request){
  const session=await requireVGroupSession();
  const body=await request.json().catch(()=>null) as {capabilityKey?:string;idempotencyKey?:string;payload?:unknown;dryRun?:boolean}|null;
  const cap=findVivitoCapability(String(body?.capabilityKey??""));
  const idempotencyKey=String(body?.idempotencyKey??"");
  if(!cap)return NextResponse.json({error:{code:"CAPABILITY_NOT_FOUND",message:"Vivito capability is not registered"}},{status:404,headers:NO_STORE});
  if(!cap.enabled)return NextResponse.json({error:{code:"INTEGRATION_REQUIRED",message:"This capability remains fail-closed until the controlled Marketing integration"}},{status:409,headers:NO_STORE});
  if(!canUseVivitoCapability(session,cap))return NextResponse.json({error:{code:"CAPABILITY_FORBIDDEN",message:"Current user cannot execute this capability"}},{status:403,headers:NO_STORE});
  if(!keyPattern.test(idempotencyKey))return NextResponse.json({error:{code:"INVALID_IDEMPOTENCY_KEY",message:"A stable 8-128 character idempotency key is required"}},{status:400,headers:NO_STORE});
  const payload=redactVivito(body?.payload??{});
  if(body?.dryRun===true)return NextResponse.json({ok:true,dryRun:true,capability:{key:cap.key,workspace:cap.workspace,risk:cap.risk,approvalRequired:cap.approvalRequired},payload},{headers:NO_STORE});
  const sql=getVGroupSql();
  const initialStatus=cap.approvalRequired?"waiting_approval":"queued";
  const [created]=await sql<{id:string;status:string;capability_key:string;payload_redacted:unknown}[]>`insert into vgroup.vivito_tasks(actor_user_id,workspace_code,capability_key,status,risk_level,idempotency_key,payload_redacted) values(${session.userId}::uuid,${cap.workspace},${cap.key},${initialStatus},${cap.risk},${idempotencyKey},${sql.json(payload)}) on conflict(actor_user_id,workspace_code,idempotency_key) do nothing returning id::text,status,capability_key,payload_redacted`;
  if(!created){
    const [existing]=await sql`select id::text,status,workspace_code,capability_key,created_at from vgroup.vivito_tasks where actor_user_id=${session.userId}::uuid and workspace_code=${cap.workspace} and idempotency_key=${idempotencyKey} limit 1`;
    return NextResponse.json({ok:true,idempotentReplay:true,task:existing},{headers:NO_STORE});
  }
  await sql`insert into vgroup.vivito_task_events(task_id,actor_user_id,event_type,metadata_redacted) values(${created.id}::uuid,${session.userId}::uuid,'created','{}'::jsonb)`;
  if(cap.approvalRequired){
    await sql`insert into vgroup.vivito_task_events(task_id,actor_user_id,event_type,metadata_redacted) values(${created.id}::uuid,${session.userId}::uuid,'approval_required','{}'::jsonb)`;
    return NextResponse.json({ok:true,taskId:created.id,status:"waiting_approval",approvalRequired:true},{status:202,headers:NO_STORE});
  }
  try{
    const execution=await executeVivitoTask(request,created);
    return NextResponse.json({ok:execution.ok,taskId:created.id,status:execution.ok?"succeeded":"failed",result:execution.result},{status:execution.ok?200:502,headers:NO_STORE});
  }catch{return NextResponse.json({error:{code:"EXECUTION_FAILED",message:"Vivito task execution failed"},taskId:created.id},{status:502,headers:NO_STORE})}
}
