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
 const tasks=role==="SUPER_ADMIN"?await rows(sql`select id,title as name,archived_at from creative_tasks where archived_at is not null order by archived_at desc limit 150`):await rows(sql`select id,title as name,archived_at from creative_tasks where archived_at is not null and created_by_id=${userId} order by archived_at desc limit 150`);
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
      await db.execute(sql`update clients set is_active=false,archived_at=now(),archived_by=${userId},updated_at=now() where id=${id}`);
      await audit(userId,"client_archived","clients",id,{companyName:record.company_name});
      return NextResponse.json({success:true,state:"archived"});
    }
    if(action==="restore"){
      await db.execute(sql`update clients set is_active=true,archived_at=null,archived_by=null,updated_at=now() where id=${id}`);
      await audit(userId,"client_restored","clients",id,{companyName:record.company_name});
      return NextResponse.json({success:true,state:"active"});
    }
    const [deps]=await rows(sql`select (select count(*)::int from creative_tasks where client_id=${id}) as tasks,(select count(*)::int from file_documents where client_id=${id}) as files,(select count(*)::int from calendar_events where client_id=${id}) as calendar,(select count(*)::int from finance_records where client_id=${id}) as finance,(select count(*)::int from ad_campaigns where client_id=${id}) as campaigns`);
    const dependent=Number(deps?.tasks||0)+Number(deps?.files||0)+Number(deps?.calendar||0)+Number(deps?.finance||0)+Number(deps?.campaigns||0)+(record.user_id?1:0);
    if(dependent>0)return NextResponse.json({error:"This client has linked data or a portal account. Archive it instead of permanent deletion.",dependencies:deps},{status:409});
    await db.execute(sql`delete from clients where id=${id}`);
    await audit(userId,"client_deleted","clients",id,{companyName:record.company_name});
    return NextResponse.json({success:true,state:"deleted"});
  }

  if(entity==="task"){
    const [record]=await rows(sql`select id,title,client_id,created_by_id,assigned_to_id,archived_at from creative_tasks where id=${id} limit 1`);
    if(!record)return NextResponse.json({error:"Task not found."},{status:404});
    const owner=record.created_by_id===userId;
    if(role!=="SUPER_ADMIN"&&!owner)return NextResponse.json({error:"You can only archive or delete tasks you created."},{status:403});
    if(action==="archive"){
      await db.execute(sql`update creative_tasks set archived_at=now(),archived_by=${userId},updated_at=now() where id=${id}`);
      await audit(userId,"task_archived","creative_tasks",id,{title:record.title});
      return NextResponse.json({success:true,state:"archived"});
    }
    if(action==="restore"){
      await db.execute(sql`update creative_tasks set archived_at=null,archived_by=null,updated_at=now() where id=${id}`);
      await audit(userId,"task_restored","creative_tasks",id,{title:record.title});
      return NextResponse.json({success:true,state:"active"});
    }
    const [deps]=await rows(sql`select (select count(*)::int from file_documents where task_id=${id}) as files,(select count(*)::int from calendar_events where task_id=${id}) as calendar`);
    const dependent=Number(deps?.files||0)+Number(deps?.calendar||0);
    if(dependent>0)return NextResponse.json({error:"This task has linked files or calendar items. Archive it instead, or remove the linked records first.",dependencies:deps},{status:409});
    await db.execute(sql`delete from creative_tasks where id=${id}`);
    await audit(userId,"task_deleted","creative_tasks",id,{title:record.title});
    return NextResponse.json({success:true,state:"deleted"});
  }

  const [record]=await rows(sql`select id,company_name,sales_rep_id,client_id,archived_at from sales_leads where id=${id} limit 1`);
  if(!record)return NextResponse.json({error:"Lead not found."},{status:404});
  const owner=record.sales_rep_id===userId;
  if(role!=="SUPER_ADMIN"&&!owner)return NextResponse.json({error:"You can only archive or delete leads assigned to you."},{status:403});
  if(action==="archive"){
    await db.execute(sql`update sales_leads set archived_at=now(),archived_by=${userId},updated_at=now() where id=${id}`);
    await audit(userId,"lead_archived","sales_leads",id,{companyName:record.company_name});
    return NextResponse.json({success:true,state:"archived"});
  }
  if(action==="restore"){
    await db.execute(sql`update sales_leads set archived_at=null,archived_by=null,updated_at=now() where id=${id}`);
    await audit(userId,"lead_restored","sales_leads",id,{companyName:record.company_name});
    return NextResponse.json({success:true,state:"active"});
  }
  if(record.client_id)return NextResponse.json({error:"This lead was converted to a client and cannot be permanently deleted. Archive it instead."},{status:409});
  await db.execute(sql`delete from sales_leads where id=${id}`);
  await audit(userId,"lead_deleted","sales_leads",id,{companyName:record.company_name});
  return NextResponse.json({success:true,state:"deleted"});
}
