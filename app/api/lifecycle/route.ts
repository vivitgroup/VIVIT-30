// @ts-nocheck
export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,auditLogs,sql} from "@/lib/db";

const allowedEntities=new Set(["client","task","lead"]);
const allowedActions=new Set(["archive","restore","delete"]);
const clean=(v:any,n=120)=>String(v||"").trim().slice(0,n);
const rows=async(q:any)=>Array.from(await db.execute(q)) as any[];
async function audit(userId:string,action:string,entity:string,id:string,payload:any={}){await db.insert(auditLogs).values({userId,action,entity,entityId:id,newValues:JSON.stringify(payload)} as any)}

export async function GET(){
 const session=await auth();
 if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const userId=String((session.user as any).id),role=String((session.user as any).role);
 const clients=role==="SUPER_ADMIN"?await rows(sql`select id,company_name as name,archived_at from clients where archived_at is not null order by archived_at desc limit 100`):role==="ACCOUNT_MANAGER"?await rows(sql`select id,company_name as name,archived_at from clients where archived_at is not null and account_manager_id=${userId} order by archived_at desc limit 100`):[];
 const tasks=role==="SUPER_ADMIN"?await rows(sql`select id,title as name,archived_at from creative_tasks where archived_at is not null order by archived_at desc limit 150`):role==="ACCOUNT_MANAGER"?await rows(sql`select t.id,t.title as name,t.archived_at from creative_tasks t join clients c on c.id=t.client_id where t.archived_at is not null and c.account_manager_id=${userId} order by t.archived_at desc limit 150`):[];
 const leads=role==="SUPER_ADMIN"?await rows(sql`select id,company_name as name,archived_at from sales_leads where archived_at is not null order by archived_at desc limit 150`):role==="SALES"?await rows(sql`select id,company_name as name,archived_at from sales_leads where archived_at is not null and sales_rep_id=${userId} order by archived_at desc limit 150`):[];
 return NextResponse.json({clients,tasks,leads});
}

export async function POST(req:NextRequest){
  const session=await auth();
  if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>null);
  if(!body)return NextResponse.json({error:"Invalid request."},{status:400});
  const entity=clean(body.entity,30),action=clean(body.action,30),id=clean(body.id,100);
  if(!allowedEntities.has(entity)||!allowedActions.has(action)||!id)return NextResponse.json({error:"Invalid lifecycle request."},{status:400});
  const userId=String((session.user as any).id),role=String((session.user as any).role);

  if(entity==="client"){
    const [record]=await rows(sql`select id,company_name,account_manager_id,user_id,is_active,archived_at from clients where id=${id} limit 1`);
    if(!record)return NextResponse.json({error:"Client not found."},{status:404});
    const managerOwns=role==="ACCOUNT_MANAGER"&&record.account_manager_id===userId;
    if(action==="delete"&&role!=="SUPER_ADMIN")return NextResponse.json({error:"Only Super Admin can permanently delete a client."},{status:403});
    if(action!=="delete"&&role!=="SUPER_ADMIN"&&!managerOwns)return NextResponse.json({error:"You can only archive clients assigned to you."},{status:403});
    if(action==="archive"){
      if(record.archived_at)return NextResponse.json({error:"Client is already archived."},{status:409});
      await db.execute(sql`update clients set is_active=false,archived_at=now(),archived_by=${userId},updated_at=now() where id=${id} and archived_at is null`);
      await audit(userId,"client_archived","clients",id,{companyName:record.company_name});
      return NextResponse.json({success:true,state:"archived"});
    }
    if(action==="restore"){
      if(!record.archived_at)return NextResponse.json({error:"Client is already active."},{status:409});
      await db.execute(sql`update clients set is_active=true,archived_at=null,archived_by=null,updated_at=now() where id=${id} and archived_at is not null`);
      await audit(userId,"client_restored","clients",id,{companyName:record.company_name});
      return NextResponse.json({success:true,state:"active"});
    }
    if(!record.archived_at)return NextResponse.json({error:"Archive the client before permanent deletion."},{status:409});
    const [deps]=await rows(sql`select
      (select count(*)::int from creative_tasks where client_id=${id}) as tasks,
      (select count(*)::int from file_documents where client_id=${id}) as files,
      (select count(*)::int from calendar_events where client_id=${id}) as calendar,
      (select count(*)::int from finance_records where client_id=${id}) as finance,
      (select count(*)::int from ad_campaigns where client_id=${id}) as campaigns,
      (select count(*)::int from contacts where client_id=${id}) as contacts,
      (select count(*)::int from sales_leads where client_id=${id}) as converted_leads`);
    const dependent=Number(deps?.tasks||0)+Number(deps?.files||0)+Number(deps?.calendar||0)+Number(deps?.finance||0)+Number(deps?.campaigns||0)+Number(deps?.contacts||0)+Number(deps?.converted_leads||0)+(record.user_id?1:0);
    if(dependent>0)return NextResponse.json({error:"This client has linked records or a portal account. Archive it instead of permanent deletion, or remove the linked records first.",dependencies:deps,portalAccount:Boolean(record.user_id)},{status:409});
    await db.execute(sql`delete from clients where id=${id}`);
    await audit(userId,"client_deleted","clients",id,{companyName:record.company_name});
    return NextResponse.json({success:true,state:"deleted"});
  }

  if(entity==="task"){
    const [record]=await rows(sql`select t.id,t.title,t.client_id,t.created_by_id,t.assigned_to_id,t.archived_at,c.account_manager_id,c.is_active as client_active from creative_tasks t left join clients c on c.id=t.client_id where t.id=${id} limit 1`);
    if(!record)return NextResponse.json({error:"Task not found."},{status:404});
    const managerOwns=role==="ACCOUNT_MANAGER"&&record.account_manager_id===userId;
    if(action==="delete"&&role!=="SUPER_ADMIN")return NextResponse.json({error:"Only Super Admin can permanently delete a task."},{status:403});
    if(action!=="delete"&&role!=="SUPER_ADMIN"&&!managerOwns)return NextResponse.json({error:"You can only archive or restore tasks for clients assigned to you."},{status:403});
    if(action==="archive"){
      if(record.archived_at)return NextResponse.json({error:"Task is already archived."},{status:409});
      if(record.client_active===false)return NextResponse.json({error:"The client is archived. Restore the client before changing its task lifecycle."},{status:409});
      await db.execute(sql`update creative_tasks set archived_at=now(),archived_by=${userId},updated_at=now() where id=${id} and archived_at is null`);
      await audit(userId,"task_archived","creative_tasks",id,{title:record.title});
      return NextResponse.json({success:true,state:"archived"});
    }
    if(action==="restore"){
      if(!record.archived_at)return NextResponse.json({error:"Task is already active."},{status:409});
      if(record.client_active===false)return NextResponse.json({error:"Restore the client before restoring this task."},{status:409});
      await db.execute(sql`update creative_tasks set archived_at=null,archived_by=null,updated_at=now() where id=${id} and archived_at is not null`);
      await audit(userId,"task_restored","creative_tasks",id,{title:record.title});
      return NextResponse.json({success:true,state:"active"});
    }
    if(!record.archived_at)return NextResponse.json({error:"Archive the task before permanent deletion."},{status:409});
    const [deps]=await rows(sql`select (select count(*)::int from file_documents where task_id=${id}) as files,(select count(*)::int from calendar_events where task_id=${id}) as calendar,(select count(*)::int from task_comments where task_id=${id}) as comments`);
    const dependent=Number(deps?.files||0)+Number(deps?.calendar||0)+Number(deps?.comments||0);
    if(dependent>0)return NextResponse.json({error:"This task has linked files, comments, or calendar items. Keep it archived, or remove the linked records first.",dependencies:deps},{status:409});
    await db.execute(sql`delete from creative_tasks where id=${id}`);
    await audit(userId,"task_deleted","creative_tasks",id,{title:record.title});
    return NextResponse.json({success:true,state:"deleted"});
  }

  const [record]=await rows(sql`select id,company_name,sales_rep_id,client_id,archived_at from sales_leads where id=${id} limit 1`);
  if(!record)return NextResponse.json({error:"Lead not found."},{status:404});
  const owner=record.sales_rep_id===userId;
  if(role!=="SUPER_ADMIN"&&!owner)return NextResponse.json({error:"You can only archive or delete leads assigned to you."},{status:403});
  if(action==="archive"){
    if(record.archived_at)return NextResponse.json({error:"Lead is already archived."},{status:409});
    await db.execute(sql`update sales_leads set archived_at=now(),archived_by=${userId},updated_at=now() where id=${id} and archived_at is null`);
    await audit(userId,"lead_archived","sales_leads",id,{companyName:record.company_name});
    return NextResponse.json({success:true,state:"archived"});
  }
  if(action==="restore"){
    if(!record.archived_at)return NextResponse.json({error:"Lead is already active."},{status:409});
    await db.execute(sql`update sales_leads set archived_at=null,archived_by=null,updated_at=now() where id=${id} and archived_at is not null`);
    await audit(userId,"lead_restored","sales_leads",id,{companyName:record.company_name});
    return NextResponse.json({success:true,state:"active"});
  }
  if(!record.archived_at)return NextResponse.json({error:"Archive the lead before permanent deletion."},{status:409});
  if(record.client_id)return NextResponse.json({error:"This lead was converted to a client and cannot be permanently deleted. Archive it instead."},{status:409});
  await db.execute(sql`delete from sales_leads where id=${id}`);
  await audit(userId,"lead_deleted","sales_leads",id,{companyName:record.company_name});
  return NextResponse.json({success:true,state:"deleted"});
}
