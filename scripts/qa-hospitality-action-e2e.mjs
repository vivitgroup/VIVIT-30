import {randomUUID} from "node:crypto";
import postgres from "postgres";

const baseUrl=process.env.BASE_URL||"http://127.0.0.1:3000";
const databaseUrl=process.env.VGROUP_DATABASE_URL;
const supabaseUrl=process.env.VGROUP_SUPABASE_URL;
const publishableKey=process.env.VGROUP_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey=process.env.VGROUP_SUPABASE_SERVICE_ROLE_KEY;
for(const [name,value] of Object.entries({VGROUP_DATABASE_URL:databaseUrl,VGROUP_SUPABASE_URL:supabaseUrl,VGROUP_SUPABASE_PUBLISHABLE_KEY:publishableKey,VGROUP_SUPABASE_SERVICE_ROLE_KEY:serviceRoleKey}))if(!value)throw new Error(`missing_required_env:${name}`);

const sql=postgres(databaseUrl,{ssl:false,max:1,prepare:false});
const runId=String(process.env.GITHUB_RUN_ID||Date.now());
const email=`qa-hospitality-actions-${runId}@example.com`;
const password=`Qa!${randomUUID()}aA1`;
const created={externalAuthId:null,groupUserId:null,propertyId:null,expenseId:null,imageId:null};
const authHeaders={apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`};
function assert(condition,message){if(!condition)throw new Error(message)}

async function request(path,{cookie,method="GET",body,headers={}}={}){
  const requestHeaders={...headers,...(cookie?{Cookie:cookie}:{})};
  const options={method,headers:requestHeaders,redirect:"manual"};
  if(body!==undefined)options.body=body instanceof FormData?body:typeof body==="string"?body:JSON.stringify(body);
  if(body!==undefined&&!(body instanceof FormData)&&!requestHeaders["Content-Type"])requestHeaders["Content-Type"]="application/json";
  return fetch(`${baseUrl}${path}`,options);
}

async function createSupabaseUser(){
  const response=await fetch(`${supabaseUrl}/auth/v1/admin/users`,{method:"POST",headers:{...authHeaders,"Content-Type":"application/json"},body:JSON.stringify({email,password,email_confirm:true,user_metadata:{qa:true,scope:"hospitality-actions"}})});
  const body=await response.json().catch(()=>({}));
  assert(response.ok,`supabase_admin_create_failed:${response.status}`);
  created.externalAuthId=body.id||body.user?.id;
  assert(created.externalAuthId,"supabase_user_id_missing");
}

async function createStorageBucket(){
  const response=await fetch(`${supabaseUrl}/storage/v1/bucket`,{method:"POST",headers:{...authHeaders,"Content-Type":"application/json"},body:JSON.stringify({id:"vgroup-hospitality",name:"vgroup-hospitality",public:false,file_size_limit:20971520})});
  assert(response.ok||response.status===409,`storage_bucket_setup_failed:${response.status}`);
}

async function seedIdentity(){
  const [bu]=await sql`select id from vgroup.business_units where code='hospitality' and status='active' limit 1`;
  assert(bu?.id,"hospitality_business_unit_missing");
  let [role]=await sql`select id from vgroup.roles where code='HOSPITALITY_ADMIN' and business_unit_id=${bu.id}::uuid limit 1`;
  if(!role)[role]=await sql`insert into vgroup.roles(code,business_unit_id,description,is_system) values('HOSPITALITY_ADMIN',${bu.id}::uuid,'QA action E2E',true) returning id`;
  for(const [module,action] of [["properties","view"],["properties","create"],["properties","update"],["finance","view"],["finance","create"]]){
    let [permission]=await sql`select id from vgroup.permissions where module=${module} and action=${action} and business_unit_id=${bu.id}::uuid limit 1`;
    if(!permission)[permission]=await sql`insert into vgroup.permissions(module,action,business_unit_id) values(${module},${action},${bu.id}::uuid) returning id`;
    await sql`insert into vgroup.role_permissions(role_id,permission_id) values(${role.id}::uuid,${permission.id}::uuid) on conflict do nothing`;
  }
  const [user]=await sql`insert into vgroup.users(external_auth_id,email,full_name,preferred_language,status) values(${created.externalAuthId},${email},'QA Hospitality Actions','en','active') returning id`;
  created.groupUserId=user.id;
  await sql`insert into vgroup.user_business_unit_roles(user_id,business_unit_id,role_id,status) values(${user.id}::uuid,${bu.id}::uuid,${role.id}::uuid,'active') on conflict do nothing`;
}

async function login(){
  const response=await request("/api/vgroup/auth/login",{method:"POST",headers:{"Content-Type":"application/json","x-forwarded-for":"127.0.0.219"},body:JSON.stringify({email,password})});
  assert(response.status===200,`login_failed:${response.status}`);
  const setCookies=typeof response.headers.getSetCookie==="function"?response.headers.getSetCookie():[response.headers.get("set-cookie")].filter(Boolean);
  const cookie=setCookies.map(value=>value.split(";",1)[0]).join("; ");
  assert(cookie.includes("vgroup_access_token="),"access_cookie_missing");
  return cookie;
}

async function runActions(cookie){
  const createProperty=await request("/api/vgroup/hospitality/properties",{cookie,method:"POST",body:{name:`QA Action Property ${runId}`,propertyType:"apartment",city:"Cairo",country:"EG",bedrooms:1,bathrooms:1,maxGuests:2}});
  const propertyBody=await createProperty.json().catch(()=>({}));
  assert(createProperty.status===201,`property_create_expected_201_got_${createProperty.status}:${JSON.stringify(propertyBody)}`);
  created.propertyId=propertyBody.property?.id;
  assert(created.propertyId,"property_id_missing");
  console.log("PASS Hospitality property create action (201)");

  const expenseForm=new FormData();
  expenseForm.set("propertyId",created.propertyId);
  expenseForm.set("invoiceType","other");
  expenseForm.set("currency","EGP");
  expenseForm.set("subtotal","125.50");
  expenseForm.set("tax","0");
  expenseForm.set("issuedAt",new Date().toISOString().slice(0,10));
  expenseForm.set("notes",`QA expense ${runId}`);
  const createExpense=await request("/api/vgroup/hospitality/expenses",{cookie,method:"POST",body:expenseForm});
  const expenseBody=await createExpense.json().catch(()=>({}));
  assert(createExpense.status===201,`expense_create_expected_201_got_${createExpense.status}:${JSON.stringify(expenseBody)}`);
  created.expenseId=expenseBody.expense?.id;
  assert(created.expenseId,"expense_id_missing");
  const [expenseRow]=await sql`select property_id::text,total::numeric from hospitality.invoices where id=${created.expenseId}::uuid limit 1`;
  assert(expenseRow?.property_id===created.propertyId&&Number(expenseRow.total)===125.5,"expense_side_effect_mismatch");
  console.log("PASS Hospitality Add expense action persists against the selected property");

  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZK0sAAAAASUVORK5CYII=","base64");
  const imageForm=new FormData();
  imageForm.set("file",new File([png],`qa-${runId}.png`,{type:"image/png"}));
  imageForm.set("caption","QA action E2E");
  imageForm.set("isCover","true");
  const uploadImage=await request(`/api/vgroup/hospitality/properties/${created.propertyId}/images`,{cookie,method:"POST",body:imageForm});
  const imageBody=await uploadImage.json().catch(()=>({}));
  assert(uploadImage.status===201,`image_upload_expected_201_got_${uploadImage.status}:${JSON.stringify(imageBody)}`);
  created.imageId=imageBody.image?.id;
  assert(created.imageId,"image_id_missing");
  const [imageRow]=await sql`select property_id::text,mime_type,archived_at from hospitality.property_images where id=${created.imageId}::uuid limit 1`;
  assert(imageRow?.property_id===created.propertyId&&imageRow.mime_type==="image/png"&&!imageRow.archived_at,"image_side_effect_mismatch");
  console.log("PASS Hospitality property image upload action persists metadata and storage object");

  const archive=await request(`/api/vgroup/hospitality/properties/${created.propertyId}/lifecycle`,{cookie,method:"POST",body:{action:"archive"}});
  const archiveBody=await archive.json().catch(()=>({}));
  assert(archive.status===200&&archiveBody.archived===true,`property_archive_failed:${archive.status}:${JSON.stringify(archiveBody)}`);
  let [property]=await sql`select status,archived_at from hospitality.properties where id=${created.propertyId}::uuid limit 1`;
  assert(property?.status==="archived"&&property.archived_at,"property_archive_side_effect_mismatch");
  console.log("PASS Hospitality Archive Property action preserves record and changes lifecycle state");

  const restore=await request(`/api/vgroup/hospitality/properties/${created.propertyId}/lifecycle`,{cookie,method:"POST",body:{action:"restore"}});
  const restoreBody=await restore.json().catch(()=>({}));
  assert(restore.status===200&&restoreBody.restored===true,`property_restore_failed:${restore.status}:${JSON.stringify(restoreBody)}`);
  [property]=await sql`select status,archived_at from hospitality.properties where id=${created.propertyId}::uuid limit 1`;
  assert(property?.status==="active"&&!property.archived_at,"property_restore_side_effect_mismatch");
  console.log("PASS Hospitality Restore Property action returns property to active state");
}

async function cleanup(cookie){
  try{
    if(created.imageId&&created.propertyId&&cookie){
      await request(`/api/vgroup/hospitality/properties/${created.propertyId}/images`,{cookie,method:"DELETE",body:{imageId:created.imageId}}).catch(()=>undefined);
    }
    if(created.expenseId)await sql`delete from hospitality.invoice_receipts where invoice_id=${created.expenseId}::uuid`;
    if(created.expenseId)await sql`delete from hospitality.invoices where id=${created.expenseId}::uuid`;
    if(created.propertyId)await sql`delete from hospitality.property_images where property_id=${created.propertyId}::uuid`;
    if(created.propertyId)await sql`delete from hospitality.properties where id=${created.propertyId}::uuid`;
    if(created.groupUserId)await sql`delete from vgroup.users where id=${created.groupUserId}::uuid`;
    if(created.externalAuthId)await fetch(`${supabaseUrl}/auth/v1/admin/users/${created.externalAuthId}`,{method:"DELETE",headers:authHeaders}).catch(()=>undefined);
  }catch(error){console.warn("WARN action E2E cleanup was incomplete; databases are ephemeral",error instanceof Error?error.message:String(error));}
}

let cookie="";
try{
  await createSupabaseUser();
  await createStorageBucket();
  await seedIdentity();
  cookie=await login();
  await runActions(cookie);
  console.log("PASS Hospitality action-level authenticated E2E complete");
}finally{
  await cleanup(cookie);
  await sql.end({timeout:1});
}
