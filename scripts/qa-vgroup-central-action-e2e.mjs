import {randomUUID} from "node:crypto";
import postgres from "postgres";

const baseUrl=process.env.BASE_URL||"http://127.0.0.1:3000";
const databaseUrl=process.env.VGROUP_DATABASE_URL;
const supabaseUrl=process.env.VGROUP_SUPABASE_URL;
const serviceRoleKey=process.env.VGROUP_SUPABASE_SERVICE_ROLE_KEY;

for(const [name,value] of Object.entries({
  VGROUP_DATABASE_URL:databaseUrl,
  VGROUP_SUPABASE_URL:supabaseUrl,
  VGROUP_SUPABASE_SERVICE_ROLE_KEY:serviceRoleKey,
})){
  if(!value)throw new Error(`missing_required_env:${name}`);
}

const sql=postgres(databaseUrl,{ssl:false,max:1,prepare:false});
const runId=String(process.env.GITHUB_RUN_ID||Date.now());
const suffix=`${runId}-${randomUUID().slice(0,8)}`;
const email=`qa-vgroup-central-${suffix}@example.com`;
const password=`Qa!${randomUUID()}aA1`;

let externalAuthId="";
let groupUserId="";
let requestId="";

function assert(condition,message){if(!condition)throw new Error(message)}

async function createAuthUser(){
  const response=await fetch(`${supabaseUrl}/auth/v1/admin/users`,{
    method:"POST",
    headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({email,password,email_confirm:true,user_metadata:{qa:true,persona:"vgroup-central-real-action"}}),
  });
  const body=await response.json().catch(()=>({}));
  assert(response.ok,`supabase_admin_create_failed:${response.status}`);
  externalAuthId=body.id||body.user?.id||"";
  assert(externalAuthId,"supabase_user_id_missing");
}

async function login(){
  const response=await fetch(`${baseUrl}/api/vgroup/auth/login`,{
    method:"POST",
    headers:{"Content-Type":"application/json","x-forwarded-for":`127.0.0.${Math.floor(Math.random()*200)+20}`},
    body:JSON.stringify({email,password}),
    redirect:"manual",
  });
  assert(response.status===200,`login_failed:${response.status}`);
  const setCookies=typeof response.headers.getSetCookie==="function"?response.headers.getSetCookie():[response.headers.get("set-cookie")].filter(Boolean);
  const cookie=setCookies.map(value=>value.split(";",1)[0]).join("; ");
  assert(cookie.includes("vgroup_access_token="),"access_cookie_missing");
  return cookie;
}

async function requestMarketingAccess(cookie){
  const form=new FormData();
  form.set("workspace","marketing");
  return fetch(`${baseUrl}/api/vgroup/access-requests`,{
    method:"POST",
    headers:{Cookie:cookie,Origin:baseUrl},
    body:form,
    redirect:"manual",
  });
}

async function main(){
  let [marketing]=await sql`select id::text from vgroup.business_units where code='marketing' limit 1`;
  if(!marketing){
    [marketing]=await sql`insert into vgroup.business_units(code,display_name_ar,display_name_en,status) values('marketing','التسويق','Marketing','active') returning id::text`;
  }else{
    await sql`update vgroup.business_units set status='active',updated_at=now() where id=${marketing.id}::uuid`;
  }

  await createAuthUser();
  const [groupUser]=await sql`
    insert into vgroup.users(external_auth_id,email,full_name,preferred_language,status)
    values(${externalAuthId},${email},'QA VGroup Central User','en','active')
    returning id::text`;
  groupUserId=groupUser.id;

  const cookie=await login();
  console.log("PASS Central VGroup user authenticated with a real ephemeral Supabase session");

  const first=await requestMarketingAccess(cookie);
  assert(first.status===303,`central_access_request_expected_303_got_${first.status}`);
  const location=first.headers.get("location")||"";
  assert(location.includes("/group/access?workspace=marketing"),`central_access_redirect_unexpected:${location}`);
  assert(location.includes("requested=1"),`central_access_redirect_missing_requested_flag:${location}`);
  console.log("PASS Central VGroup access-request action returned the expected redirect");

  const [row]=await sql`
    select id::text,business_unit_id::text,entity_type,entity_id::text,action,requested_by::text,status,metadata
    from vgroup.approval_requests
    where requested_by=${groupUserId}::uuid and entity_type='workspace_access' and action='request_marketing_access'
    order by requested_at desc limit 1`;
  assert(row?.id,"central_access_request_db_row_missing");
  requestId=row.id;
  assert(row.business_unit_id===marketing.id,"central_access_request_business_unit_mismatch");
  assert(row.entity_id===groupUserId,"central_access_request_entity_mismatch");
  assert(row.requested_by===groupUserId,"central_access_request_actor_mismatch");
  assert(row.status==="pending","central_access_request_status_mismatch");
  assert(row.metadata?.workspace==="marketing","central_access_request_metadata_mismatch");
  console.log("PASS Central VGroup action persisted a pending approval request with correct actor and business-unit scope");

  const second=await requestMarketingAccess(cookie);
  assert(second.status===303,`central_access_repeat_expected_303_got_${second.status}`);
  const [countRow]=await sql`
    select count(*)::int as count from vgroup.approval_requests
    where requested_by=${groupUserId}::uuid and entity_type='workspace_access' and action='request_marketing_access' and status='pending'`;
  assert(Number(countRow?.count)===1,`central_access_request_not_idempotent:${countRow?.count}`);
  console.log("PASS repeated Central VGroup access request is idempotent and does not duplicate the pending action");

  console.log("AUTHENTICATED_VGROUP_CENTRAL_ACTION_E2E: PASS (ACCESS REQUEST / DB SCOPE / IDEMPOTENCY)");
}

async function cleanup(){
  try{
    if(groupUserId){
      await sql`delete from vgroup.approval_requests where requested_by=${groupUserId}::uuid or entity_id=${groupUserId}::uuid`;
      await sql`delete from vgroup.users where id=${groupUserId}::uuid`;
    }else if(requestId){
      await sql`delete from vgroup.approval_requests where id=${requestId}::uuid`;
    }
  }catch(error){
    console.error("VGROUP_CENTRAL_ACTION_E2E_DB_CLEANUP_WARNING",error instanceof Error?error.message:String(error));
  }
  if(externalAuthId){
    try{
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${externalAuthId}`,{
        method:"DELETE",
        headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`},
      });
    }catch(error){
      console.error("VGROUP_CENTRAL_ACTION_E2E_AUTH_CLEANUP_WARNING",error instanceof Error?error.message:String(error));
    }
  }
}

try{
  await main();
}catch(error){
  console.error("AUTHENTICATED_VGROUP_CENTRAL_ACTION_E2E: FAIL",error instanceof Error?error.message:String(error));
  throw error;
}finally{
  await cleanup();
  await sql.end({timeout:2});
}
