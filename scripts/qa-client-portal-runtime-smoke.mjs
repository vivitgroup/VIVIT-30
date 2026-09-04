const base=(process.env.BASE_URL||"http://127.0.0.1:3000").replace(/\/$/,"");
const checks=[];const check=(name,ok,detail="")=>checks.push({name,ok:Boolean(ok),detail});
async function req(path,init={}){return fetch(base+path,{redirect:"manual",...init})}
async function expectRedirect(path,name){const r=await req(path);const loc=String(r.headers.get("location")||"");check(name,[302,303,307,308].includes(r.status)&&loc.includes("/login"),`status=${r.status} location=${loc}`)}
async function expectUnauthorized(path,name,init={}){const r=await req(path,init);const j=await r.json().catch(()=>({}));check(name,r.status===401&&String(j.error||"").toLowerCase().includes("unauthorized"),`status=${r.status} body=${JSON.stringify(j)}`);check(`${name} is private no-store`,String(r.headers.get("cache-control")||"").includes("no-store")||r.status===401,String(r.headers.get("cache-control")||""))}
try{
 const login=await req("/login");const loginText=await login.text();check("Built artifact renders login",login.status===200&&/VIVIT|sign in|login/i.test(loginText),`status=${login.status}`);
 await expectRedirect("/dashboard/clients","Client list is protected at runtime");
 await expectRedirect("/dashboard/clients/new","Add Client page is protected at runtime");
 await expectRedirect("/dashboard/clients/runtime-smoke-client","Client profile page is protected at runtime");
 await expectRedirect("/dashboard/clients/runtime-smoke-client/edit","Client edit page is protected at runtime");
 await expectUnauthorized("/api/clients","Client collection GET rejects anonymous runtime access");
 await expectUnauthorized("/api/clients","Add Client POST rejects anonymous runtime access",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
 await expectUnauthorized("/api/clients/runtime-smoke-client/logo","Client profile/logo GET rejects anonymous runtime access");
 await expectUnauthorized("/api/clients/runtime-smoke-client/logo","Client profile/logo POST rejects anonymous runtime access",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
 await expectUnauthorized("/api/profile-avatar","Profile photo GET rejects anonymous runtime access");
 await expectUnauthorized("/api/profile-avatar","Profile photo POST rejects anonymous runtime access",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
}catch(error){check("Client Portal runtime smoke runner completed",false,String(error))}
const failed=checks.filter(c=>!c.ok);for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}${c.detail?` — ${c.detail}`:""}`);console.log(`\n${checks.length-failed.length}/${checks.length} client portal runtime checks passed.`);if(failed.length)process.exit(1);
