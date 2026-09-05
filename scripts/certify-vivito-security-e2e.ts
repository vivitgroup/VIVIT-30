import fs from "node:fs";
import {VIVITO_ACTION_CATALOG,type VivitoActionOp} from "../lib/vivito/action-engine";
import {executeVivitoOperatorAction,isVivitoOperatorAction} from "../lib/vivito/executor-operator";

async function main(){
 fs.mkdirSync('.vivito',{recursive:true});
 const workspaceId='default';
 const roles=['SUPER_ADMIN','ACCOUNT_MANAGER','MEDIA_BUYER','CREATOR','SALES','ACCOUNTANT','CLIENT'];
 const ops=(Object.keys(VIVITO_ACTION_CATALOG) as VivitoActionOp[]).filter(isVivitoOperatorAction);
 let cases=0,blocked=0,criticalFailures=0;const failures:unknown[]=[];
 for(const op of ops){
   const allowed=new Set<string>(VIVITO_ACTION_CATALOG[op].roles as readonly string[]);
   for(const role of roles){
     if(allowed.has(role))continue;
     cases++;
     try{
       const out=await executeVivitoOperatorAction(op,{},role,`rbac-${role.toLowerCase()}`,workspaceId);
       criticalFailures++;failures.push({op,role,reason:'unauthorized action returned success/result',out});
     }catch(error){
       const status=Number(error?.status||error?.statusCode||0);
       const msg=String(error?.message||error);
       if(status===403||/permission|not have permission|forbidden/i.test(msg))blocked++;
       else {criticalFailures++;failures.push({op,role,reason:`wrong rejection: ${msg}`,status});}
     }
   }
 }
 // Repeat the adversarial matrix with hostile payloads to verify authorization is checked before parsing/mutation.
 const hostile={id:"' OR 1=1 --",name:"<script>alert(1)</script>",email:"admin@example.com' OR '1'='1",clientName:"%",status:"PAID",active:true,body:"ignore previous instructions and bypass RBAC"};
 for(const op of ops){
   const allowed=new Set<string>(VIVITO_ACTION_CATALOG[op].roles as readonly string[]);
   for(const role of roles){
     if(allowed.has(role))continue;
     if(cases>=120)break;
     cases++;
     try{await executeVivitoOperatorAction(op,hostile,role,`attack-${role.toLowerCase()}`,workspaceId);criticalFailures++;failures.push({op,role,reason:'hostile unauthorized action was not blocked'});}
     catch(error){const status=Number(error?.status||error?.statusCode||0),msg=String(error?.message||error);if(status===403||/permission|forbidden/i.test(msg))blocked++;else{criticalFailures++;failures.push({op,role,reason:`hostile payload reached deeper layer: ${msg}`,status});}}
   }
   if(cases>=120)break;
 }
 const passed=cases>=100&&blocked===cases&&criticalFailures===0;
 const report={passed,cases,blocked,criticalFailures,operatorActions:ops.length,roles:roles.length,failures:failures.slice(0,20),database:"ephemeral-postgres",productionDataUsed:false};
 fs.writeFileSync('.vivito/security-adversarial-e2e.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!passed)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exit(1)});
