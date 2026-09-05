import {randomUUID} from "node:crypto";
import postgres from "postgres";

const baseUrl=process.env.BASE_URL||"http://127.0.0.1:3000";
const databaseUrl=process.env.VGROUP_DATABASE_URL;
const supabaseUrl=process.env.VGROUP_SUPABASE_URL;
const publishableKey=process.env.VGROUP_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey=process.env.VGROUP_SUPABASE_SERVICE_ROLE_KEY;

for(const [name,value] of Object.entries({
  VGROUP_DATABASE_URL:databaseUrl,
  VGROUP_SUPABASE_URL:supabaseUrl,
  VGROUP_SUPABASE_PUBLISHABLE_KEY:publishableKey,
  VGROUP_SUPABASE_SERVICE_ROLE_KEY:serviceRoleKey,
})){
  if(!value)throw new Error(`missing_required_env:${name}`);
}

const sql=postgres(databaseUrl,{ssl:false,max:1,prepare:false});
const runId=String(process.env.GITHUB_RUN_ID||Date.now());
const suffix=`${runId}-${randomUUID().slice(0,8)}`;
const email=`qa-tech-action-${suffix}@example.com`;
const password=`Qa!${randomUUID()}aA1`;
const projectName=`QA TECH Project ${suffix}`;
const clientEmail=`qa-tech-client-${suffix}@example.com`;

let externalAuthId="";
let groupUserId="";
let clientId="";
let projectId="";
let timesheetId="";

function assert(condition,message){if(!condition)throw new Error(message)}
function isoDate(offsetDays=0){const d=new Date();d.setUTCDate(d.getUTCDate()+offsetDays);return d.toISOString().slice(0,10)}

async function ensureRole(code,businessUnitId){
  let [row]=await sql`select id::text from vgroup.roles where code=${code} and business_unit_id=${businessUnitId}::uuid limit 1`;
  if(!row)[row]=await sql`insert into vgroup.roles(code,business_unit_id,description,is_system) values(${code},${businessUnitId}::uuid,'QA Tech real action E2E',true) returning id::text`;
  return row.id;
}

async function ensurePermission(module,action,businessUnitId){
  let [row]=await sql`select id::text from vgroup.permissions where module=${module} and action=${action} and business_unit_id=${businessUnitId}::uuid limit 1`;
  if(!row)[row]=await sql`insert into vgroup.permissions(module,action,business_unit_id) values(${module},${action},${businessUnitId}::uuid) returning id::text`;
  return row.id;
}

async function grant(roleId,permissionId){
  const [existing]=await sql`select id from vgroup.role_permissions where role_id=${roleId}::uuid and permission_id=${permissionId}::uuid limit 1`;
  if(!existing)await sql`insert into vgroup.role_permissions(role_id,permission_id) values(${roleId}::uuid,${permissionId}::uuid)`;
}

async function createAuthUser(){
  const response=await fetch(`${supabaseUrl}/auth/v1/admin/users`,{
    method:"POST",
    headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({email,password,email_confirm:true,user_metadata:{qa:true,persona:"tech-real-action"}}),
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

async function requestJson(path,{cookie,method="GET",body}={}){
  const headers={...(cookie?{Cookie:cookie}:{}),...(body!==undefined?{"Content-Type":"application/json"}:{})};
  const response=await fetch(`${baseUrl}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});
  const payload=await response.json().catch(async()=>({raw:await response.text().catch(()=>"")}));
  return {status:response.status,body:payload};
}

async function main(){
  const [techBu]=await sql`select id::text from vgroup.business_units where code='tech' and status='active' limit 1`;
  assert(techBu?.id,"tech_business_unit_unavailable");

  const roleId=await ensureRole("TECH_ADMIN",techBu.id);
  for(const [module,action] of [["projects","view"],["projects","create"],["projects","update"]]){
    const permissionId=await ensurePermission(module,action,techBu.id);
    await grant(roleId,permissionId);
  }

  await createAuthUser();
  const [groupUser]=await sql`
    insert into vgroup.users(external_auth_id,email,full_name,preferred_language,status)
    values(${externalAuthId},${email},'QA Tech Action Admin','en','active')
    returning id::text`;
  groupUserId=groupUser.id;
  await sql`insert into vgroup.user_business_unit_roles(user_id,business_unit_id,role_id,status) values(${groupUserId}::uuid,${techBu.id}::uuid,${roleId}::uuid,'active')`;

  const [client]=await sql`
    insert into tech.clients(business_unit_id,company_name,contact_name,email,status)
    values(${techBu.id}::uuid,${`QA Tech Client ${suffix}`},'QA Contact',${clientEmail},'active')
    returning id::text`;
  clientId=client.id;

  const cookie=await login();
  console.log("PASS TECH_ADMIN authenticated with a real ephemeral Supabase session");

  const createProject=await requestJson("/api/vgroup/tech/projects",{
    cookie,
    method:"POST",
    body:{
      clientId,
      name:projectName,
      description:"QA authenticated Tech real action",
      projectType:"website",
      currency:"EGP",
      basePrice:25000,
      plannedStart:isoDate(0),
      plannedEnd:isoDate(14),
    },
  });
  assert(createProject.status===201,`project_create_expected_201_got_${createProject.status}:${JSON.stringify(createProject.body)}`);
  projectId=createProject.body?.project?.id||"";
  assert(projectId,"project_create_id_missing");
  assert(createProject.body?.project?.status==="planning",`project_create_status_unexpected:${createProject.body?.project?.status}`);
  console.log("PASS Tech project create action returned 201 with planning status");

  const [projectRow]=await sql`select id::text,client_id::text,business_unit_id::text,name,status,current_price::text from tech.projects where id=${projectId}::uuid limit 1`;
  assert(projectRow?.client_id===clientId,"project_db_client_mismatch");
  assert(projectRow?.business_unit_id===techBu.id,"project_db_business_unit_mismatch");
  assert(projectRow?.name===projectName,"project_db_name_mismatch");
  assert(projectRow?.status==="planning","project_db_status_mismatch");
  assert(Number(projectRow?.current_price)===25000,"project_db_price_mismatch");
  console.log("PASS Tech project side effect persisted in tech.projects with correct business-unit isolation");

  const [auditRow]=await sql`select action,entity_type,entity_id::text,user_id::text from vgroup.audit_logs where action='project.create' and entity_id=${projectId}::uuid limit 1`;
  assert(auditRow?.entity_id===projectId,"project_audit_log_missing");
  assert(auditRow?.user_id===groupUserId,"project_audit_user_mismatch");
  assert(auditRow?.entity_type==="project","project_audit_entity_type_mismatch");
  console.log("PASS project.create audit trail persisted for the authenticated Tech actor");

  const createTimesheet=await requestJson("/api/vgroup/tech/operations",{
    cookie,
    method:"POST",
    body:{
      operation:"timesheet",
      projectId,
      workDate:isoDate(0),
      hours:2.5,
      hourlyCost:500,
      billable:true,
      description:"QA Tech real action timesheet",
    },
  });
  assert(createTimesheet.status===201,`timesheet_create_expected_201_got_${createTimesheet.status}:${JSON.stringify(createTimesheet.body)}`);
  timesheetId=createTimesheet.body?.id||"";
  assert(timesheetId,"timesheet_id_missing");
  assert(createTimesheet.body?.status==="submitted",`timesheet_status_unexpected:${createTimesheet.body?.status}`);
  console.log("PASS Tech operations timesheet action returned 201 with submitted status");

  const [timesheetRow]=await sql`select id::text,project_id::text,user_id::text,hours::text,hourly_cost::text,billable,status from tech.timesheets where id=${timesheetId}::uuid limit 1`;
  assert(timesheetRow?.project_id===projectId,"timesheet_db_project_mismatch");
  assert(timesheetRow?.user_id===groupUserId,"timesheet_db_user_mismatch");
  assert(Number(timesheetRow?.hours)===2.5,"timesheet_db_hours_mismatch");
  assert(Number(timesheetRow?.hourly_cost)===500,"timesheet_db_cost_mismatch");
  assert(timesheetRow?.billable===true,"timesheet_db_billable_mismatch");
  assert(timesheetRow?.status==="submitted","timesheet_db_status_mismatch");
  console.log("PASS Tech timesheet side effect persisted in tech.timesheets for the authenticated actor");

  const listing=await requestJson("/api/vgroup/tech/projects",{cookie});
  assert(listing.status===200,`project_listing_expected_200_got_${listing.status}`);
  assert(Array.isArray(listing.body?.projects)&&listing.body.projects.some(project=>project.id===projectId),"created_project_missing_from_authenticated_listing");
  console.log("PASS authenticated Tech project listing exposes the newly created project");

  console.log("AUTHENTICATED_TECH_ACTION_E2E: PASS (PROJECT CREATE / AUDIT / TIMESHEET / LISTING)");
}

async function cleanup(){
  try{
    if(clientId){
      await sql`delete from vgroup.audit_logs where action='project.create' and entity_id in (select id from tech.projects where client_id=${clientId}::uuid)`;
      await sql`delete from tech.projects where client_id=${clientId}::uuid`;
      await sql`delete from tech.clients where id=${clientId}::uuid`;
    }else if(projectId){
      await sql`delete from vgroup.audit_logs where action='project.create' and entity_id=${projectId}::uuid`;
      await sql`delete from tech.projects where id=${projectId}::uuid`;
    }
    if(groupUserId){
      await sql`delete from vgroup.user_business_unit_roles where user_id=${groupUserId}::uuid`;
      await sql`delete from vgroup.users where id=${groupUserId}::uuid`;
    }
  }catch(error){
    console.error("TECH_ACTION_E2E_DB_CLEANUP_WARNING",error instanceof Error?error.message:String(error));
  }
  if(externalAuthId){
    try{
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${externalAuthId}`,{method:"DELETE",headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`}});
    }catch(error){
      console.error("TECH_ACTION_E2E_AUTH_CLEANUP_WARNING",error instanceof Error?error.message:String(error));
    }
  }
}

try{
  await main();
}catch(error){
  console.error("AUTHENTICATED_TECH_ACTION_E2E: FAIL",error instanceof Error?error.message:String(error));
  throw error;
}finally{
  await cleanup();
  await sql.end({timeout:2});
}
