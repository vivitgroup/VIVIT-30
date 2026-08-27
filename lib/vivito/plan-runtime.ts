import {db,auditLogs,sql} from "@/lib/db";
import {VivitoActionError} from "./executor";
import type {VivitoActionOp} from "./action-engine";

export type VivitoPlanStep={op:VivitoActionOp;args:any;summary?:string};
export type VivitoPlanDecision={approval:any;[key:string]:any};
export type VivitoPlanResult={success:boolean;action?:string;entityId?:string|null;message?:string;[key:string]:unknown};
export type VivitoPlanExecution=
 | {success:true;requestId:string;plan:true;results:VivitoPlanResult[];duplicateSteps:number}
 | {success:false;partial:boolean;requestId:string;completedSteps:VivitoPlanResult[];stoppedAt:number;error:string;details:any;status:number;duplicateSteps:number};

const W="default";

export async function executeVivitoPlanRuntime(input:{
 steps:VivitoPlanStep[];
 decisions:VivitoPlanDecision[];
 role:string;
 userId:string;
 requestId:string;
 executeStep:(op:VivitoActionOp,args:any,role:string,userId:string)=>Promise<VivitoPlanResult>;
 applyExternal?:(op:VivitoActionOp,args:any,result:VivitoPlanResult,userId:string)=>Promise<any>;
}):Promise<VivitoPlanExecution>{
 const {steps,decisions,role,userId,requestId,executeStep,applyExternal}=input;
 const results:VivitoPlanResult[]=[];let duplicateSteps=0;
 for(let i=0;i<steps.length;i++){
  const step=steps[i],stepKey=`${requestId}:${i}`;
  const previous=Array.from(await db.execute(sql`select new_values from audit_logs where workspace_id=${W} and user_id=${userId} and action='vivito_plan_step_executed' and new_values::jsonb->>'stepKey'=${stepKey} order by created_at desc limit 1`)) as any[];
  if(previous[0]){let saved:any={};try{saved=JSON.parse(String(previous[0].new_values||"{}"))}catch{}results.push(saved.result||{success:true,duplicate:true});duplicateSteps++;continue}
  try{
   const result=await executeStep(step.op,step.args,role,userId);
   const external=applyExternal?await applyExternal(step.op,step.args,result,userId):null;
   const combined=external?{...result,external}:result;results.push(combined);
   await db.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_plan_step_executed",entity:"vivito_plan",entityId:requestId,newValues:JSON.stringify({requestId,stepKey,stepIndex:i,op:step.op,summary:step.summary||"",result:combined,approval:decisions[i]?.approval||null})} as any);
  }catch(error){
   const status=error instanceof VivitoActionError?error.status:500,message=error instanceof Error?error.message:"VIVITO stopped the plan safely.";
   await db.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_plan_stopped",entity:"vivito_plan",entityId:requestId,newValues:JSON.stringify({requestId,stepIndex:i,op:step.op,args:step.args,message,completedSteps:results.length})} as any);
   return{success:false,partial:results.length>0,requestId,completedSteps:results,stoppedAt:i,error:message,details:error instanceof VivitoActionError?error.details||null:null,status,duplicateSteps};
  }
 }
 await db.insert(auditLogs).values({workspaceId:W,userId,action:"vivito_plan_executed",entity:"vivito_plan",entityId:requestId,newValues:JSON.stringify({requestId,stepCount:results.length,results,duplicateSteps})} as any);
 return{success:true,requestId,plan:true,results,duplicateSteps};
}
