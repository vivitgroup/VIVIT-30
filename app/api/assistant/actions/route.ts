export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,auditLogs,sql} from "@/lib/db";
import {executeVivitoAction,VivitoActionError} from "@/lib/vivito/executor";
import {VIVITO_ACTION_CATALOG,type VivitoActionOp} from "@/lib/vivito/action-engine";

const W="default";
const clean=(v:any,n=120)=>String(v||"").trim().slice(0,n);

export async function POST(req:NextRequest){
 const session=await auth();
 if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json().catch(()=>null);
 if(!body)return NextResponse.json({error:"Invalid request."},{status:400});
 const role=String((session.user as any).role||""),userId=String((session.user as any).id||""),op=clean(body.op,60) as VivitoActionOp,requestId=clean(body.requestId,100);
 if(!VIVITO_ACTION_CATALOG[op])return NextResponse.json({error:"Unsupported VIVITO action."},{status:400});
 if(body.confirm!==true)return NextResponse.json({error:"Explicit confirmation is required before VIVITO writes to the ERP.",preview:{op,args:body.args||{}}},{status:409});
 if(requestId){
  const done=Array.from(await db.execute(sql`select id,new_values from audit_logs where workspace_id=${W} and user_id=${userId} and action='vivito_action_executed' and new_values::jsonb->>'requestId'=${requestId} order by created_at desc limit 1`)) as any[];
  if(done[0]){let previous:any={};try{previous=JSON.parse(String(done[0].new_values||"{}"))}catch{}return NextResponse.json({success:true,duplicate:true,action:op,result:previous.result||null},{headers:{"Cache-Control":"private, no-store"}})}
 }
 try{
  const result=await executeVivitoAction(op,body.args||{},role,userId);
  await db.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_action_executed",entity:"vivito",entityId:String(result?.entityId||requestId||crypto.randomUUID()),newValues:JSON.stringify({requestId:requestId||null,op,result})} as any);
  return NextResponse.json({success:true,action:op,result},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){
  if(error instanceof VivitoActionError)return NextResponse.json({error:error.message,details:error.details||null},{status:error.status,headers:{"Cache-Control":"private, no-store"}});
  console.error("VIVITO action execution failed",error);
  return NextResponse.json({error:"VIVITO could not execute the action safely."},{status:500,headers:{"Cache-Control":"private, no-store"}});
 }
}
