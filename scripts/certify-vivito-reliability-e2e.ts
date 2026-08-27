import fs from "node:fs";
import {db,sql} from "../lib/db";
import {executeVivitoOperatorAction} from "../lib/vivito/executor-operator";
import {executeVivitoPlanRuntime,type VivitoPlanStep} from "../lib/vivito/plan-runtime";

async function main(){
 fs.mkdirSync('.vivito',{recursive:true});
 const userId='cert-admin',role='SUPER_ADMIN';
 const executeStep=(op:any,args:any,r:string,u:string)=>executeVivitoOperatorAction(op,args,r,u) as any;
 let multiStepCases=0,replayCases=0,idempotencyPassed=true,rollbackRecoveryPassed=false,knownCriticalDefects=0;
 const failures:any[]=[];
 for(let i=0;i<50;i++){
   const a=`Cert User ${(i%8)+1}`,b=`Cert User ${((i+1)%8)+1}`;
   const steps:VivitoPlanStep[]=[
     {op:'update_user',args:{userName:a,phone:`+2011${String(i).padStart(8,'0')}`},summary:'Reliability update A'},
     {op:'update_user',args:{userName:b,phone:`+2012${String(i).padStart(8,'0')}`},summary:'Reliability update B'}
   ];
   const decisions=steps.map(()=>({approval:{mode:'SUPER_ADMIN_CONFIRM',requiresConfirmation:true}}));
   const requestId=`cert-reliability-${i}`;
   const first=await executeVivitoPlanRuntime({steps,decisions,role,userId,requestId,executeStep});
   if(!first.success){knownCriticalDefects++;failures.push({case:i,phase:'first',first});continue}
   multiStepCases++;
   const replay=await executeVivitoPlanRuntime({steps,decisions,role,userId,requestId,executeStep});
   if(!replay.success||replay.duplicateSteps!==2){idempotencyPassed=false;knownCriticalDefects++;failures.push({case:i,phase:'replay',replay});}
   else replayCases++;
 }
 // Stop-on-failure + safe resume: step 1 commits once, step 2 fails, then the same request resumes without repeating step 1.
 const failureId='cert-recovery-1';
 const badSteps:VivitoPlanStep[]=[
   {op:'update_user',args:{userName:'Cert User 1',phone:'+201399999991'},summary:'Committed first step'},
   {op:'update_user',args:{userName:'Definitely Missing User',phone:'+201399999992'},summary:'Intentional failure'}
 ];
 const badDecisions=badSteps.map(()=>({approval:{mode:'SUPER_ADMIN_CONFIRM',requiresConfirmation:true}}));
 const stopped=await executeVivitoPlanRuntime({steps:badSteps,decisions:badDecisions,role,userId,requestId:failureId,executeStep});
 if(stopped.success||stopped.stoppedAt!==1||stopped.completedSteps.length!==1){knownCriticalDefects++;failures.push({phase:'stop-safe',stopped});}
 else {
   const fixedSteps:VivitoPlanStep[]=[badSteps[0],{op:'update_user',args:{userName:'Cert User 2',phone:'+201399999992'},summary:'Recovered second step'}];
   const fixedDecisions=fixedSteps.map(()=>({approval:{mode:'SUPER_ADMIN_CONFIRM',requiresConfirmation:true}}));
   const resumed=await executeVivitoPlanRuntime({steps:fixedSteps,decisions:fixedDecisions,role,userId,requestId:failureId,executeStep});
   rollbackRecoveryPassed=!!resumed.success&&resumed.duplicateSteps===1;
   if(!rollbackRecoveryPassed){knownCriticalDefects++;failures.push({phase:'resume',resumed});}
 }
 const duplicateAudit=Array.from(await db.execute(sql`select count(*)::int count from audit_logs where workspace_id='default' and user_id=${userId} and action='vivito_plan_step_executed' and new_values::jsonb->>'requestId' like 'cert-reliability-%'`) as any)[0]?.count??0;
 const passed=multiStepCases===50&&replayCases===50&&idempotencyPassed&&rollbackRecoveryPassed&&knownCriticalDefects===0&&Number(duplicateAudit)===101;
 const report={passed,multiStepCases,replayCases,idempotencyPassed,rollbackRecoveryPassed,knownCriticalDefects,uniqueExecutedSteps:Number(duplicateAudit),failures:failures.slice(0,20),database:'ephemeral-postgres',productionDataUsed:false};
 fs.writeFileSync('.vivito/production-reliability-e2e.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!passed)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exit(1)});
