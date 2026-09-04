import fs from "node:fs";
import path from "node:path";

const root=path.join(process.cwd(),"app","api");
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.name==="route.ts"||entry.name==="route.js")files.push(p)}}
walk(root);

const rel=p=>path.relative(process.cwd(),p).replaceAll("\\","/");
const mutation=/export\s+(?:async\s+function|const)\s+(POST|PUT|PATCH|DELETE)\b/g;
const publicMutationValidators=new Map([
  ["app/api/auth/[...nextauth]/route.ts",source=>source.includes('import { handlers } from "@/lib/auth"')&&source.includes("export const GET = handlers.GET")&&source.includes("export const POST = handlers.POST")],
  ["app/api/signup/route.ts",source=>source.includes("consumeAuthRateLimit")&&source.includes("security_signup_attempt")&&source.includes("pg_advisory_xact_lock")&&source.includes('if(already)return "EMAIL_ALREADY_REGISTERED"')],
  ["app/api/signup/otp/route.ts",source=>source.includes("consumeAuthRateLimit")&&source.includes("security_signup_otp_burst")&&source.includes("security_signup_otp_hourly")&&source.includes("pg_advisory_xact_lock")&&source.includes("OTP_COOLDOWN")],
  ["app/api/password/forgot/route.ts",source=>source.includes("consumeAuthRateLimit")&&source.includes("security_password_reset_request")&&source.includes("pg_advisory_xact_lock")&&source.includes("password-reset:")],
  ["app/api/password/reset/route.ts",source=>source.includes('createHash("sha256")')&&source.includes("isNull(passwordResetTokens.usedAt)")&&source.includes("claimed.length!==1")&&source.includes("db.transaction(async tx=>")],
  ["app/api/integrations/vgroup-handoff/route.ts",source=>source.includes('VGROUP_MARKETING_HANDOFF_RECEIVER_ENABLED!=="true"')&&source.includes("VGROUP_GROUP_ORIGIN")&&source.includes('signIn("group-handoff"')&&source.includes("HANDOFF_AUTH_FAILED")],
  ["app/api/vgroup/auth/login/route.ts",source=>source.includes("auth_rate_limits")&&source.includes("hashRateLimitKey")&&source.includes("grant_type=password")&&source.includes("VGROUP_ACCESS_COOKIE")&&source.includes("VGROUP_REFRESH_COOKIE")],
  ["app/api/vgroup/auth/logout/route.ts",source=>source.includes("VGROUP_ACCESS_COOKIE")&&source.includes("VGROUP_REFRESH_COOKIE")&&source.includes("maxAge:0")],
  ["app/api/vgroup/auth/refresh/route.ts",source=>source.includes("VGROUP_REFRESH_COOKIE")&&source.includes("grant_type=refresh_token")&&source.includes("VGROUP_ACCESS_COOKIE")&&source.includes("Cache-Control")],
]);
const findings=[];
for(const file of files){
  const name=rel(file),source=fs.readFileSync(file,"utf8"),methods=[...source.matchAll(mutation)].map(m=>m[1]);
  if(!methods.length)continue;
  const validatePublic=publicMutationValidators.get(name);
  if(validatePublic){if(!validatePublic(source))findings.push(`${name}: public mutation exception no longer satisfies its required security contract`);continue;}
  if(name.startsWith("app/api/cron/"))continue; // proxy.ts enforces CRON_SECRET before route execution.
  const hasAuth=/\bauth\s*\(/.test(source)
    ||/\bsessionScope\s*\(/.test(source)
    ||/\brequire(?:Role|Session|Auth|ApiPermission|VGroupSession|ApiGroupSuperAdmin)\s*\(/.test(source)
    ||/\bapiPermissionOrResponse\s*\(/.test(source)
    ||/\bgetVGroupSession\s*\(/.test(source)
    ||/\bVGROUP_CRON_SECRET\b/.test(source);
  if(!hasAuth)findings.push(`${name}: ${[...new Set(methods)].join(",")} has no explicit route authentication marker`);
}
console.log(`Scanned ${files.length} API route files for mutation authentication.`);
if(findings.length){for(const finding of findings)console.log(`FAIL  ${finding}`);process.exit(1)}
console.log("PASS  Every API mutation is authenticated, centrally cron-secret protected, or a validated public auth protocol endpoint.");

const authAbuse=fs.readFileSync(path.join(process.cwd(),"lib/auth-abuse.ts"),"utf8"),signup=fs.readFileSync(path.join(process.cwd(),"app/api/signup/route.ts"),"utf8");
const regressionChecks=[
  ["Public auth abuse logs use an explicit tenant-neutral scope",authAbuse.includes('PUBLIC_AUTH_AUDIT_SCOPE="__public_auth__"')&&authAbuse.includes("workspaceId:PUBLIC_AUTH_AUDIT_SCOPE")],
  ["Signup duplicate is rechecked under the transaction lock",signup.includes("tx.select({id:users.id})")&&signup.includes('if(already)return "EMAIL_ALREADY_REGISTERED"')],
];
for(const [name,ok] of regressionChecks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(!ok)process.exitCode=1}
if(process.exitCode)process.exit(process.exitCode);
