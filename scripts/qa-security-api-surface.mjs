import fs from "node:fs";
import path from "node:path";

const root=path.join(process.cwd(),"app","api");
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.name==="route.ts"||entry.name==="route.js")files.push(p)}}
walk(root);

const publicMutationAllowlist=new Set([
  "app/api/signup/route.ts",
  "app/api/signup/otp/route.ts",
  "app/api/password/forgot/route.ts",
  "app/api/password/reset/route.ts",
]);
const rel=p=>path.relative(process.cwd(),p).replaceAll("\\","/");
const mutation=/export\s+(?:async\s+function|const)\s+(POST|PUT|PATCH|DELETE)\b/g;
const findings=[];
for(const file of files){
  const name=rel(file),source=fs.readFileSync(file,"utf8"),methods=[...source.matchAll(mutation)].map(m=>m[1]);
  if(!methods.length)continue;
  if(publicMutationAllowlist.has(name))continue;
  if(name.startsWith("app/api/cron/"))continue; // proxy.ts enforces CRON_SECRET before route execution.
  const hasAuth=/\bauth\s*\(/.test(source)||/\bsessionScope\s*\(/.test(source)||/\brequire(?:Role|Session|Auth)\s*\(/.test(source);
  if(!hasAuth)findings.push(`${name}: ${[...new Set(methods)].join(",")} has no explicit route authentication marker`);
}
console.log(`Scanned ${files.length} API route files for mutation authentication.`);
if(findings.length){for(const finding of findings)console.log(`FAIL  ${finding}`);process.exit(1)}
console.log("PASS  Every non-public API mutation is authenticated or centrally cron-secret protected.");
