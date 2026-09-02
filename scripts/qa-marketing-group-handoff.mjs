import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const helper=read("lib/group-handoff.ts");
const auth=read("lib/auth.ts");
const receiver=read("app/api/integrations/vgroup-handoff/route.ts");
const migration=read("db/migrations/20260902_marketing_group_handoff_nonce.sql");

const checks=[
  ["dedicated secret",helper.includes("VGROUP_MARKETING_HANDOFF_SECRET")],
  ["HMAC SHA-256",helper.includes('createHmac("sha256"')],
  ["timing safe signature",helper.includes("timingSafeEqual")],
  ["marketing business unit only",helper.includes('business_unit!=="marketing"')],
  ["maximum 60 second lifetime",helper.includes("c.exp-c.iat>60")],
  ["normalized email",helper.includes("toLowerCase()")],
  ["active user required",helper.includes("!user.is_active")],
  ["approved user required",helper.includes('user.approval_status!=="APPROVED"')],
  ["valid role required",helper.includes("!isRole(user.role)")],
  ["active workspace required",helper.includes("verifyWorkspace")],
  ["single-use nonce",helper.includes("handoff_replay_detected")&&helper.includes("group_handoff_nonces")],
  ["no automatic user creation",!helper.includes("/rest/v1/users\"",helper.indexOf("method:\"POST\""))],
  ["Auth.js dedicated provider",auth.includes('id:"group-handoff"')&&auth.includes("authorizeGroupHandoff")],
  ["receiver disabled by default",receiver.includes('VGROUP_MARKETING_HANDOFF_RECEIVER_ENABLED!=="true"')],
  ["origin allowlist",receiver.includes("VGROUP_GROUP_ORIGIN")&&receiver.includes("HANDOFF_ORIGIN_REJECTED")],
  ["POST assertion body",receiver.includes("request.formData()")&&receiver.includes('form.get("assertion")')],
  ["GET cannot consume",receiver.includes('GET(){return errorResponse("METHOD_NOT_ALLOWED",405)')],
  ["no-store receiver",receiver.includes('"Cache-Control":"no-store, max-age=0"')],
  ["nonce primary key",migration.includes("nonce_hash text primary key")],
  ["nonce RLS",migration.includes("enable row level security")&&migration.includes("revoke all")],
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed++}
console.log(`Marketing Group handoff: ${checks.length-failed}/${checks.length} contracts passed`);
if(failed)process.exit(1);
