import "./cto-vivito-tenant-hardening.mjs";
import fs from "node:fs";

function replaceOnce(s,a,b,label){if(!s.includes(a))throw new Error(`Missing ${label}`);return s.replace(a,b)}

// Avoid collision with existing local variables named `ws` while preserving request-local context.
for(const p of ["lib/vivito/executor.ts","lib/vivito/executor-extended.ts","lib/vivito/executor-operator.ts"]){
 let s=fs.readFileSync(p,"utf8");
 s=s.replace('const ws=()=>','const tenantId=()=>').replaceAll('ws()','tenantId()');
 if(!s.includes('const tenantId=()=>'))throw new Error(`${p}: tenant context helper missing`);
 fs.writeFileSync(p,s);
}

// Rollback inverse execution must stay in the same authenticated workspace.
{
 const p="app/api/assistant/rollback/route.ts";let s=fs.readFileSync(p,"utf8");
 s=replaceOnce(s,'executeVivitoOperatorAction(inverse.op,inverse.args,s.role,s.userId)','executeVivitoOperatorAction(inverse.op,inverse.args,s.role,s.userId,s.workspaceId)',"rollback operator workspace");
 s=replaceOnce(s,'executeVivitoAction(inverse.op,inverse.args,s.role,s.userId)','executeVivitoAction(inverse.op,inverse.args,s.role,s.userId,s.workspaceId)',"rollback base workspace");
 fs.writeFileSync(p,s);
}

// Direct runtime already has an explicit workspace on every event; thread it to executors.
{
 const p="lib/vivito/direct-runtime.ts";let s=fs.readFileSync(p,"utf8");
 s=replaceOnce(s,'async function execute(op:VivitoActionOp,args:any,role:string,userId:string){return isVivitoOperatorAction(op)?executeVivitoOperatorAction(op,args,role,userId):executeVivitoAction(op,args,role,userId)}','async function execute(op:VivitoActionOp,args:any,role:string,userId:string,workspaceId:string){if(!workspaceId)throw new Error("direct-workspace-required");return isVivitoOperatorAction(op)?executeVivitoOperatorAction(op,args,role,userId,workspaceId):executeVivitoAction(op,args,role,userId,workspaceId)}',"direct execute signature");
 s=replaceOnce(s,'execute(input.op,input.args,String(input.actor.role),String(input.actor.id))','execute(input.op,input.args,String(input.actor.role),String(input.actor.id),workspaceId)',"direct auto execute workspace");
 s=replaceOnce(s,'execute(op,j(e.action_args),String(actor.role),String(actor.id))','execute(op,j(e.action_args),String(actor.role),String(actor.id),workspaceId)',"direct retry workspace");
 s=replaceOnce(s,'execute(op,j(e.action_args),role,userId)','execute(op,j(e.action_args),role,userId,workspaceId)',"direct confirm workspace");
 fs.writeFileSync(p,s);
}

console.log("VIVITO tenant hardening V2 caller fixes applied.");
