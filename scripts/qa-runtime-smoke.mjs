const base=(process.env.BASE_URL||"http://127.0.0.1:3000").replace(/\/$/,"");
const hasDatabase=Boolean(String(process.env.DATABASE_URL||"").trim());
const checks=[];const check=(name,ok,detail="")=>checks.push({name,ok:Boolean(ok),detail});
async function req(path,init={}){return fetch(base+path,{redirect:"manual",...init})}
try{
 const health=await req("/api/health"),healthJson=await health.json().catch(()=>({}));
 if(hasDatabase){
  check("Built server health is 200 with configured database",health.status===200,`status=${health.status}`);
  check("Runtime database probe is healthy without public DB disclosure",healthJson.status==="healthy"&&!Object.prototype.hasOwnProperty.call(healthJson,"database")&&!Object.prototype.hasOwnProperty.call(healthJson,"version"),JSON.stringify(healthJson));
 }else{
  check("Health fails closed when CI has no database credentials",health.status===503&&healthJson.status==="degraded",`status=${health.status} body=${JSON.stringify(healthJson)}`);
  check("Degraded health keeps infrastructure details private",!Object.prototype.hasOwnProperty.call(healthJson,"database")&&!Object.prototype.hasOwnProperty.call(healthJson,"version"),JSON.stringify(healthJson));
 }
 check("Health response is no-store",String(health.headers.get("cache-control")||"").includes("no-store"));
 const login=await req("/login"),loginText=await login.text();
 check("Login page renders from built artifact",login.status===200&&/VIVIT|sign in|login/i.test(loginText),`status=${login.status}`);
 const robots=await req("/robots.txt");
 check("Private robots policy resolves",robots.status===200,`status=${robots.status}`);
 const dashboard=await req("/dashboard/clients");
 check("Protected dashboard redirects anonymous users",[302,303,307,308].includes(dashboard.status)&&String(dashboard.headers.get("location")||"").includes("/login"),`status=${dashboard.status} location=${dashboard.headers.get("location")}`);
 const search=await req("/api/search?q=test"),searchJson=await search.json().catch(()=>({}));
 check("Protected app API rejects anonymous users",search.status===401&&searchJson.error==="Unauthorized",`status=${search.status}`);
 const publicV1=await req("/api/v1/clients"),v1Json=await publicV1.json().catch(()=>({}));
 check("Public v1 rejects missing API key",publicV1.status===401&&/api key/i.test(String(v1Json.error||"")),`status=${publicV1.status}`);
 const csrf=await req("/api/bulk",{method:"POST",headers:{Origin:"https://evil.example","Content-Type":"application/json"},body:"{}"});
 check("Runtime CSRF rejects cross-origin mutation",csrf.status===403,`status=${csrf.status}`);
 const cors=await req("/api/v1/clients",{method:"OPTIONS",headers:{Origin:"https://evil.example","Access-Control-Request-Method":"GET"}});
 check("Disallowed v1 CORS origin is not echoed",cors.status===204&&!cors.headers.get("access-control-allow-origin"),`status=${cors.status} allow=${cors.headers.get("access-control-allow-origin")}`);
 const cron=await req("/api/cron/sync-media");
 check("Cron surface rejects missing secret at runtime",cron.status===401,`status=${cron.status}`);
 const sec=await req("/login");
 check("Runtime security headers deny framing",String(sec.headers.get("x-frame-options")||"").toUpperCase()==="DENY");
 check("Runtime security headers disable MIME sniffing",String(sec.headers.get("x-content-type-options")||"").toLowerCase()==="nosniff");
 check("Runtime CSP blocks framing",String(sec.headers.get("content-security-policy")||"").includes("frame-ancestors 'none'"));
}catch(error){check("Runtime smoke runner completed",false,String(error))}
const failed=checks.filter(c=>!c.ok);for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}${c.detail?` — ${c.detail}`:""}`);console.log(`\n${checks.length-failed.length}/${checks.length} runtime smoke checks passed.`);if(failed.length)process.exit(1);
