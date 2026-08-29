import fs from "node:fs";
import {db,sql} from "../lib/db";
import {executeVivitoOperatorAction} from "../lib/vivito/executor-operator";

async function main(){
 fs.mkdirSync('.vivito',{recursive:true});
 const adminId='cert-admin';
 let cases=0;
 type OperatorOp=Parameters<typeof executeVivitoOperatorAction>[0];type OperatorArgs=Parameters<typeof executeVivitoOperatorAction>[1];
 const run=async(op:OperatorOp,args:OperatorArgs)=>{const out=await executeVivitoOperatorAction(op,args,'SUPER_ADMIN',adminId);if(!out?.success)throw new Error(`${op} did not return success`);cases++;return out};
 try{
  await db.execute(sql`insert into workspaces(id,name,slug,plan,currency,max_clients,max_users,is_active,created_at,updated_at) values('default','VIVITO Certification','vivito-certification','ENTERPRISE','EGP',500,500,true,now(),now()) on conflict (id) do nothing`);
  await db.execute(sql`insert into users(id,workspace_id,name,email,password,role,is_active,approval_status,is_workspace_owner,created_at,updated_at) values(${adminId},'default','Certification Admin','cert-admin@vivito.test','not-used','SUPER_ADMIN',true,'APPROVED',true,now(),now()) on conflict (id) do nothing`);
  const names:string[]=[];
  for(let i=0;i<8;i++){
    const name=`Cert User ${i+1}`;names.push(name);
    await run('create_user',{name,email:`cert-user-${i+1}@vivito.test`,role:i%2?'CREATOR':'ACCOUNT_MANAGER'});
  }
  for(let i=0;i<8;i++)await run('update_user',{userName:names[i],phone:`+20100000${String(i).padStart(2,'0')}`});
  for(let i=0;i<8;i++)await run('set_user_active',{userName:names[i],active:false});
  for(let i=0;i<8;i++)await run('set_user_active',{userName:names[i],active:true});
  for(let i=0;i<18;i++)await run('create_referral',{email:`referral-${i+1}@vivito.test`,discountPct:20});
  const users=Array.from(await db.execute(sql`select id,name,is_active from users where workspace_id='default' and email like 'cert-user-%@vivito.test' order by email` ) as unknown as Iterable<{id:string;name:string;is_active:boolean}>);
  const refs=Array.from(await db.execute(sql`select id,referrer_id from referrals where referred_email like 'referral-%@vivito.test'` ) as unknown as Iterable<{id:string;referrer_id:string}>);
  const audits=Array.from(await db.execute(sql`select id from audit_logs where workspace_id='default' and user_id=${adminId} and action like 'vivito_%'` ) as unknown as Iterable<{id:string}>);
  const allActive=users.length===8&&users.every(u=>u.is_active===true);
  const referralOwner=refs.length===18&&refs.every(r=>r.referrer_id===adminId);
  const passed=cases===50&&allActive&&referralOwner&&audits.length>=50;
  const report={passed,cases,userCreates:8,userUpdates:8,deactivations:8,reactivations:8,referrals:18,auditRows:audits.length,allActive,referralOwner,database:"ephemeral-postgres",productionDataUsed:false};
  fs.writeFileSync('.vivito/execution-e2e.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!passed)process.exitCode=1;
 }catch(error){const report={passed:false,cases,error:error instanceof Error?error.message:String(error),database:"ephemeral-postgres",productionDataUsed:false};fs.writeFileSync('.vivito/execution-e2e.json',JSON.stringify(report,null,2));console.error(report);process.exitCode=1}
}
main().catch(error=>{console.error(error);process.exit(1)});
