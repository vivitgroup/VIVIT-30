import {VIVITO_ACTION_CATALOG,type VivitoActionOp} from "../lib/vivito/action-engine";
import {decideVivitoApproval} from "../lib/vivito/approval-policy";

const roles=["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"] as const;
const ops=Object.keys(VIVITO_ACTION_CATALOG) as VivitoActionOp[];
const failures:string[]=[];
let checks=0;
for(const role of roles){
  for(const op of ops){
    const allowed=VIVITO_ACTION_CATALOG[op].roles.includes(role);
    const decision=decideVivitoApproval(op,role);
    checks++;
    if(allowed&&decision.mode==="BLOCK")failures.push(`${role}:${op} is catalog-allowed but approval BLOCK`);
    if(!allowed&&decision.mode!=="BLOCK")failures.push(`${role}:${op} is catalog-denied but approval ${decision.mode}`);
  }
}
for(const role of ["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"]){
  const d=decideVivitoApproval("disconnect_integration",role);
  checks++;
  if(d.mode!=="CONFIRM")failures.push(`${role}:disconnect_integration expected CONFIRM, got ${d.mode}`);
}
for(const role of ["ACCOUNT_MANAGER","MEDIA_BUYER"]){
  for(const op of ["create_client","create_task","archive_client","archive_task","generate_report"] as VivitoActionOp[]){
    checks++;
    if(decideVivitoApproval(op,role).mode==="BLOCK")failures.push(`${role}:${op} unexpectedly BLOCK`);
  }
}
if(failures.length){for(const f of failures)console.error(`FAIL ${f}`);console.error(`${checks-failures.length}/${checks} approval alignment checks passed.`);process.exit(1)}
console.log(`${checks}/${checks} VIVITO role approval alignment checks passed.`);
