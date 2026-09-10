import {NextResponse} from "next/server";
import {requireApiGroupSuperAdmin} from "@/lib/vgroup/api-access";
import {getVGroupSql} from "@/lib/vgroup/db";
import {executeVivitoTask} from "@/lib/vgroup/vivito-execution";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;

type ExecutableTask={id:string;status:string;capability_key:string;payload_redacted:unknown};

async function decisionConflict(sql:ReturnType<typeof getVGroupSql>,id:string){
  const [existing]=await sql<{id:string;status:string}[]>`select id::text,status from vgroup.vivito_tasks where id=${id}::uuid limit 1`;
  if(!existing)return NextResponse.json({error:{code:"TASK_NOT_FOUND",message:"Vivito task not found"}},{status:404,headers:NO_STORE});
  return NextResponse.json({error:{code:"TASK_NOT_AWAITING_APPROVAL",message:"Task is not awaiting approval",status:existing.status}},{status:409,headers:NO_STORE});
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await requireApiGroupSuperAdmin();
  const {id}=await params;
  if(!uuid.test(id))return NextResponse.json({error:{code:"INVALID_TASK_ID",message:"Invalid task id"}},{status:400,headers:NO_STORE});
  const body=await request.json().catch(()=>null) as {decision?:"approve"|"reject";reason?:string}|null;
  if(body?.decision!=="approve"&&body?.decision!=="reject")return NextResponse.json({error:{code:"INVALID_DECISION",message:"Decision must be approve or reject"}},{status:400,headers:NO_STORE});
  const sql=getVGroupSql();

  if(body.decision==="reject"){
    const [rejected]=await sql<{id:string}[]>`update vgroup.vivito_tasks set status='rejected',error_code='REJECTED_BY_APPROVER',approved_by=${session.userId}::uuid,approved_at=now(),completed_at=now(),updated_at=now() where id=${id}::uuid and status='waiting_approval' returning id::text`;
    if(!rejected)return decisionConflict(sql,id);
    await sql`insert into vgroup.vivito_task_events(task_id,actor_user_id,event_type,metadata_redacted) values(${id}::uuid,${session.userId}::uuid,'rejected',jsonb_build_object('reason',${String(body.reason??"").slice(0,500)}))`;
    return NextResponse.json({ok:true,taskId:id,status:"rejected"},{headers:NO_STORE});
  }

  // Compare-and-set waiting_approval -> queued before execution. This makes an
  // approval decision single-consumer even if two approvers submit at the same
  // instant; only one request can win and execute the side effect.
  const [approved]=await sql<ExecutableTask[]>`update vgroup.vivito_tasks set status='queued',approved_by=${session.userId}::uuid,approved_at=now(),updated_at=now() where id=${id}::uuid and status='waiting_approval' returning id::text,status,capability_key,payload_redacted`;
  if(!approved)return decisionConflict(sql,id);
  await sql`insert into vgroup.vivito_task_events(task_id,actor_user_id,event_type,metadata_redacted) values(${id}::uuid,${session.userId}::uuid,'approved','{}'::jsonb)`;
  try{
    const execution=await executeVivitoTask(request,approved);
    return NextResponse.json({ok:execution.ok,taskId:id,status:execution.ok?"succeeded":"failed",result:execution.result},{status:execution.ok?200:502,headers:NO_STORE});
  }catch{return NextResponse.json({error:{code:"EXECUTION_FAILED",message:"Approved Vivito task failed"},taskId:id},{status:502,headers:NO_STORE})}
}
