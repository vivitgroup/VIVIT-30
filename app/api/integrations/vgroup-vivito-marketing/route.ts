import {NextResponse} from "next/server";
import {requireVGroupSession} from "@/lib/vgroup/session";
import {canAccessBusinessUnit} from "@/lib/vgroup/contracts";
import {createMarketingHandoffAssertion} from "@/lib/vgroup/marketing-integration";
import {authorizeGroupHandoff} from "@/lib/group-handoff";
import {executeVivitoAction,type VivitoActionArgs} from "@/lib/vivito/executor";
import {executeVivitoExtendedAction,isVivitoExtendedAction} from "@/lib/vivito/executor-extended";
import {executeVivitoOperatorAction,isVivitoOperatorAction} from "@/lib/vivito/executor-operator";
import {VIVITO_ACTION_CATALOG,type VivitoActionOp} from "@/lib/vivito/action-engine";
import {buildVivitoDryRun} from "@/lib/vivito/approval-policy";
import {db,sql} from "@/lib/db";

export const dynamic="force-dynamic";
const noStore={"Cache-Control":"private, no-store"};
type UnknownRecord=Record<string,unknown>;
type ActionValue=string|number|boolean|null|Date|ActionValue[]|{[key:string]:ActionValue|undefined};
const asRecord=(value:unknown):UnknownRecord=>value&&typeof value==="object"&&!Array.isArray(value)?Object.fromEntries(Object.entries(value)):{};
function toActionValue(value:unknown):ActionValue{if(value===null)return null;if(typeof value==="string"||typeof value==="number"||typeof value==="boolean")return value;if(value instanceof Date)return value;if(Array.isArray(value))return value.map(toActionValue);if(value&&typeof value==="object"){const out:{[key:string]:ActionValue|undefined}={};for(const [key,item] of Object.entries(value))out[key]=item===undefined?undefined:toActionValue(item);return out}return String(value??"")}
const toActionArgs=(value:unknown):VivitoActionArgs=>{const record=asRecord(value),out:VivitoActionArgs={};for(const [key,item] of Object.entries(record))out[key]=item===undefined?undefined:toActionValue(item);return out};
const isVivitoActionOp=(value:string):value is VivitoActionOp=>Object.prototype.hasOwnProperty.call(VIVITO_ACTION_CATALOG,value);

async function execute(op:VivitoActionOp,args:VivitoActionArgs,role:string,userId:string,workspaceId:string){if(isVivitoOperatorAction(op))return executeVivitoOperatorAction(op,args,role,userId,workspaceId);if(isVivitoExtendedAction(op))return executeVivitoExtendedAction(op,args,role,userId,workspaceId);return executeVivitoAction(op,args,role,userId,workspaceId)}
function responseError(code:string,message:string,status:number){return NextResponse.json({error:{code,message}},{status,headers:noStore})}

export async function POST(request:Request){
  const session=await requireVGroupSession();
  if(!canAccessBusinessUnit(session,"marketing"))return responseError("MARKETING_ACCESS_FORBIDDEN","Current Group user has no Marketing business-unit access",403);
  const body=await request.json().catch(()=>null) as {op?:unknown;args?:unknown}|null;
  const opRaw=String(body?.op??"").trim().slice(0,60);
  if(!isVivitoActionOp(opRaw))return responseError("UNSUPPORTED_MARKETING_ACTION","Unsupported Marketing Vivito action",400);
  const taskId=String(request.headers.get("x-vivito-task-id")??"").trim().slice(0,120);
  try{
    const {assertion}=createMarketingHandoffAssertion(session);
    const marketingUser=await authorizeGroupHandoff(assertion);
    const args=toActionArgs(body?.args);
    const dry=buildVivitoDryRun(opRaw,args,marketingUser.role);
    if(dry.approval.mode==="BLOCK")return responseError("MARKETING_ROLE_BLOCKED",dry.approval.reason||"Marketing role cannot execute this action",403);
    if(dry.missingFields.length)return NextResponse.json({error:{code:"MISSING_MARKETING_FIELDS",message:"Required Marketing action fields are missing"},missingFields:dry.missingFields},{status:400,headers:noStore});
    const receiptId=taskId?`vivito:vgroup:${taskId}`:"";
    if(receiptId){
      const started=JSON.stringify({taskId,op:opRaw,state:"STARTED",source:"vgroup"});
      const claimed=Array.from(await db.execute<{id:string}>(sql`insert into audit_logs(id,workspace_id,user_id,action,entity,entity_id,new_values,created_at) values(${receiptId},${marketingUser.workspaceId},${marketingUser.id},'vivito_group_action_started','vivito',${taskId},${started},now()) on conflict (id) do nothing returning id`));
      if(!claimed.length){
        const [prior]=Array.from(await db.execute<{action:string;new_values:string|null}>(sql`select action,new_values from audit_logs where id=${receiptId} and workspace_id=${marketingUser.workspaceId} and user_id=${marketingUser.id} limit 1`));
        if(prior?.action==="vivito_group_action_executed")return NextResponse.json({success:true,duplicate:true,result:prior.new_values?JSON.parse(prior.new_values):null},{headers:noStore});
        if(prior?.action==="vivito_group_action_failed"){
          const reclaimed=Array.from(await db.execute<{id:string}>(sql`update audit_logs set action='vivito_group_action_started',new_values=${started},created_at=now() where id=${receiptId} and workspace_id=${marketingUser.workspaceId} and user_id=${marketingUser.id} and action='vivito_group_action_failed' returning id`));
          if(!reclaimed.length)return responseError("MARKETING_TASK_ALREADY_CLAIMED","This Marketing task was already reclaimed by another execution",409);
        }else return responseError("MARKETING_TASK_ALREADY_CLAIMED","This Marketing task was already claimed and will not execute twice",409);
      }
    }
    try{
      const result=await execute(opRaw,args,marketingUser.role,marketingUser.id,marketingUser.workspaceId);
      const successValues=JSON.stringify({taskId:taskId||null,op:opRaw,result,source:"vgroup"});
      if(receiptId)await db.execute(sql`update audit_logs set action='vivito_group_action_executed',new_values=${successValues} where id=${receiptId} and workspace_id=${marketingUser.workspaceId} and user_id=${marketingUser.id} and action='vivito_group_action_started'`);
      return NextResponse.json({success:true,action:opRaw,result},{headers:noStore});
    }catch(error){
      const message=error instanceof Error?error.message:"Marketing Vivito action failed";
      if(receiptId)await db.execute(sql`update audit_logs set action='vivito_group_action_failed',new_values=${JSON.stringify({taskId,op:opRaw,message,source:"vgroup"})} where id=${receiptId} and workspace_id=${marketingUser.workspaceId} and user_id=${marketingUser.id} and action='vivito_group_action_started'`).catch(()=>{});
      return responseError("MARKETING_EXECUTION_FAILED",message,502);
    }
  }catch(error){
    const code=error instanceof Error?error.message:"MARKETING_BRIDGE_FAILED";
    return responseError("MARKETING_BRIDGE_FAILED",code,503);
  }
}
