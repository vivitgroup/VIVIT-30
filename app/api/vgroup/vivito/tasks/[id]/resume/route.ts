import {NextResponse} from "next/server";
import {requireVGroupSession} from "@/lib/vgroup/session";
import {getVGroupSql} from "@/lib/vgroup/db";
import {canUseVivitoCapability,findVivitoCapability} from "@/lib/vgroup/vivito-cross-workspace";
import {executeVivitoTask} from "@/lib/vgroup/vivito-execution";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await requireVGroupSession();
  const {id}=await params;
  if(!uuid.test(id))return NextResponse.json({error:{code:"INVALID_TASK_ID",message:"Invalid task id"}},{status:400,headers:NO_STORE});

  const sql=getVGroupSql();
  const [task]=await sql<{id:string;actor_user_id:string;status:string;capability_key:string;payload_redacted:unknown}[]>`
    select id::text,actor_user_id::text,status,capability_key,payload_redacted
    from vgroup.vivito_tasks
    where id=${id}::uuid
    limit 1
  `;
  if(!task)return NextResponse.json({error:{code:"TASK_NOT_FOUND",message:"Vivito task not found"}},{status:404,headers:NO_STORE});

  const isGroupAdmin=session.memberships.some(m=>m.role==="GROUP_SUPER_ADMIN");
  if(task.actor_user_id!==session.userId&&!isGroupAdmin)return NextResponse.json({error:{code:"TASK_FORBIDDEN",message:"Only the task owner or a Group Super Admin can resume this task"}},{status:403,headers:NO_STORE});
  if(task.status!=="queued")return NextResponse.json({error:{code:"TASK_NOT_RESUMABLE",message:`Only queued tasks can be resumed safely. Current status: ${task.status}`}},{status:409,headers:NO_STORE});

  const cap=findVivitoCapability(task.capability_key);
  if(!cap||!cap.enabled||!cap.endpoint)return NextResponse.json({error:{code:"CAPABILITY_NOT_EXECUTABLE",message:"Task capability is not executable"}},{status:409,headers:NO_STORE});
  if(!canUseVivitoCapability(session,cap))return NextResponse.json({error:{code:"CAPABILITY_FORBIDDEN",message:"Current user no longer has permission to execute this capability"}},{status:403,headers:NO_STORE});

  await sql`insert into vgroup.vivito_task_events(task_id,actor_user_id,event_type,metadata_redacted) values(${id}::uuid,${session.userId}::uuid,'resume_requested',jsonb_build_object('original_actor_user_id',${task.actor_user_id}::text))`;
  try{
    const execution=await executeVivitoTask(request,task);
    return NextResponse.json({ok:execution.ok,taskId:id,status:execution.ok?"succeeded":"failed",result:execution.result},{status:execution.ok?200:502,headers:NO_STORE});
  }catch(error){
    const code=error instanceof Error?error.message:"EXECUTION_FAILED";
    const conflict=code.startsWith("TASK_NOT_EXECUTABLE_FROM_")||code==="TASK_NOT_FOUND";
    return NextResponse.json({error:{code:conflict?"TASK_ALREADY_CLAIMED":"EXECUTION_FAILED",message:conflict?"Task was already claimed or changed state before recovery could run":"Vivito task recovery execution failed"},taskId:id},{status:conflict?409:502,headers:NO_STORE});
  }
}
