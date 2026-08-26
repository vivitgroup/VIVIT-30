export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,auditLogs,sql} from "@/lib/db";
import {executeVivitoAction,VivitoActionError} from "@/lib/vivito/executor";
import {executeVivitoExtendedAction,isVivitoExtendedAction} from "@/lib/vivito/executor-extended";
import {VIVITO_ACTION_CATALOG,type VivitoActionOp} from "@/lib/vivito/action-engine";

const W="default";
const clean=(v:any,n=120)=>String(v||"").trim().slice(0,n);
const noStore={"Cache-Control":"private, no-store"};
async function execute(op:VivitoActionOp,args:any,role:string,userId:string){return isVivitoExtendedAction(op)?executeVivitoExtendedAction(op,args||{},role,userId):executeVivitoAction(op,args||{},role,userId)}

export async function POST(req:NextRequest){
 const session=await auth();
 if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json().catch(()=>null);
 if(!body)return NextResponse.json({error:"Invalid request."},{status:400});
 const role=String((session.user as any).role||""),userId=String((session.user as any).id||""),requestId=clean(body.requestId,100);
 if(body.confirm!==true)return NextResponse.json({error:"Explicit confirmation is required before VIVITO writes to the ERP."},{status:409,headers:noStore});

 const plan=Array.isArray(body.plan)?body.plan.slice(0,8):null;
 if(plan?.length){
  if(plan.length<2)return NextResponse.json({error:"Multi-step execution requires at least two steps."},{status:400,headers:noStore});
  const normalized=plan.map((s:any)=>({op:clean(s?.op,60) as VivitoActionOp,args:s?.args&&typeof s.args==="object"&&!Array.isArray(s.args)?s.args:{},summary:clean(s?.summary,500)}));
  if(normalized.some(s=>!VIVITO_ACTION_CATALOG[s.op]||!VIVITO_ACTION_CATALOG[s.op].roles.includes(role)))return NextResponse.json({error:"One or more VIVITO plan steps are not authorized for your role."},{status:403,headers:noStore});
  const rootId=requestId||crypto.randomUUID(),results:any[]=[];
  for(let i=0;i<normalized.length;i++){
   const step=normalized[i],stepKey=`${rootId}:${i}`;
   const previous=Array.from(await db.execute(sql`select new_values from audit_logs where workspace_id=${W} and user_id=${userId} and action='vivito_plan_step_executed' and new_values::jsonb->>'stepKey'=${stepKey} order by created_at desc limit 1`)) as any[];
   if(previous[0]){let saved:any={};try{saved=JSON.parse(String(previous[0].new_values||"{}"))}catch{}results.push(saved.result||{success:true,duplicate:true});continue}
   try{
    const result=await execute(step.op,step.args,role,userId);results.push(result);
    await db.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_plan_step_executed",entity:"vivito_plan",entityId:rootId,newValues:JSON.stringify({requestId:rootId,stepKey,stepIndex:i,op:step.op,summary:step.summary,result})} as any);
   }catch(error){
    const status=error instanceof VivitoActionError?error.status:500,message=error instanceof Error?error.message:"VIVITO stopped the plan safely.";
    await db.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_plan_stopped",entity:"vivito_plan",entityId:rootId,newValues:JSON.stringify({requestId:rootId,stepIndex:i,op:step.op,message,completedSteps:results.length})} as any);
    return NextResponse.json({success:false,partial:results.length>0,requestId:rootId,completedSteps:results,stoppedAt:i,error:message,details:error instanceof VivitoActionError?error.details||null:null},{status,headers:noStore});
   }
  }
  await db.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_plan_executed",entity:"vivito_plan",entityId:rootId,newValues:JSON.stringify({requestId:rootId,stepCount:results.length,results})} as any);
  return NextResponse.json({success:true,requestId:rootId,plan:true,results},{headers:noStore});
 }

 const op=clean(body.op,60) as VivitoActionOp;
 if(!VIVITO_ACTION_CATALOG[op])return NextResponse.json({error:"Unsupported VIVITO action."},{status:400,headers:noStore});
 if(requestId){
  const done=Array.from(await db.execute(sql`select id,new_values from audit_logs where workspace_id=${W} and user_id=${userId} and action='vivito_action_executed' and new_values::jsonb->>'requestId'=${requestId} order by created_at desc limit 1`)) as any[];
  if(done[0]){let previous:any={};try{previous=JSON.parse(String(done[0].new_values||"{}"))}catch{}return NextResponse.json({success:true,duplicate:true,action:op,result:previous.result||null},{headers:noStore})}
 }
 try{
  const result=await execute(op,body.args||{},role,userId);
  await db.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_action_executed",entity:"vivito",entityId:String(result?.entityId||requestId||crypto.randomUUID()),newValues:JSON.stringify({requestId:requestId||null,op,result})} as any);
  return NextResponse.json({success:true,action:op,result},{headers:noStore});
 }catch(error){
  if(error instanceof VivitoActionError)return NextResponse.json({error:error.message,details:error.details||null},{status:error.status,headers:noStore});
  console.error("VIVITO action execution failed",error);
  return NextResponse.json({error:"VIVITO could not execute the action safely."},{status:500,headers:noStore});
 }
}
