export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";

const WS="default";
const CAN_CREATE=new Set(["SUPER_ADMIN","ACCOUNT_MANAGER"]);
const CAN_COMMENT=new Set(["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR"]);
export async function POST(req:NextRequest){
 const s=await auth();if(!s?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String((s.user as any).role||""),userId=String((s.user as any).id||""),b=await req.json().catch(()=>({})),action=String(b.action||"");
 try{
  if(action==="create_task"){
   if(!CAN_CREATE.has(role))return NextResponse.json({error:"This action requires Account Manager or Super Admin approval."},{status:403});
   const clientId=String(b.clientId||""),title=String(b.title||"").trim().slice(0,180),brief=String(b.brief||"").trim().slice(0,5000),type=String(b.type||"GRAPHIC"),priority=String(b.priority||"MEDIUM"),deadline=new Date(String(b.deadline||Date.now()+86400000)),creatorId=b.creatorId?String(b.creatorId):null;
   if(!clientId||!title||!brief||Number.isNaN(deadline.getTime()))return NextResponse.json({error:"clientId, title, brief and a valid deadline are required."},{status:400});
   const owned=await db.execute(sql`select id,company_name,account_manager_id,media_buyer_id from clients where id=${clientId} and workspace_id=${WS} and is_active=true and (${role==="SUPER_ADMIN"?sql`true`:sql`account_manager_id=${userId}`}) limit 1`);const c=Array.from(owned as any)[0] as any;if(!c)return NextResponse.json({error:"Client access denied."},{status:403});
   const id=crypto.randomUUID();await db.execute(sql`insert into creative_tasks(id,workspace_id,client_id,title,brief,deadline,priority,status,type,created_by_id,assigned_to_id,created_at,updated_at) values(${id},${WS},${clientId},${title},${brief},${deadline},${priority},'PENDING',${type},${userId},${creatorId},now(),now())`);
   await db.execute(sql`insert into audit_logs(id,workspace_id,user_id,action,entity,entity_id,new_values,created_at) values(${crypto.randomUUID()},${WS},${userId},'COPILOT_CREATE_TASK','creative_task',${id},${JSON.stringify({clientId,title,creatorId,accountManagerId:c.account_manager_id,mediaBuyerId:c.media_buyer_id})},now())`);
   return NextResponse.json({ok:true,message:`Task created for ${c.company_name}.`,href:`/dashboard/creative/${id}`,id});
  }
  if(action==="comment_task"){
   if(!CAN_COMMENT.has(role))return NextResponse.json({error:"Action not allowed."},{status:403});const taskId=String(b.taskId||""),comment=String(b.comment||"").trim().slice(0,3000);if(!taskId||!comment)return NextResponse.json({error:"taskId and comment are required."},{status:400});
   const access=await db.execute(sql`select t.id from creative_tasks t join clients c on c.id=t.client_id where t.id=${taskId} and t.workspace_id=${WS} and t.archived_at is null and c.is_active=true and (${role==="SUPER_ADMIN"?sql`true`:role==="CREATOR"?sql`t.assigned_to_id=${userId}`:role==="ACCOUNT_MANAGER"?sql`c.account_manager_id=${userId}`:sql`c.media_buyer_id=${userId}`}) limit 1`);if(!Array.from(access as any).length)return NextResponse.json({error:"Task access denied."},{status:403});
   await db.execute(sql`insert into task_comments(id,task_id,user_id,comment,is_internal,created_at) values(${crypto.randomUUID()},${taskId},${userId},${comment},true,now())`);return NextResponse.json({ok:true,message:"Internal task comment added.",href:`/dashboard/creative/${taskId}`});
  }
  if(action==="prepare_whatsapp"){
   if(!["SUPER_ADMIN","ACCOUNT_MANAGER","SALES","ACCOUNTANT"].includes(role))return NextResponse.json({error:"Action not allowed."},{status:403});const phone=String(b.phone||"").replace(/\D/g,""),message=String(b.message||"").trim().slice(0,3000);if(!phone||!message)return NextResponse.json({error:"phone and message are required."},{status:400});return NextResponse.json({ok:true,message:"WhatsApp draft prepared. Nothing was sent automatically.",href:`https://wa.me/${phone}?text=${encodeURIComponent(message)}`});
  }
  return NextResponse.json({error:"Unsupported action."},{status:400});
 }catch(e:any){return NextResponse.json({error:String(e?.message||"Action failed").slice(0,400)},{status:500})}
}
