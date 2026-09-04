import {randomUUID} from "node:crypto";
import postgres from "postgres";

const baseUrl=process.env.BASE_URL||"http://127.0.0.1:3000";
const groupDatabaseUrl=process.env.VGROUP_DATABASE_URL;
const supabaseUrl=process.env.VGROUP_SUPABASE_URL;
const publishableKey=process.env.VGROUP_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey=process.env.VGROUP_SUPABASE_SERVICE_ROLE_KEY;

for(const [name,value] of Object.entries({VGROUP_DATABASE_URL:groupDatabaseUrl,VGROUP_SUPABASE_URL:supabaseUrl,VGROUP_SUPABASE_PUBLISHABLE_KEY:publishableKey,VGROUP_SUPABASE_SERVICE_ROLE_KEY:serviceRoleKey})){
  if(!value)throw new Error(`missing_required_env:${name}`);
}

const sql=postgres(groupDatabaseUrl,{ssl:false,max:1,prepare:false});
const runId=String(process.env.GITHUB_RUN_ID||Date.now());
const personas=[
  {name:"owner",role:"OWNER"},
  {name:"manager",role:"PROPERTY_MANAGER"},
  {name:"staff",role:"HOSPITALITY_ADMIN"},
];

function assert(condition,message){if(!condition)throw new Error(message)}

async function bootstrapVGroupAuthContract(){
  await sql.unsafe(`
    create schema if not exists vgroup;

    create table if not exists vgroup.business_units (
      id uuid primary key default gen_random_uuid(),
      code text not null unique,
      display_name_ar text not null,
      display_name_en text not null,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists vgroup.users (
      id uuid primary key default gen_random_uuid(),
      external_auth_id text unique,
      email text not null unique,
      full_name text not null,
      phone text,
      preferred_language text not null default 'en',
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists vgroup.roles (
      id uuid primary key default gen_random_uuid(),
      code text not null,
      business_unit_id uuid references vgroup.business_units(id),
      description text,
      is_system boolean not null default true,
      created_at timestamptz not null default now(),
      unique(code,business_unit_id)
    );

    create table if not exists vgroup.permissions (
      id uuid primary key default gen_random_uuid(),
      module text not null,
      action text not null,
      business_unit_id uuid references vgroup.business_units(id),
      created_at timestamptz not null default now(),
      unique(module,action,business_unit_id)
    );

    create table if not exists vgroup.role_permissions (
      id uuid primary key default gen_random_uuid(),
      role_id uuid not null references vgroup.roles(id) on delete cascade,
      permission_id uuid not null references vgroup.permissions(id) on delete cascade,
      created_at timestamptz not null default now(),
      unique(role_id,permission_id)
    );

    create table if not exists vgroup.user_business_unit_roles (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references vgroup.users(id) on delete cascade,
      business_unit_id uuid not null references vgroup.business_units(id) on delete cascade,
      role_id uuid not null references vgroup.roles(id) on delete cascade,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id,business_unit_id,role_id)
    );

    create table if not exists vgroup.auth_rate_limits (
      key_hash text primary key,
      window_start timestamptz not null default now(),
      attempt_count integer not null default 0 check (attempt_count >= 0),
      updated_at timestamptz not null default now()
    );

    create table if not exists vgroup.employees (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references vgroup.users(id) on delete cascade,
      business_unit_id uuid not null references vgroup.business_units(id) on delete cascade,
      job_title text,
      hire_date date,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id,business_unit_id)
    );

    create table if not exists vgroup.employee_permissions (
      id uuid primary key default gen_random_uuid(),
      employee_id uuid not null references vgroup.employees(id) on delete cascade,
      permission_id uuid not null references vgroup.permissions(id) on delete cascade,
      effect text not null default 'allow' check (effect in ('allow','deny')),
      granted_by uuid references vgroup.users(id),
      granted_at timestamptz not null default now(),
      unique(employee_id,permission_id)
    );
  `);
  console.log("PASS isolated VGroup auth/RBAC contract bootstrapped");
}

async function createAuthUser(persona){
  const email=`qa-vgroup-${runId}-${persona.name}@example.com`;
  const password=`Qa!${randomUUID()}aA1`;
  const response=await fetch(`${supabaseUrl}/auth/v1/admin/users`,{
    method:"POST",
    headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({email,password,email_confirm:true,user_metadata:{qa:true,persona:persona.name}}),
  });
  const body=await response.json().catch(()=>({}));
  assert(response.ok,`supabase_admin_create_failed:${persona.name}:${response.status}`);
  const externalAuthId=body.id||body.user?.id;
  assert(externalAuthId,`supabase_user_id_missing:${persona.name}`);
  return {...persona,email,password,externalAuthId};
}

async function ensureBusinessUnit(code,displayNameAr,displayNameEn){
  let [row]=await sql`select id from vgroup.business_units where code=${code} limit 1`;
  if(!row){
    [row]=await sql`insert into vgroup.business_units(code,display_name_ar,display_name_en,status) values(${code},${displayNameAr},${displayNameEn},'active') returning id`;
  }else{
    await sql`update vgroup.business_units set status='active',updated_at=now() where id=${row.id}`;
  }
  return row.id;
}

async function ensureRole(code,businessUnitId){
  let [row]=await sql`select id from vgroup.roles where code=${code} and business_unit_id=${businessUnitId}::uuid limit 1`;
  if(!row){
    [row]=await sql`insert into vgroup.roles(code,business_unit_id,description,is_system) values(${code},${businessUnitId}::uuid,'QA authenticated role E2E',true) returning id`;
  }
  return row.id;
}

async function ensurePermission(module,action,businessUnitId){
  let [row]=await sql`select id from vgroup.permissions where module=${module} and action=${action} and business_unit_id=${businessUnitId}::uuid limit 1`;
  if(!row){
    [row]=await sql`insert into vgroup.permissions(module,action,business_unit_id) values(${module},${action},${businessUnitId}::uuid) returning id`;
  }
  return row.id;
}

async function grant(roleId,permissionId){
  const [existing]=await sql`select id from vgroup.role_permissions where role_id=${roleId}::uuid and permission_id=${permissionId}::uuid limit 1`;
  if(!existing)await sql`insert into vgroup.role_permissions(role_id,permission_id) values(${roleId}::uuid,${permissionId}::uuid)`;
}

async function bridgeGroupIdentity(user,businessUnitId,roleId){
  const [groupUser]=await sql`
    insert into vgroup.users(external_auth_id,email,full_name,preferred_language,status)
    values(${user.externalAuthId},${user.email},${`QA ${user.name}`},'en','active')
    returning id`;
  await addMembership(groupUser.id,businessUnitId,roleId);
  return groupUser.id;
}

async function addMembership(userId,businessUnitId,roleId){
  const [existing]=await sql`select id from vgroup.user_business_unit_roles where user_id=${userId}::uuid and business_unit_id=${businessUnitId}::uuid and role_id=${roleId}::uuid limit 1`;
  if(!existing)await sql`insert into vgroup.user_business_unit_roles(user_id,business_unit_id,role_id,status) values(${userId}::uuid,${businessUnitId}::uuid,${roleId}::uuid,'active')`;
}

async function login(user){
  const response=await fetch(`${baseUrl}/api/vgroup/auth/login`,{
    method:"POST",
    headers:{"Content-Type":"application/json","x-forwarded-for":`127.0.0.${user.name==='owner'?2:user.name==='manager'?3:4}`},
    body:JSON.stringify({email:user.email,password:user.password}),
    redirect:"manual",
  });
  assert(response.status===200,`login_failed:${user.name}:${response.status}`);
  const setCookies=typeof response.headers.getSetCookie==="function"?response.headers.getSetCookie():[response.headers.get("set-cookie")].filter(Boolean);
  const cookie=setCookies.map(value=>value.split(";",1)[0]).join("; ");
  assert(cookie.includes("vgroup_access_token="),`access_cookie_missing:${user.name}`);
  return cookie;
}

async function request(path,{cookie,method="GET"}={}){
  return fetch(`${baseUrl}${path}`,{method,headers:cookie?{Cookie:cookie}:{},redirect:"manual"});
}

function assertRedirect(response,expectedPath,label){
  assert([307,308].includes(response.status),`${label}_expected_redirect_got_${response.status}`);
  const location=response.headers.get("location")||"";
  assert(location.endsWith(expectedPath),`${label}_unexpected_location:${location}`);
}

async function main(){
  const unauthenticated=await request("/api/vgroup/hospitality/owner-portal?propertyId=not-a-uuid");
  assert(unauthenticated.status===401,`unauthenticated_gate_expected_401_got_${unauthenticated.status}`);
  console.log("PASS unauthenticated hospitality API is rejected (401)");

  await bootstrapVGroupAuthContract();

  const hospitalityId=await ensureBusinessUnit("hospitality","الضيافة","Hospitality");
  const marketingId=await ensureBusinessUnit("marketing","التسويق","Marketing");
  const techId=await ensureBusinessUnit("tech","التكنولوجيا","Technology");
  const roleIds={};
  for(const persona of personas)roleIds[persona.role]=await ensureRole(persona.role,hospitalityId);
  const marketingAdminRole=await ensureRole("MARKETING_ADMIN",marketingId);
  const techAdminRole=await ensureRole("TECH_ADMIN",techId);
  const purchaseOrderApprove=await ensurePermission("purchase_orders","approve",hospitalityId);
  await grant(roleIds.HOSPITALITY_ADMIN,purchaseOrderApprove);

  const users=[];
  for(const persona of personas){
    const user=await createAuthUser(persona);
    const groupUserId=await bridgeGroupIdentity(user,hospitalityId,roleIds[persona.role]);
    if(persona.name==="staff"){
      await addMembership(groupUserId,marketingId,marketingAdminRole);
      await addMembership(groupUserId,techId,techAdminRole);
    }
    users.push(user);
  }

  const sessions={};
  for(const user of users){
    sessions[user.name]=await login(user);
    console.log(`PASS ${user.role} authenticated through /api/vgroup/auth/login with a real Supabase session`);
  }

  const groupHome=await request("/group",{cookie:sessions.staff});
  assert(groupHome.status===200,`group_portal_expected_200_got_${groupHome.status}`);
  console.log("PASS Group portal renders for an authenticated VGroup user (200)");

  const hospitalityEntry=await request("/group/enter/hospitality",{cookie:sessions.staff});
  assertRedirect(hospitalityEntry,"/group/hospitality","hospitality_entry");
  console.log("PASS Hospitality portal entry authorizes membership and routes to /group/hospitality");

  const techEntry=await request("/group/enter/tech",{cookie:sessions.staff});
  assertRedirect(techEntry,"/group/tech","tech_entry");
  console.log("PASS Tech portal entry authorizes membership and routes to /group/tech");

  const marketingEntry=await request("/group/enter/marketing",{cookie:sessions.staff});
  assertRedirect(marketingEntry,"/login?workspace=marketing","marketing_native_entry");
  console.log("PASS Marketing portal preserves its native ERP auth boundary and routes to /login?workspace=marketing");

  const marketingIntegration=await request("/group/marketing",{cookie:sessions.staff});
  assert(marketingIntegration.status===200,`marketing_integration_gate_expected_200_got_${marketingIntegration.status}`);
  console.log("PASS authenticated Marketing membership reaches the Group↔Marketing integration gate (200)");

  for(const persona of ["owner","manager","staff"]){
    const businessUnitGate=await request("/api/vgroup/hospitality/owner-portal?propertyId=not-a-uuid",{cookie:sessions[persona]});
    assert(businessUnitGate.status===400,`${persona}_hospitality_membership_expected_400_after_authorization_got_${businessUnitGate.status}`);
    console.log(`PASS ${persona} authenticates and passes Hospitality business-unit membership gate (400 validation reached)`);
  }

  for(const persona of ["owner","manager"]){
    const denied=await request("/api/vgroup/hospitality/purchase-orders/not-a-uuid/approve",{cookie:sessions[persona],method:"POST"});
    assert(denied.status===403,`${persona}_po_approve_expected_403_got_${denied.status}`);
    console.log(`PASS ${persona} cannot bypass purchase_orders:approve permission (403)`);
  }

  const staffAllowed=await request("/api/vgroup/hospitality/purchase-orders/not-a-uuid/approve",{cookie:sessions.staff,method:"POST"});
  assert(staffAllowed.status===400,`staff_po_permission_expected_400_after_authorization_got_${staffAllowed.status}`);
  console.log("PASS HOSPITALITY_ADMIN passes purchase_orders:approve RBAC and reaches route validation (400)");

  console.log("FOUR_WORKSPACE_ENTRY_E2E: PASS (GROUP / MARKETING NATIVE BOUNDARY / HOSPITALITY / TECH)");
  console.log("AUTHENTICATED_ROLE_BY_ROLE_E2E: PASS (OWNER / PROPERTY_MANAGER / HOSPITALITY_ADMIN)");
}

try{
  await main();
}catch(error){
  console.error("AUTHENTICATED_ROLE_BY_ROLE_E2E: FAIL",error instanceof Error?error.message:String(error));
  throw error;
}finally{
  await sql.end({timeout:2});
}
