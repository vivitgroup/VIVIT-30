import http from "node:http";
import bcrypt from "bcryptjs";

const base=(process.env.BASE_URL||"http://127.0.0.1:3000").replace(/\/$/,"");
const mockPort=Number(process.env.MOCK_SUPABASE_PORT||4599);
const password="RoleAudit!2026";
const workspace="__role_audit__";
const roles=["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"];
const users=Object.fromEntries(await Promise.all(roles.map(async(role,i)=>{
 const id=`00000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`;
 return [role,{id,name:`${role} Audit`,email:`${role.toLowerCase()}@role-audit.invalid`,password:await bcrypt.hash(password,8),role,workspace_id:workspace,is_active:true,approval_status:"APPROVED"}];
})));

const server=http.createServer((req,res)=>{
 const u=new URL(req.url||"/",`http://127.0.0.1:${mockPort}`);
 res.setHeader("content-type","application/json");
 if(u.pathname==="/rest/v1/users"){
  const emailFilter=u.searchParams.get("email")||"";
  const idFilter=u.searchParams.get("id")||"";
  const email=emailFilter.startsWith("eq.")?decodeURIComponent(emailFilter.slice(3)):null;
  const id=idFilter.startsWith("eq.")?decodeURIComponent(idFilter.slice(3)):null;
  const row=Object.values(users).find(x=>(email&&x.email===email)||(id&&x.id===id));
  if(!row){res.end("[]");return}
  const select=String(u.searchParams.get("select")||"").split(",").filter(Boolean);
  const projected=select.length?Object.fromEntries(select.map(k=>[k,row[k]??null])):row;
  res.end(JSON.stringify([projected]));return;
 }
 if(u.pathname==="/rest/v1/audit_logs"){res.end("[]");return}
 res.statusCode=404;res.end(JSON.stringify({error:"not_found"}));
});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(mockPort,"127.0.0.1",resolve)});

const checks=[];const check=(name,ok,detail="")=>checks.push({name,ok:Boolean(ok),detail});
const cookiePairs=new Map();
function absorbCookies(headers,jar){
 const list=typeof headers.getSetCookie==="function"?headers.getSetCookie():[headers.get("set-cookie")].filter(Boolean);
 for(const raw of list){const first=String(raw).split(";",1)[0],i=first.indexOf("=");if(i>0)jar.set(first.slice(0,i),first.slice(i+1));}
}
const cookieHeader=jar=>[...jar].map(([k,v])=>`${k}=${v}`).join("; ");
async function request(path,{jar,method="GET",headers={},body}={}){
 const h={...headers};if(jar?.size)h.Cookie=cookieHeader(jar);
 const r=await fetch(base+path,{method,headers:h,body,redirect:"manual"});if(jar)absorbCookies(r.headers,jar);return r;
}
async function login(role){
 const jar=new Map();
 const csrf=await request("/api/auth/csrf",{jar});const data=await csrf.json();
 const form=new URLSearchParams({csrfToken:String(data.csrfToken||""),email:users[role].email,password,callbackUrl:`${base}/dashboard`});
 const r=await request("/api/auth/callback/credentials",{jar,method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form});
 check(`${role} credentials login succeeds`,[200,302,303].includes(r.status)&&[...jar.keys()].some(k=>k.includes("session-token")),`status=${r.status} cookies=${[...jar.keys()].join(",")}`);
 const session=await request("/api/auth/session",{jar});const sj=await session.json().catch(()=>({}));
 check(`${role} session has exact role/workspace and remains authorized`,sj?.user?.role===role&&sj?.user?.workspaceId===workspace&&sj?.user?.authValid===true,JSON.stringify(sj));
 return jar;
}
const homes={SUPER_ADMIN:null,ACCOUNT_MANAGER:"/dashboard/universe",MEDIA_BUYER:"/dashboard/universe",CREATOR:"/dashboard/creative",ACCOUNTANT:"/dashboard/finance",SALES:"/dashboard/sales",CLIENT:"/dashboard/portal"};
const allowed={
 SUPER_ADMIN:["/dashboard/executive","/dashboard/team","/dashboard/finance","/dashboard/media","/dashboard/sales","/dashboard/creative","/dashboard/reports","/dashboard/archive"],
 ACCOUNT_MANAGER:["/dashboard/universe","/dashboard/media","/dashboard/creative","/dashboard/reports","/dashboard/whatsapp","/dashboard/archive"],
 MEDIA_BUYER:["/dashboard/universe","/dashboard/media","/dashboard/creative","/dashboard/reports","/dashboard/whatsapp","/dashboard/archive"],
 CREATOR:["/dashboard/creative","/dashboard/creative/quality","/dashboard/calendar","/dashboard/ai-studio","/dashboard/archive"],
 ACCOUNTANT:["/dashboard/finance","/dashboard/contracts","/dashboard/clients/accounts-payment","/dashboard/reports","/dashboard/clients","/dashboard/archive"],
 SALES:["/dashboard/sales","/dashboard/calendar","/dashboard/reports","/dashboard/whatsapp","/dashboard/archive"],
 CLIENT:["/dashboard/portal","/dashboard/calendar","/dashboard/ai-studio","/dashboard/files","/dashboard/settings"]
};
const denied={
 ACCOUNT_MANAGER:["/dashboard/finance","/dashboard/team","/dashboard/sales","/dashboard/portal"],
 MEDIA_BUYER:["/dashboard/finance","/dashboard/team","/dashboard/sales","/dashboard/portal","/dashboard/creative/quality"],
 CREATOR:["/dashboard/finance","/dashboard/team","/dashboard/media","/dashboard/sales","/dashboard/reports","/dashboard/portal"],
 ACCOUNTANT:["/dashboard/team","/dashboard/media","/dashboard/sales","/dashboard/creative","/dashboard/portal"],
 SALES:["/dashboard/finance","/dashboard/team","/dashboard/media","/dashboard/creative","/dashboard/clients","/dashboard/portal"],
 CLIENT:["/dashboard/finance","/dashboard/team","/dashboard/media","/dashboard/sales","/dashboard/clients","/dashboard/reports","/dashboard/executive","/dashboard/archive"]
};
function isRedirect(r){return [301,302,303,307,308].includes(r.status)}
try{
 for(const role of roles){
  const jar=await login(role);cookiePairs.set(role,jar);
  const home=await request("/dashboard",{jar});const loc=String(home.headers.get("location")||"");
  if(homes[role])check(`${role} dashboard home redirects to role home`,isRedirect(home)&&loc.includes(homes[role]),`status=${home.status} location=${loc}`);
  else check("SUPER_ADMIN dashboard is not role-redirected",!isRedirect(home)||!loc.includes("/dashboard/portal"),`status=${home.status} location=${loc}`);
  for(const path of allowed[role]){
   const r=await request(path,{jar});const l=String(r.headers.get("location")||"");
   check(`${role} allowed route ${path} is not RBAC-redirected`,!isRedirect(r)||(!l.includes("/dashboard")&&!l.includes("/login")),`status=${r.status} location=${l}`);
  }
  for(const path of denied[role]||[]){
   const r=await request(path,{jar});const l=String(r.headers.get("location")||"");
   check(`${role} denied route ${path} is blocked`,isRedirect(r)&&(l.includes("/dashboard")||l.includes("/login")),`status=${r.status} location=${l}`);
  }
 }
 const clientJar=cookiePairs.get("CLIENT");
 const fakeTask="11111111-1111-4111-8111-111111111111";
 const detail=await request(`/dashboard/creative/${fakeTask}`,{jar:clientJar});
 check("CLIENT may reach task-detail route shape for page-level ownership validation",!isRedirect(detail)||!String(detail.headers.get("location")||"").includes("/dashboard/portal"),`status=${detail.status} location=${detail.headers.get("location")}`);
 const clientOAuth=await request("/api/ad-oauth/meta/start?clientId=11111111-1111-4111-8111-111111111111",{jar:clientJar});
 check("CLIENT OAuth API is forbidden",clientOAuth.status===403,`status=${clientOAuth.status}`);
 const creatorOAuth=await request("/api/ad-oauth/meta/start?clientId=11111111-1111-4111-8111-111111111111",{jar:cookiePairs.get("CREATOR")});
 check("CREATOR OAuth API is forbidden",creatorOAuth.status===403,`status=${creatorOAuth.status}`);
}catch(error){check("Role-by-role runtime runner completed",false,String(error))}
finally{await new Promise(resolve=>server.close(resolve));}
const failed=checks.filter(c=>!c.ok);for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}${c.detail?` — ${c.detail}`:""}`);console.log(`\n${checks.length-failed.length}/${checks.length} role-by-role E2E checks passed.`);if(failed.length)process.exit(1);
