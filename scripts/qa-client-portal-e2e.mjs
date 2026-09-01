import http from "node:http";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import postgres from "postgres";

const base=(process.env.BASE_URL||"http://127.0.0.1:3000").replace(/\/$/,"");
const mockPort=Number(process.env.MOCK_SUPABASE_PORT||4599);
const dbUrl=String(process.env.DATABASE_URL||"");
const password="PortalAudit!2026";
const workspace="__portal_audit__";
const alphaUser="10000000-0000-4000-8000-000000000001";
const betaUser="10000000-0000-4000-8000-000000000002";
const creatorUser="10000000-0000-4000-8000-000000000003";
const alphaClient="20000000-0000-4000-8000-000000000001";
const betaClient="20000000-0000-4000-8000-000000000002";
const alphaTask="30000000-0000-4000-8000-000000000001";
const alphaDeletedTask="30000000-0000-4000-8000-000000000002";
const betaTask="30000000-0000-4000-8000-000000000003";
const alphaFile="40000000-0000-4000-8000-000000000001";
const betaFile="40000000-0000-4000-8000-000000000002";

const users={
 alpha:{id:alphaUser,name:"Alpha Client",email:"alpha@portal-audit.invalid",password:await bcrypt.hash(password,8),role:"CLIENT",workspace_id:workspace,is_active:true,approval_status:"APPROVED"},
 beta:{id:betaUser,name:"Beta Client",email:"beta@portal-audit.invalid",password:await bcrypt.hash(password,8),role:"CLIENT",workspace_id:workspace,is_active:true,approval_status:"APPROVED"},
 creator:{id:creatorUser,name:"Portal Creator",email:"creator@portal-audit.invalid",password:await bcrypt.hash(password,8),role:"CREATOR",workspace_id:workspace,is_active:true,approval_status:"APPROVED"}
};

const checks=[];
const check=(name,ok,detail="")=>checks.push({name,ok:Boolean(ok),detail});
const portalSource=fs.readFileSync("app/dashboard/portal/page.tsx","utf8");
const taskSource=fs.readFileSync("app/dashboard/creative/[id]/page.tsx","utf8");
const filesSource=fs.readFileSync("app/api/files/route.ts","utf8");
const clientsSource=fs.readFileSync("app/api/clients/route.ts","utf8");
check("Portal binds active client to session user and workspace",portalSource.includes("workspace_id=${workspaceId} and user_id=${userId} and is_active=true"));
check("Portal review lookup rejects archived and deleted creatives",portalSource.includes("client_id=${client.id} and workspace_id=${workspaceId} and archived_at is null and deleted_at is null limit 1"));
check("Portal approval write is tenant/client/deletion scoped",portalSource.includes("where id=${taskId} and client_id=${client.id} and workspace_id=${workspaceId} and archived_at is null and deleted_at is null"));
check("Portal task feed excludes soft-deleted creatives",portalSource.includes("client_id=${client.id} and archived_at is null and deleted_at is null order by updated_at desc"));
check("Portal calendar task relation excludes soft-deleted creatives",portalSource.includes("t.client_id=${client.id} and t.archived_at is null and t.deleted_at is null"));
check("Client task detail uses explicit client ownership",taskSource.includes('role==="CLIENT"&&task.client_user_id===userId'));
check("Client task comments hide internal notes",taskSource.includes("tc.is_internal=false"));
check("File API client scope is linked-client only",filesSource.includes('role==="CLIENT"')&&filesSource.includes("eq(clients.userId,userId)")&&filesSource.includes("eq(clients.isActive,true)"));
check("File link validation checks client ownership",filesSource.includes('if(role==="CLIENT")return task.user_id===userId')&&filesSource.includes('if(role==="CLIENT")return client.userId===userId'));
check("File task links reject archived and soft-deleted creatives",filesSource.includes("t.archived_at is null and t.deleted_at is null and c.is_active=true limit 1"));
check("Client list API filters by linked portal user",clientsSource.includes('role==="CLIENT"?eq(clients.userId,userId)'));

const sql=postgres(dbUrl,{ssl:false,prepare:false,max:1});

async function cleanup(){
 for(const table of ["task_comments","calendar_events","finance_records","file_documents","creative_tasks","clients"]){
  try{
   const where=table==="task_comments"?`task_id in ('${alphaTask}','${alphaDeletedTask}','${betaTask}')`
    :table==="clients"?`id in ('${alphaClient}','${betaClient}')`
    :table==="creative_tasks"?`id in ('${alphaTask}','${alphaDeletedTask}','${betaTask}')`
    :table==="file_documents"?`id in ('${alphaFile}','${betaFile}')`
    :`workspace_id='${workspace}'`;
   await sql.unsafe(`delete from ${table} where ${where}`);
  }catch{}
 }
 try{await sql`delete from notifications where user_id=${alphaUser}`;}catch{}
 try{await sql`delete from notifications where user_id=${betaUser}`;}catch{}
 try{await sql`delete from users where id=${alphaUser}`;}catch{}
 try{await sql`delete from users where id=${betaUser}`;}catch{}
 try{await sql`delete from users where id=${creatorUser}`;}catch{}
}

async function prep(){
 await sql.unsafe(`alter table clients add column if not exists facebook_url text; alter table clients add column if not exists instagram_url text;`);
 await sql.unsafe(`alter table creative_tasks add column if not exists archived_at timestamp; alter table creative_tasks add column if not exists deleted_at timestamp;`);
 await sql.unsafe(`alter table file_documents add column if not exists archived_at timestamp; alter table file_documents add column if not exists archived_by text;`);
 await sql.unsafe(`alter table ad_campaigns add column if not exists archived_at timestamp; alter table ad_campaigns add column if not exists reported_result_label text; alter table ad_campaigns add column if not exists reported_result_type text;`);
 await cleanup();

 await sql`insert into users(id,workspace_id,name,email,password,role,is_active,approval_status) values(${alphaUser},${workspace},${users.alpha.name},${users.alpha.email},${users.alpha.password},'CLIENT',true,'APPROVED')`;
 await sql`insert into users(id,workspace_id,name,email,password,role,is_active,approval_status) values(${betaUser},${workspace},${users.beta.name},${users.beta.email},${users.beta.password},'CLIENT',true,'APPROVED')`;
 await sql`insert into users(id,workspace_id,name,email,password,role,is_active,approval_status) values(${creatorUser},${workspace},${users.creator.name},${users.creator.email},${users.creator.password},'CREATOR',true,'APPROVED')`;

 await sql`insert into clients(id,workspace_id,company_name,user_id,is_active,currency) values(${alphaClient},${workspace},'Client Alpha',${alphaUser},true,'EGP')`;
 await sql`insert into clients(id,workspace_id,company_name,user_id,is_active,currency) values(${betaClient},${workspace},'Client Beta',${betaUser},true,'EGP')`;

 const deadline=new Date(Date.now()+3*86400000);
 await sql`insert into creative_tasks(id,workspace_id,client_id,title,brief,deadline,status,type,file_url,created_by_id,assigned_to_id) values(${alphaTask},${workspace},${alphaClient},'ALPHA_VISIBLE_CREATIVE','alpha brief',${deadline},'APPROVED','GRAPHIC','https://example.invalid/alpha.png',${creatorUser},${creatorUser})`;
 await sql`insert into creative_tasks(id,workspace_id,client_id,title,brief,deadline,status,type,file_url,created_by_id,assigned_to_id) values(${alphaDeletedTask},${workspace},${alphaClient},'ALPHA_DELETED_SECRET','deleted brief',${deadline},'APPROVED','GRAPHIC','https://example.invalid/deleted.png',${creatorUser},${creatorUser})`;
 await sql`insert into creative_tasks(id,workspace_id,client_id,title,brief,deadline,status,type,file_url,created_by_id,assigned_to_id) values(${betaTask},${workspace},${betaClient},'BETA_PRIVATE_CREATIVE','beta brief',${deadline},'APPROVED','GRAPHIC','https://example.invalid/beta.png',${creatorUser},${creatorUser})`;
 await sql`update creative_tasks set deleted_at=now() where id=${alphaDeletedTask}`;

 await sql`insert into file_documents(id,workspace_id,uploaded_by,client_id,name,storage_path,mime_type,size_bytes,category) values(${alphaFile},${workspace},${creatorUser},${alphaClient},'ALPHA_PLAN.pdf',${`${workspace}/alpha/plan.pdf`},'application/pdf',100,'CONTENT_PLAN')`;
 await sql`insert into file_documents(id,workspace_id,uploaded_by,client_id,name,storage_path,mime_type,size_bytes,category) values(${betaFile},${workspace},${creatorUser},${betaClient},'BETA_SECRET.pdf',${`${workspace}/beta/secret.pdf`},'application/pdf',100,'CONTENT_PLAN')`;

 await sql`insert into finance_records(id,workspace_id,client_id,month,year,total_revenue,paid,outstanding,invoice_number,invoice_status) values(gen_random_uuid()::text,${workspace},${alphaClient},9,2099,111,50,61,'ALPHA-INVOICE','SENT')`;
 await sql`insert into finance_records(id,workspace_id,client_id,month,year,total_revenue,paid,outstanding,invoice_number,invoice_status) values(gen_random_uuid()::text,${workspace},${betaClient},9,2099,999999,0,999999,'BETA-SECRET-INVOICE','SENT')`;

 await sql`insert into calendar_events(id,workspace_id,client_id,task_id,title,date,status) values(gen_random_uuid()::text,${workspace},${alphaClient},${alphaTask},'ALPHA_CALENDAR_EVENT',now()+interval '1 day','scheduled')`;
 await sql`insert into calendar_events(id,workspace_id,client_id,task_id,title,date,status) values(gen_random_uuid()::text,${workspace},${betaClient},${betaTask},'BETA_PRIVATE_EVENT',now()+interval '1 day','scheduled')`;
 await sql`insert into calendar_events(id,workspace_id,client_id,task_id,title,date,status) values(gen_random_uuid()::text,${workspace},${alphaClient},${alphaDeletedTask},'ALPHA_DELETED_EVENT',now()+interval '1 day','scheduled')`;

 await sql`insert into notifications(id,user_id,type,title,message,priority) values(gen_random_uuid()::text,${alphaUser},'INFO','ALPHA_NOTICE','Alpha only','normal')`;
 await sql`insert into notifications(id,user_id,type,title,message,priority) values(gen_random_uuid()::text,${betaUser},'INFO','BETA_PRIVATE_NOTICE','Beta only','normal')`;
 await sql`insert into task_comments(id,task_id,user_id,comment,is_internal) values(gen_random_uuid()::text,${alphaTask},${creatorUser},'ALPHA_PUBLIC_COMMENT',false)`;
 await sql`insert into task_comments(id,task_id,user_id,comment,is_internal) values(gen_random_uuid()::text,${alphaTask},${creatorUser},'ALPHA_INTERNAL_SECRET',true)`;
}

const server=http.createServer((req,res)=>{
 const u=new URL(req.url||"/",`http://127.0.0.1:${mockPort}`);
 res.setHeader("content-type","application/json");
 if(u.pathname==="/rest/v1/users"){
  const emailFilter=u.searchParams.get("email")||"",idFilter=u.searchParams.get("id")||"";
  const email=emailFilter.startsWith("eq.")?decodeURIComponent(emailFilter.slice(3)):null;
  const id=idFilter.startsWith("eq.")?decodeURIComponent(idFilter.slice(3)):null;
  const row=Object.values(users).find(x=>(email&&x.email===email)||(id&&x.id===id));
  if(!row){res.end("[]");return}
  const select=String(u.searchParams.get("select")||"").split(",").filter(Boolean);
  const projected=select.length?Object.fromEntries(select.map(k=>[k,row[k]??null])):row;
  res.end(JSON.stringify([projected]));return;
 }
 if(u.pathname==="/rest/v1/audit_logs"){res.end("[]");return}
 if(u.pathname.startsWith("/storage/v1/object/sign/vivit-files/")){res.end(JSON.stringify({signedURL:"/object/sign/mock-token"}));return}
 res.statusCode=404;res.end(JSON.stringify({error:"not_found"}));
});

function absorbCookies(headers,jar){
 const list=typeof headers.getSetCookie==="function"?headers.getSetCookie():[headers.get("set-cookie")].filter(Boolean);
 for(const raw of list){const first=String(raw).split(";",1)[0],i=first.indexOf("=");if(i>0)jar.set(first.slice(0,i),first.slice(i+1));}
}
const cookieHeader=jar=>[...jar].map(([k,v])=>`${k}=${v}`).join("; ");
async function request(path,{jar,method="GET",headers={},body}={}){
 const h={...headers};if(jar?.size)h.Cookie=cookieHeader(jar);
 const r=await fetch(base+path,{method,headers:h,body,redirect:"manual"});
 if(jar)absorbCookies(r.headers,jar);
 return r;
}
async function login(who){
 const jar=new Map();
 const csrf=await request("/api/auth/csrf",{jar}),data=await csrf.json();
 const form=new URLSearchParams({csrfToken:String(data.csrfToken||""),email:users[who].email,password,callbackUrl:`${base}/dashboard/portal`});
 const r=await request("/api/auth/callback/credentials",{jar,method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form});
 check(`${who} portal login succeeds`,[200,302,303].includes(r.status)&&[...jar.keys()].some(k=>k.includes("session-token")),`status=${r.status}`);
 return jar;
}
const redirected=r=>[301,302,303,307,308].includes(r.status);

try{
 await prep();
 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(mockPort,"127.0.0.1",resolve)});
 const alpha=await login("alpha");
 const portal=await request("/dashboard/portal",{jar:alpha}),html=await portal.text();
 check("Alpha portal renders successfully",portal.status===200,`status=${portal.status}`);
 check("Alpha portal shows linked client identity",html.includes("Client Alpha"));
 check("Alpha portal shows own creative",html.includes("ALPHA_VISIBLE_CREATIVE"));
 check("Alpha portal excludes Beta creative",!html.includes("BETA_PRIVATE_CREATIVE"));
 check("Alpha portal excludes soft-deleted creative",!html.includes("ALPHA_DELETED_SECRET"));
 check("Alpha portal shows own finance only",html.includes("ALPHA-INVOICE")&&!html.includes("BETA-SECRET-INVOICE"));
 check("Alpha portal shows own calendar only",html.includes("ALPHA_CALENDAR_EVENT")&&!html.includes("BETA_PRIVATE_EVENT")&&!html.includes("ALPHA_DELETED_EVENT"));
 check("Alpha portal shows own notifications only",html.includes("ALPHA_NOTICE")&&!html.includes("BETA_PRIVATE_NOTICE"));

 const clients=await request("/api/clients",{jar:alpha}),cj=await clients.json();
 check("Client API returns exactly linked client",clients.status===200&&Array.isArray(cj.clients)&&cj.clients.length===1&&cj.clients[0]?.id===alphaClient,JSON.stringify(cj));
 const ownFiles=await request(`/api/files?clientId=${alphaClient}`,{jar:alpha}),of=await ownFiles.json();
 check("Client file API returns own-client files",ownFiles.status===200&&of.files?.some(x=>x.id===alphaFile)&&!of.files?.some(x=>x.id===betaFile),`status=${ownFiles.status}`);
 const betaFiles=await request(`/api/files?clientId=${betaClient}`,{jar:alpha});
 check("Cross-client file query is forbidden",betaFiles.status===403,`status=${betaFiles.status}`);
 const deletedTaskFiles=await request(`/api/files?taskId=${alphaDeletedTask}`,{jar:alpha});
 check("Soft-deleted task file query is forbidden",deletedTaskFiles.status===403,`status=${deletedTaskFiles.status}`);

 const ownTask=await request(`/dashboard/creative/${alphaTask}`,{jar:alpha}),ownHtml=await ownTask.text();
 check("Client can open owned creative detail",ownTask.status===200&&ownHtml.includes("ALPHA_VISIBLE_CREATIVE"),`status=${ownTask.status}`);
 check("Client detail shows public comment",ownHtml.includes("ALPHA_PUBLIC_COMMENT"));
 check("Client detail hides internal comment",!ownHtml.includes("ALPHA_INTERNAL_SECRET"));
 const foreignTask=await request(`/dashboard/creative/${betaTask}`,{jar:alpha}),foreignLoc=String(foreignTask.headers.get("location")||"");
 check("Cross-client creative detail redirects to portal",redirected(foreignTask)&&foreignLoc.includes("/dashboard/portal"),`status=${foreignTask.status} location=${foreignLoc}`);
 const deletedTask=await request(`/dashboard/creative/${alphaDeletedTask}`,{jar:alpha});
 check("Soft-deleted owned creative is not available",deletedTask.status===404,`status=${deletedTask.status}`);
 const patchForeign=await request("/api/files",{jar:alpha,method:"PATCH",headers:{"content-type":"application/json",origin:base},body:JSON.stringify({id:betaFile,op:"edit",name:"stolen.pdf",category:"CONTENT_PLAN",clientId:betaClient})});
 check("Client cannot mutate another client's file",patchForeign.status===403,`status=${patchForeign.status}`);
}catch(error){
 check("Client Portal E2E runner completed",false,String(error?.stack||error));
}finally{
 try{server.close();}catch{}
 await cleanup();
 await sql.end({timeout:1});
}

const failed=checks.filter(c=>!c.ok);
for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}${c.detail?` — ${c.detail}`:""}`);
console.log(`\n${checks.length-failed.length}/${checks.length} client-portal checks passed.`);
if(failed.length)process.exit(1);
