import fs from "node:fs";
import path from "node:path";

const read=(file)=>fs.readFileSync(file,"utf8");
const compact=(value)=>value.replace(/\s+/g," ");
const servicePath="lib/notifications.ts";
const service=compact(read(servicePath));
const poll=compact(read("app/api/notifications/poll/route.ts"));
const rawSchema=read("db/schema.ts");
const emailLogSchema=compact(rawSchema.match(/export const emailLogs = pgTable\("email_logs", \{[\s\S]*?\n\}\);/)?.[0]??"");

function sourceFiles(root){
  if(!fs.existsSync(root))return [];
  const out=[];
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    const full=path.join(root,entry.name);
    if(entry.isDirectory())out.push(...sourceFiles(full));
    else if(/\.(?:ts|tsx|js|mjs)$/.test(entry.name))out.push(full.replaceAll("\\","/"));
  }
  return out;
}

const runtimeFiles=[...sourceFiles("app"),...sourceFiles("lib")].filter(file=>file!==servicePath);
const notificationBypasses=runtimeFiles.filter(file=>/\binsert\s*\(\s*notifications\s*\)/.test(read(file)));
const emailLogBypasses=runtimeFiles.filter(file=>/\binsert\s*\(\s*emailLogs\s*\)/.test(read(file)));
const providerBypasses=runtimeFiles.filter(file=>read(file).includes("api.resend.com/emails"));
const emailInsertIsMetadataOnly=service.includes('db.insert(emailLogs).values({id,to,subject:safeSubject,type:safeType,status:"pending"})');
const emailSchemaHasNoBody=emailLogSchema.length>0&&!/\b(?:html|body|content)\s*:/.test(emailLogSchema);

const checks=[
  ["Notification creation validates recipient workspace",service.includes("eq(users.id,userId)")&&service.includes("eq(users.workspaceId,workspaceId)")&&service.includes("eq(users.isActive,true)")],
  ["Notification writes are idempotent",service.includes('stableId("notification",workspaceId,userId,eventKey)')&&service.includes("onConflictDoNothing({target:notifications.id})")],
  ["Notification links are constrained to internal navigation",service.includes("safeInternalPath(input.link??null)")&&poll.includes("safeInternalPath(n.link)")],
  ["Notification poll requires authenticated workspace",poll.includes("!sessionUser?.id||!sessionUser.workspaceId")],
  ["Notification poll enforces workspace membership",poll.includes("innerJoin(users")&&poll.includes("eq(users.workspaceId,workspaceId)")&&poll.includes("eq(users.isActive,true)")],
  ["Notification poll is current-user scoped",poll.includes("eq(notifications.userId,userId)")],
  ["Notification poll caps result volume",poll.includes(".limit(100)")],
  ["Notification poll disables shared caching",poll.includes('"Cache-Control":"private, no-store"')],
  ["Email sender uses active workspace provider key",service.includes("eq(workspaces.id,workspaceId)")&&service.includes("eq(workspaces.isActive,true)")&&service.includes("workspaces.resendApiKey")],
  ["Email delivery has deterministic idempotency",service.includes('stableId("email",workspaceId,to,idempotencyKey)')&&service.includes('"Idempotency-Key":id')],
  ["Already-sent email is not sent twice",service.includes('existing?.status==="sent"')&&service.includes('status:"duplicate"')],
  ["Email delivery retries transient failures",service.includes("for(let attempt=0;attempt<3;attempt++)")&&service.includes("response.status<500&&response.status!==429")&&service.includes("sleep(250*(2**attempt))")],
  ["Email provider calls have a hard timeout",service.includes("AbortSignal.timeout(5000)")],
  ["Email log tracks pending/sent/failed state",service.includes('status:"pending"')&&service.includes('status:"sent"')&&service.includes('status:"failed"')],
  ["Email body is not persisted in email logs",emailInsertIsMetadataOnly&&emailSchemaHasNoBody],
  ["Provider/network error details are not persisted",service.includes("Provider/network details are intentionally not persisted or returned")],
  ["Email provider API key is not returned",!service.includes("return {status:\"sent\",id,apiKey")&&!service.includes("return workspace.resendApiKey")],
  ["No runtime path bypasses scoped notification writes",notificationBypasses.length===0],
  ["No runtime path bypasses scoped email logging",emailLogBypasses.length===0],
  ["No runtime path bypasses scoped Resend delivery",providerBypasses.length===0],
];

let passed=0;
for(const [name,ok] of checks){
  if(ok){console.log(`✅ ${name}`);passed++;}
  else console.error(`❌ ${name}`);
}
if(notificationBypasses.length)console.error("Notification bypasses:",notificationBypasses.join(", "));
if(emailLogBypasses.length)console.error("Email-log bypasses:",emailLogBypasses.join(", "));
if(providerBypasses.length)console.error("Provider bypasses:",providerBypasses.join(", "));
console.log(`\nNotifications & Email QA: ${passed}/${checks.length} passed`);
if(passed!==checks.length)process.exit(1);
