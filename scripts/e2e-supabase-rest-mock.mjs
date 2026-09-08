import http from "node:http";
import fs from "node:fs";

const port=Number(process.env.E2E_SUPABASE_PORT||54321);
const fixturePath=process.env.E2E_USERS_FILE||"/tmp/vivit-e2e-users.json";
const serviceKey=process.env.SUPABASE_SERVICE_KEY||"e2e-service-key";
const users=JSON.parse(fs.readFileSync(fixturePath,"utf8"));
const eqValue=v=>String(v||"").startsWith("eq.")?String(v).slice(3):null;
const json=(res,status,body)=>{res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(body))};
const server=http.createServer((req,res)=>{
 const auth=String(req.headers.authorization||"");const apikey=String(req.headers.apikey||"");
 if(apikey!==serviceKey||auth!==`Bearer ${serviceKey}`)return json(res,401,{message:"Unauthorized"});
 const url=new URL(req.url||"/",`http://127.0.0.1:${port}`);
 if(url.pathname==="/rest/v1/users"){
  const email=eqValue(url.searchParams.get("email")),id=eqValue(url.searchParams.get("id"));
  const rows=users.filter(u=>(!email||u.email===email)&&(!id||u.id===id));return json(res,200,rows);
 }
 if(url.pathname==="/rest/v1/audit_logs"||url.pathname==="/rest/v1/user_role_assignments"||url.pathname==="/rest/v1/user_permission_grants")return json(res,200,[]);
 return json(res,404,{message:"Not found"});
});
server.listen(port,"127.0.0.1",()=>console.log(`E2E Supabase REST mock listening on ${port}`));
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>server.close(()=>process.exit(0)));
