import {randomUUID} from "node:crypto";
import postgres from "postgres";

const baseUrl=process.env.BASE_URL||"http://127.0.0.1:3000";
const databaseUrl=process.env.DATABASE_URL;
const vgroupDatabaseUrl=process.env.VGROUP_DATABASE_URL;
const supabaseUrl=process.env.VGROUP_SUPABASE_URL;
const serviceRoleKey=process.env.VGROUP_SUPABASE_SERVICE_ROLE_KEY;
const receiverDatabaseUrl=process.env.QA_SUPABASE_DB_URL;
for(const [name,value] of Object.entries({DATABASE_URL:databaseUrl,VGROUP_DATABASE_URL:vgroupDatabaseUrl,VGROUP_SUPABASE_URL:supabaseUrl,VGROUP_SUPABASE_SERVICE_ROLE_KEY:serviceRoleKey,QA_SUPABASE_DB_URL:receiverDatabaseUrl}))if(!value)throw new Error(`missing_required_env:${name}`);

const primarySql=postgres(databaseUrl,{ssl:false,max:1,prepare:false});
const groupSql=postgres(vgroupDatabaseUrl,{ssl:false,max:1,prepare:false});
const receiverSql=postgres(receiverDatabaseUrl,{ssl:false,max:1,prepare:false});
const runId=String(process.env.GITHUB_RUN_ID||Date.now());
const suffix=randomUUID().slice(0,8);
const email=`qa-marketing-actions-${runId}-${suffix}@example.com`;
const password=`Qa!${randomUUID()}aA1`;
const workspaceId=`qa-marketing-${runId}-${suffix}`;
const legacyUserId=`qa-marketing-user-${runId}-${suffix}`;
const companyName=`QA Marketing Client ${runId} ${suffix}`;
const taskId=`qa-marketing-create-client-${runId}-${suffix}`;
const receiptId=`vivito:vgroup:${taskId}`;
const created={externalAuthId:null,groupUserId:null,clientId:null};
const authHeaders={apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`};
function assert(condition,message){if(!condition)throw new Error(message)}

async function request(path,{cookie,method="GET",body,headers={}}={}){
  const requestHeaders={...headers,...(cookie?{Cookie:cookie}:{})};
  const options={method,headers:requestHeaders,redirect:"manual"};
  if(body!==undefined){options.body=typeof body==="string"?body:JSON.stringify(body);if(!requestHeaders["Content-Type"])requestHeaders["Content-Type"]="application/json";}
  return fetch(`${baseUrl}${path}`,options);
}

async function prepareReceiverSchema(){
  await receiverSql`create table if not exists public.workspaces (id text primary key,is_active boolean not null default true)`;
  await receiverSql`create table if not exists public.users (id text primary key,name text not null,email text not null unique,role text not null,workspace_id text not null,is_active boolean not null default true,approval_status text not null default 'APPROVED')`;
  await receiverSql`create table if not exists public.group_handoff_nonces (nonce_hash text primary key,group_user_id text not null,email text not null,expires_at timestamptz not null)`;
  await receiverSql.unsafe("grant usage on schema public to service_role");
  await receiverSql.unsafe("grant select,insert,update,delete on public.workspaces,public.users,public.group_handoff_nonces to service_role");
  await receiverSql.unsafe("notify pgrst, 'reload schema'");
  for(let attempt=0;attempt<20;attempt++){
    const response=await fetch(`${supabaseUrl}/rest/v1/workspaces?select=id&limit=1`,{headers:authHeaders});
    if(response.ok)return;
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error("marketing_receiver_schema_not_ready");
}

async function createSupabaseUser(){
  const response=await fetch(`${supabaseUrl}/auth/v1/admin/users`,{method:"POST",headers:{...authHeaders,"Content-Type":"application/json"},body:JSON.stringify({email,password,email_confirm:true,user_metadata:{qa:true,scope:"marketing-actions"}})});
  const body=await response.json().catch(()=>({}));
  assert(response.ok,`supabase_admin_create_failed:${response.status}:${JSON.stringify(body)}`);
  created.externalAuthId=body.id||body.user?.id;
  assert(created.externalAuthId,"supabase_user_id_missing");
}

async function seedGroupIdentity(){
  const [bu]=await groupSql`select id from vgroup.business_units where code='marketing' and status='active' limit 1`;
  assert(bu?.id,"marketing_business_unit_missing");
  let [role]=await groupSql`select id from vgroup.roles where code='GROUP_SUPER_ADMIN' limit 1`;
  if(!role)[role]=await groupSql`insert into vgroup.roles(code,business_unit_id,description,is_system) values('GROUP_SUPER_ADMIN',${bu.id}::uuid,'QA Marketing action E2E',true) returning id`;
  const [user]=await groupSql`insert into vgroup.users(external_auth_id,email,full_name,preferred_language,status) values(${created.externalAuthId},${email},'QA Marketing Actions','en','active') returning id`;
  created.groupUserId=user.id;
  await groupSql`insert into vgroup.user_business_unit_roles(user_id,business_unit_id,role_id,status) values(${user.id}::uuid,${bu.id}::uuid,${role.id}::uuid,'active') on conflict do nothing`;
}

async function seedMarketingIdentity(){
  await primarySql`insert into workspaces(id,name,slug,plan,is_active) values(${workspaceId},${`QA Marketing ${runId} ${suffix}`},${`qa-marketing-${runId}-${suffix}`},'FREE',true)`;
  await primarySql`insert into users(id,workspace_id,name,email,password,role,is_active,approval_status,is_workspace_owner) values(${legacyUserId},${workspaceId},'QA Marketing Actions',${email},'qa-not-used','SUPER_ADMIN',true,'APPROVED',true)`;
  await receiverSql`insert into public.workspaces(id,is_active) values(${workspaceId},true)`;
  await receiverSql`insert into public.users(id,name,email,role,workspace_id,is_active,approval_status) values(${legacyUserId},'QA Marketing Actions',${email},'SUPER_ADMIN',${workspaceId},true,'APPROVED')`;
}

async function login(){
  const response=await request("/api/vgroup/auth/login",{method:"POST",headers:{"Content-Type":"application/json","x-forwarded-for":"127.0.0.220"},body:{email,password}});
  const body=await response.json().catch(()=>({}));
  assert(response.status===200,`login_failed:${response.status}:${JSON.stringify(body)}`);
  const setCookies=typeof response.headers.getSetCookie==="function"?response.headers.getSetCookie():[response.headers.get("set-cookie")].filter(Boolean);
  const cookie=setCookies.map(value=>value.split(";",1)[0]).join("; ");
  assert(cookie.includes("vgroup_access_token="),"access_cookie_missing");
  return cookie;
}

async function runMarketingAction(cookie){
  const payload={op:"create_client",args:{companyName,industry:"QA Marketing",currency:"EGP"}};
  const first=await request("/api/integrations/vgroup-vivito-marketing",{cookie,method:"POST",headers:{"x-vivito-task-id":taskId},body:payload});
  const firstBody=await first.json().catch(()=>({}));
  assert(first.status===200,`marketing_action_expected_200_got_${first.status}:${JSON.stringify(firstBody)}`);
  assert(firstBody.success===true&&firstBody.action==="create_client","marketing_action_response_mismatch");
  created.clientId=firstBody.result?.entityId;
  assert(created.clientId,"marketing_client_id_missing");

  const [client]=await primarySql`select id,workspace_id,company_name,is_active from clients where id=${created.clientId} limit 1`;
  assert(client?.workspace_id===workspaceId&&client.company_name===companyName&&client.is_active===true,"marketing_client_side_effect_mismatch");
  const [receipt]=await primarySql`select action,new_values from audit_logs where id=${receiptId} limit 1`;
  assert(receipt?.action==="vivito_group_action_executed","marketing_execution_receipt_missing");
  console.log("PASS Marketing VGroup handoff executes a real create_client action and persists the client");

  const duplicate=await request("/api/integrations/vgroup-vivito-marketing",{cookie,method:"POST",headers:{"x-vivito-task-id":taskId},body:payload});
  const duplicateBody=await duplicate.json().catch(()=>({}));
  assert(duplicate.status===200&&duplicateBody.success===true&&duplicateBody.duplicate===true,`marketing_duplicate_receipt_failed:${duplicate.status}:${JSON.stringify(duplicateBody)}`);
  const [countRow]=await primarySql`select count(*)::int as count from clients where workspace_id=${workspaceId} and company_name=${companyName}`;
  assert(Number(countRow?.count)===1,"marketing_duplicate_executed_twice");
  console.log("PASS Marketing task receipt is idempotent and prevents duplicate execution");
}

async function cleanup(){
  try{
    if(created.clientId)await primarySql`delete from audit_logs where entity_id=${created.clientId}`;
    await primarySql`delete from audit_logs where id=${receiptId}`;
    if(created.clientId)await primarySql`delete from clients where id=${created.clientId}`;
    await primarySql`delete from users where id=${legacyUserId}`;
    await primarySql`delete from workspaces where id=${workspaceId}`;
    await receiverSql`delete from public.group_handoff_nonces where email=${email}`;
    await receiverSql`delete from public.users where id=${legacyUserId}`;
    await receiverSql`delete from public.workspaces where id=${workspaceId}`;
    if(created.groupUserId)await groupSql`delete from vgroup.users where id=${created.groupUserId}::uuid`;
    if(created.externalAuthId)await fetch(`${supabaseUrl}/auth/v1/admin/users/${created.externalAuthId}`,{method:"DELETE",headers:authHeaders}).catch(()=>undefined);
  }catch(error){console.warn("WARN Marketing action E2E cleanup was incomplete; databases are ephemeral",error instanceof Error?error.message:String(error));}
}

let cookie="";
try{
  await prepareReceiverSchema();
  await createSupabaseUser();
  await seedGroupIdentity();
  await seedMarketingIdentity();
  cookie=await login();
  await runMarketingAction(cookie);
  console.log("PASS Marketing action-level authenticated E2E complete");
}finally{
  await cleanup();
  await Promise.all([primarySql.end({timeout:1}),groupSql.end({timeout:1}),receiverSql.end({timeout:1})]);
}
