import fs from "node:fs";

function need(s,a,label){if(!s.includes(a))throw new Error(`Missing expected pattern: ${label}`)}
function once(s,a,b,label){need(s,a,label);return s.replace(a,b)}
function write(p,s){fs.writeFileSync(p,s)}

function hardenExecutor(p,exportName){
 let s=fs.readFileSync(p,"utf8");
 need(s,'const W="default";',`${p} fixed W`);
 s=s.replace('const W="default";\n','');
 if(!s.includes('node:async_hooks')){
   const firstImportEnd=s.indexOf('\n');
   s=s.slice(0,firstImportEnd+1)+'import {AsyncLocalStorage} from "node:async_hooks";\n'+s.slice(firstImportEnd+1);
 }
 s=s.replace(/\bW\b/g,'ws()');
 const marker=p.endsWith('/executor.ts')
  ? 'export class VivitoActionError extends Error{status:number;details?:unknown;constructor(message:string,status=400,details?:unknown){super(message);this.status=status;this.details=details}}\n'
  : p.includes('executor-extended')
   ? 'const rows=(v:any)=>Array.from(v as any) as any[];\n'
   : 'const OPERATOR_OPS=new Set<VivitoActionOp>([';
 if(p.endsWith('/executor.ts')){
   s=once(s,marker,marker+'const workspaceContext=new AsyncLocalStorage<string>();\nconst ws=()=>{const id=workspaceContext.getStore();if(!id)throw new VivitoActionError("Workspace unavailable.",403);return id};\n',`${p} context insert`);
 }else if(p.includes('executor-extended')){
   s=once(s,marker,'const workspaceContext=new AsyncLocalStorage<string>();\nconst ws=()=>{const id=workspaceContext.getStore();if(!id)throw new VivitoActionError("Workspace unavailable.",403);return id};\n'+marker,`${p} context insert`);
 }else{
   s=once(s,marker,'const workspaceContext=new AsyncLocalStorage<string>();\nconst ws=()=>{const id=workspaceContext.getStore();if(!id)throw new VivitoActionError("Workspace unavailable.",403);return id};\n'+marker,`${p} context insert`);
 }
 const sig=`export async function ${exportName}(op:VivitoActionOp,args:any,role:string,userId:string){`;
 const replacement=`export async function ${exportName}(op:VivitoActionOp,args:any,role:string,userId:string,workspaceId:string){if(!workspaceId)throw new VivitoActionError("Workspace unavailable.",403);return workspaceContext.run(workspaceId,async()=>{`;
 s=once(s,sig,replacement,`${p} export signature`);
 const trimmed=s.trimEnd();
 if(!trimmed.endsWith('}'))throw new Error(`${p} does not end with function close`);
 s=trimmed.slice(0,-1)+'})}\n';
 if(s.includes('const W="default"')||/\bW\b/.test(s))throw new Error(`${p} still contains W tenant symbol`);
 write(p,s);
}

hardenExecutor('lib/vivito/executor.ts','executeVivitoAction');
hardenExecutor('lib/vivito/executor-extended.ts','executeVivitoExtendedAction');
hardenExecutor('lib/vivito/executor-operator.ts','executeVivitoOperatorAction');

// Plan runtime: explicit workspace boundary.
{
 const p='lib/vivito/plan-runtime.ts';let s=fs.readFileSync(p,'utf8');
 s=once(s,'const W="default";\n','', 'plan runtime W');
 s=once(s,' userId:string;\n requestId:string;',' userId:string;\n workspaceId:string;\n requestId:string;','plan workspace input');
 s=once(s,' const {steps,decisions,role,userId,requestId,executeStep,applyExternal}=input;',' const {steps,decisions,role,userId,workspaceId,requestId,executeStep,applyExternal}=input;if(!workspaceId)throw new VivitoActionError("Workspace unavailable.",403);','plan destructure');
 s=s.replaceAll('${W}','${workspaceId}').replaceAll('workspaceId:W','workspaceId');
 if(s.includes('const W="default"')||s.includes('${W}'))throw new Error('Plan runtime still fixed tenant');write(p,s);
}

// Memory: explicit workspace on every persistence/load boundary.
{
 const p='lib/vivito/memory.ts';let s=fs.readFileSync(p,'utf8');
 s=once(s,'const W="default";\n','', 'memory W');
 s=once(s,'},userId:string,role:string):Promise<VivitoMemory>{','},userId:string,role:string,workspaceId:string):Promise<VivitoMemory>{','save memory signature');
 s=once(s,'export async function forgetVivitoMemory(queryRaw:string,userId:string,role:string,authorizedClientIds:string[]){','export async function forgetVivitoMemory(queryRaw:string,userId:string,role:string,authorizedClientIds:string[],workspaceId:string){if(!workspaceId)throw new Error("Workspace unavailable.");','forget memory signature');
 s=once(s,'export async function loadVivitoMemories(userId:string,role:string,authorizedClientIds:string[],limit=60):Promise<VivitoMemory[]>{','export async function loadVivitoMemories(userId:string,role:string,authorizedClientIds:string[],workspaceId:string,limit=60):Promise<VivitoMemory[]>{if(!workspaceId)throw new Error("Workspace unavailable.");','load memory signature');
 s=s.replace('const text=validateVivitoMemoryText(input.text);','if(!workspaceId)throw new Error("Workspace unavailable.");const text=validateVivitoMemoryText(input.text);');
 s=s.replace('loadVivitoMemories(userId,role,authorizedClientIds,200)','loadVivitoMemories(userId,role,authorizedClientIds,workspaceId,200)');
 s=s.replaceAll('${W}','${workspaceId}').replaceAll('workspaceId:W','workspaceId');
 if(s.includes('const W="default"')||s.includes('${W}'))throw new Error('Memory still fixed tenant');write(p,s);
}

// Assistant advisor caller -> workspace-aware memory.
{
 const p='app/api/assistant/route.ts';let s=fs.readFileSync(p,'utf8');
 s=s.replace('loadVivitoMemories(userId,role,ids)','loadVivitoMemories(userId,role,ids,workspaceId)');
 s=s.replace('saveVivitoMemory({kind:memoryPlan.kind,scopeType:memoryPlan.scopeType,scopeId,text:memoryPlan.text},userId,role)','saveVivitoMemory({kind:memoryPlan.kind,scopeType:memoryPlan.scopeType,scopeId,text:memoryPlan.text},userId,role,workspaceId)');
 s=s.replace('forgetVivitoMemory(memoryPlan.query,userId,role,ids)','forgetVivitoMemory(memoryPlan.query,userId,role,ids,workspaceId)');
 write(p,s);
}

// Action API: explicit workspace through execution, plan, external writes, audit/idempotency.
{
 const p='app/api/assistant/actions/route.ts';let s=fs.readFileSync(p,'utf8');
 s=once(s,'const W="default";\n','', 'actions W');
 s=once(s,'async function execute(op:VivitoActionOp,args:any,role:string,userId:string):Promise<VivitoExecutionResult>{if(isVivitoOperatorAction(op))return executeVivitoOperatorAction(op,args||{},role,userId) as Promise<VivitoExecutionResult>;return isVivitoExtendedAction(op)?executeVivitoExtendedAction(op,args||{},role,userId) as Promise<VivitoExecutionResult>:executeVivitoAction(op,args||{},role,userId) as Promise<VivitoExecutionResult>}','async function execute(op:VivitoActionOp,args:any,role:string,userId:string,workspaceId:string):Promise<VivitoExecutionResult>{if(isVivitoOperatorAction(op))return executeVivitoOperatorAction(op,args||{},role,userId,workspaceId) as Promise<VivitoExecutionResult>;return isVivitoExtendedAction(op)?executeVivitoExtendedAction(op,args||{},role,userId,workspaceId) as Promise<VivitoExecutionResult>:executeVivitoAction(op,args||{},role,userId,workspaceId) as Promise<VivitoExecutionResult>}', 'execute dispatcher');
 s=s.replace('async function applyExternalCampaignWrite(op:VivitoActionOp,args:any,result:VivitoExecutionResult,userId:string){','async function applyExternalCampaignWrite(op:VivitoActionOp,args:any,result:VivitoExecutionResult,userId:string,workspaceId:string){if(!workspaceId)throw new VivitoActionError("Workspace unavailable.",403);');
 s=s.replaceAll('${W}','${workspaceId}').replaceAll('workspaceId:W','workspaceId');
 s=once(s,' const role=String((session.user as any).role||""),userId=String((session.user as any).id||"");',' const role=String((session.user as any).role||""),userId=String((session.user as any).id||""),workspaceId=String((session.user as any).workspaceId||"");if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403,headers:noStore});','action POST workspace');
 s=s.replace('executeVivitoPlanRuntime({steps:normalized,decisions,role,userId,requestId:rootId,executeStep:execute,applyExternal:applyExternalCampaignWrite})','executeVivitoPlanRuntime({steps:normalized,decisions,role,userId,workspaceId,requestId:rootId,executeStep:(op,args,stepRole,stepUserId)=>execute(op,args,stepRole,stepUserId,workspaceId),applyExternal:(op,args,result,stepUserId)=>applyExternalCampaignWrite(op,args,result,stepUserId,workspaceId)})');
 s=s.replace('const result=await execute(op,args,role,userId),external=await applyExternalCampaignWrite(op,args,result,userId)','const result=await execute(op,args,role,userId,workspaceId),external=await applyExternalCampaignWrite(op,args,result,userId,workspaceId)');
 if(s.includes('const W="default"')||s.includes('${W}')||s.includes('workspaceId:W'))throw new Error('Action API still fixed tenant');write(p,s);
}

// Operations audit feed uses authenticated workspace.
{
 const p='app/api/assistant/operations/route.ts';let s=fs.readFileSync(p,'utf8');
 s=once(s,'const W="default";const noStore','const noStore','operations W');
 s=once(s,' const role=String((session.user as any).role||""),userId=String((session.user as any).id||"");',' const role=String((session.user as any).role||""),userId=String((session.user as any).id||""),workspaceId=String((session.user as any).workspaceId||"");if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403,headers:noStore});','operations workspace');
 s=s.replaceAll('${W}','${workspaceId}');if(s.includes('const W="default"')||s.includes('${W}'))throw new Error('Operations still fixed tenant');write(p,s);
}

console.log('VIVITO execution tenant hardening applied.');
