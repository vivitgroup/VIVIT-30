import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';

const base=process.env.PR103_BASE_URL||'http://127.0.0.1:3000';
const psql=postgres(process.env.DATABASE_URL,{ssl:false,max:1,prepare:false});
const gsql=postgres(process.env.VGROUP_DATABASE_URL,{ssl:false,max:1,prepare:false});
const suffix=randomUUID().slice(0,8);
const assert=(value,message)=>{if(!value)throw new Error(message)};
const cookiesFrom=response=>(typeof response.headers.getSetCookie==='function'?response.headers.getSetCookie():[response.headers.get('set-cookie')].filter(Boolean)).map(value=>value.split(';',1)[0]);
const mergeCookies=(...sets)=>[...new Set(sets.flat().filter(Boolean))].join('; ');
const phase=value=>writeFileSync('/tmp/pr103-phase',value);

let extId='',gUser='',techClient='',projectId='';
const legacyUser=`qa-pr103-${suffix}`;
const workspace=`qa-pr103-ws-${suffix}`;
const clientId=`qa-pr103-client-${suffix}`;
const campaignA=`qa-pr103-campaign-a-${suffix}`;
const campaignB=`qa-pr103-campaign-b-${suffix}`;
const legacyEmail=`qa-pr103-legacy-${suffix}@example.com`;
const legacyPassword=`Qa!${randomUUID()}A1`;

try{
  phase('tech_bu');
  const [bu]=await gsql`select id::text from vgroup.business_units where code='tech' and status='active' limit 1`;
  assert(bu?.id,'tech_bu_missing');
  phase('tech_role');
  let [role]=await gsql`select id::text from vgroup.roles where code='TECH_ADMIN' and business_unit_id=${bu.id}::uuid limit 1`;
  if(!role)[role]=await gsql`insert into vgroup.roles(code,business_unit_id,description,is_system) values('TECH_ADMIN',${bu.id}::uuid,'PR103 runtime',true) returning id::text`;
  phase('tech_permissions');
  for(const [module,action] of [['clients','view'],['clients','create'],['projects','view'],['projects','create'],['projects','update']]){
    let [perm]=await gsql`select id::text from vgroup.permissions where module=${module} and action=${action} and business_unit_id=${bu.id}::uuid limit 1`;
    if(!perm)[perm]=await gsql`insert into vgroup.permissions(module,action,business_unit_id) values(${role.id}::uuid,${perm.id}::uuid) on conflict do nothing`;
  }
  const techEmail=`qa-pr103-tech-${suffix}@example.com`,techPassword=`Qa!${randomUUID()}A1`;
  phase('tech_auth_seed');
  let response=await fetch(`${process.env.VGROUP_SUPABASE_URL}/auth/v1/admin/users`,{method:'POST',headers:{apikey:process.env.VGROUP_SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.VGROUP_SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({email:techEmail,password:techPassword,email_confirm:true})});
  let body=await response.json();assert(response.ok,`tech_auth_seed_failed_${response.status}`);extId=body.id||body.user?.id;
  phase('tech_vgroup_user');
  [body]=await gsql`insert into vgroup.users(external_auth_id,email,full_name,preferred_language,status) values(${extId},${techEmail},'PR103 Tech QA','en','active') returning id::text`;
  gUser=body.id;
  await gsql`insert into vgroup.user_business_unit_roles(user_id,business_unit_id,role_id,status) values(${gUser}::uuid,${bu.id}::uuid,${role.id}::uuid,'active')`;
  phase('tech_login');
  response=await fetch(`${base}/api/vgroup/auth/login`,{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':'127.0.0.231'},body:JSON.stringify({email:techEmail,password:techPassword})});
  assert(response.status===200,`tech_login_${response.status}`);const techCookie=mergeCookies(cookiesFrom(response));
  phase('tech_client_create');
  response=await fetch(`${base}/api/vgroup/tech/clients`,{method:'POST',headers:{Cookie:techCookie,'Content-Type':'application/json'},body:JSON.stringify({companyName:`PR103 Tech Client ${suffix}`,contactName:'QA',email:`client-${suffix}@example.com`})});
  body=await response.json();assert(response.status===201,`tech_client_create_${response.status}_${JSON.stringify(body)}`);techClient=body.client?.id;assert(techClient,'tech_client_id_missing');
  phase('tech_client_list');
  response=await fetch(`${base}/api/vgroup/tech/clients`,{headers:{Cookie:techCookie}});body=await response.json();assert(response.status===200&&body.clients?.some(client=>client.id===techClient),'tech_client_listing_missing');
  phase('tech_project_create');
  response=await fetch(`${base}/api/vgroup/tech/projects`,{method:'POST',headers:{Cookie:techCookie,'Content-Type':'application/json'},body:JSON.stringify({clientId:techClient,name:`PR103 Project ${suffix}`,projectType:'website',currency:'EGP',basePrice:1000})});
  body=await response.json();assert(response.status===201,`tech_project_create_${response.status}_${JSON.stringify(body)}`);projectId=body.project?.id;
  phase('tech_persistence');
  const [project]=await gsql`select client_id::text from tech.projects where id=${projectId}::uuid`;assert(project?.client_id===techClient,'tech_project_client_mismatch');
  console.log('PASS PR103 Tech Create Client -> Project selection/persistence');

  phase('legacy_auth');
  const hash=await bcrypt.hash(legacyPassword,10);
  await psql`insert into workspaces(id,name,slug,plan,is_active) values(${workspace},${`PR103 ${suffix}`},${`pr103-${suffix}`},'FREE',true)`;
  await psql`insert into users(id,workspace_id,name,email,password,role,is_active,approval_status,is_workspace_owner) values(${legacyUser},${workspace},'PR103 Super Admin',${legacyEmail},${hash},'SUPER_ADMIN',true,'APPROVED',true)`;
  const authHeaders={apikey:process.env.SUPABASE_SERVICE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_KEY}`,'Content-Type':'application/json',Prefer:'return=minimal'};
  response=await fetch(`${process.env.SUPABASE_URL}/rest/v1/workspaces`,{method:'POST',headers:authHeaders,body:JSON.stringify({id:workspace,is_active:true})});assert(response.status===201,`legacy_workspace_seed_${response.status}`);
  response=await fetch(`${process.env.SUPABASE_URL}/rest/v1/users`,{method:'POST',headers:authHeaders,body:JSON.stringify({id:legacyUser,name:'PR103 Super Admin',email:legacyEmail,password:hash,role:'SUPER_ADMIN',workspace_id:workspace,is_active:true,approval_status:'APPROVED'})});assert(response.status===201,`legacy_user_seed_${response.status}`);
  let csrf=await fetch(`${base}/api/auth/csrf`),csrfBody=await csrf.json(),legacyCookies=cookiesFrom(csrf);assert(csrfBody.csrfToken,'csrf_missing');
  const form=new URLSearchParams({csrfToken:csrfBody.csrfToken,email:legacyEmail,password:legacyPassword,callbackUrl:`${base}/dashboard`});
  response=await fetch(`${base}/api/auth/callback/credentials`,{method:'POST',headers:{Cookie:mergeCookies(legacyCookies),'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1','x-forwarded-for':'127.0.0.232'},body:form,redirect:'manual'});
  const callbackText=await response.text();
  let callbackBody=null;try{callbackBody=callbackText?JSON.parse(callbackText):null}catch{}
  const callbackUrl=String(callbackBody?.url||response.headers.get('location')||'');
  assert(response.ok||response.status===302,`legacy_auth_callback_${response.status}_${callbackText.slice(0,300)}`);
  assert(!/CredentialsSignin|error=/i.test(callbackUrl),`legacy_credentials_rejected_${response.status}_${callbackUrl}`);
  legacyCookies=[...legacyCookies,...cookiesFrom(response)];const legacyCookie=mergeCookies(legacyCookies);assert(legacyCookie,'legacy_auth_cookie_missing');
  response=await fetch(`${base}/api/auth/session`,{headers:{Cookie:legacyCookie,'x-forwarded-for':'127.0.0.232'}});body=await response.json();
  assert(response.status===200&&body?.user?.email===legacyEmail&&body?.user?.role==='SUPER_ADMIN'&&body?.user?.workspaceId===workspace&&body?.user?.authValid===true,`legacy_session_invalid_${response.status}_${JSON.stringify(body)}_callback_${callbackUrl}`);
  console.log('PASS PR103 authenticated SUPER_ADMIN session contract');

  phase('avatar');
  const avatar1='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z0V8AAAAASUVORK5CYII=';
  const avatar2='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  response=await fetch(`${base}/api/profile-avatar`,{method:'POST',headers:{Cookie:legacyCookie,'Content-Type':'application/json'},body:JSON.stringify({avatar:avatar1})});let avatarBody=await response.json();assert(response.status===200&&avatarBody.avatar===avatar1&&Number(avatarBody.version)>0,'avatar_first_replace_failed');assert(/no-store/.test(response.headers.get('cache-control')||''),'avatar_cache_header_missing');
  await new Promise(resolve=>setTimeout(resolve,5));
  response=await fetch(`${base}/api/profile-avatar`,{method:'POST',headers:{Cookie:legacyCookie,'Content-Type':'application/json'},body:JSON.stringify({avatar:avatar2})});avatarBody=await response.json();assert(response.status===200&&avatarBody.avatar===avatar2,'avatar_second_replace_failed');
  response=await fetch(`${base}/api/profile-avatar`,{method:'DELETE',headers:{Cookie:legacyCookie}});body=await response.json();assert(response.status===200&&body.avatar===null,'avatar_delete_failed');
  console.log('PASS PR103 Avatar immediate replace/delete + no-store/versioning');

  phase('marketing');
  await psql`insert into clients(id,workspace_id,company_name,is_active,currency) values(${clientId},${workspace},${`PR103 Client ${suffix}`},true,'EGP')`;
  await psql`insert into ad_campaigns(id,workspace_id,client_id,platform,external_id,name,objective,status,created_by) values(${campaignA},${workspace},${clientId},'META',${`ext-a-${suffix}`},'PR103 disposable','LEADS','ACTIVE',${legacyUser})`;
  const lifecycle=async(id,action)=>{const result=await fetch(`${base}/api/campaign-lifecycle`,{method:'POST',headers:{Cookie:legacyCookie,'Content-Type':'application/json'},body:JSON.stringify({id,action})});return{response:result,body:await result.json()}};
  let result=await lifecycle(campaignA,'archive');assert(result.response.status===200&&result.body.state==='archived','campaign_archive_failed');
  result=await lifecycle(campaignA,'restore');assert(result.response.status===200&&result.body.state==='active','campaign_restore_failed');
  result=await lifecycle(campaignA,'archive');assert(result.response.status===200,'campaign_rearchive_failed');
  result=await lifecycle(campaignA,'delete');assert(result.response.status===200&&result.body.state==='deleted','campaign_delete_failed');
  await psql`insert into ad_campaigns(id,workspace_id,client_id,platform,external_id,name,objective,status,created_by) values(${campaignB},${workspace},${clientId},'META',${`ext-b-${suffix}`},'PR103 protected','LEADS','ACTIVE',${legacyUser})`;
  result=await lifecycle(campaignB,'archive');assert(result.response.status===200,'protected_campaign_archive_failed');
  await psql`insert into ad_sets(id,campaign_id,external_id,name,status,budget) values(${`qa-pr103-adset-${suffix}`},${campaignB},${`set-${suffix}`},'History','ACTIVE',1)`;
  result=await lifecycle(campaignB,'delete');assert(result.response.status===409&&Number(result.body.dependencies?.ad_sets)>=1,'linked_history_delete_not_blocked');
  console.log('PASS PR103 Marketing archive/restore/delete + history protection');
  phase('complete');console.log('PR103_AUTHENTICATED_RUNTIME_REGRESSION: PASS');
}finally{
  try{await psql`delete from ad_sets where campaign_id in (${campaignA},${campaignB})`;await psql`delete from ad_campaigns where id in (${campaignA},${campaignB})`;await psql`delete from clients where id=${clientId}`;await psql`delete from audit_logs where user_id=${legacyUser}`;await psql`delete from users where id=${legacyUser}`;await psql`delete from workspaces where id=${workspace}`}catch{}
  try{if(projectId)await gsql`delete from vgroup.audit_logs where entity_id=${projectId}::uuid`;if(techClient){await gsql`delete from vgroup.audit_logs where action='client.create' and entity_id=${techClient}::uuid`;await gsql`delete from tech.projects where client_id=${techClient}::uuid`;await gsql`delete from tech.clients where id=${techClient}::uuid`}if(gUser){await gsql`delete from vgroup.user_business_unit_roles where user_id=${gUser}::uuid`;await gsql`delete from vgroup.users where id=${gUser}::uuid`}}catch{}
  try{if(extId)await fetch(`${process.env.VGROUP_SUPABASE_URL}/auth/v1/admin/users/${extId}`,{method:'DELETE',headers:{apikey:process.env.VGROUP_SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.VGROUP_SUPABASE_SERVICE_ROLE_KEY}`}})}catch{}
  await Promise.all([psql.end({timeout:1}),gsql.end({timeout:1})]);
}
