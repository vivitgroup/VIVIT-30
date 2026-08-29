import fs from "node:fs";
import path from "node:path";

const code=fs.readFileSync(path.join(process.cwd(),"app/api/recurring/route.ts"),"utf8"),checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});
const derivesWorkspace=code.includes('const workspaceId=String(session.user.workspaceId||"")')&&code.includes('if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403})');

check("Recurring endpoint is finance-role gated",code.includes('["SUPER_ADMIN","ACCOUNTANT"]'));
check("Recurring derives workspace from authenticated session",derivesWorkspace);
check("Recurring active clients are workspace scoped",code.includes("eq(clients.workspaceId,workspaceId)")&&code.includes("eq(clients.isActive,true)"));
check("Recurring duplicate lookup is workspace scoped",code.includes("eq(financeRecords.workspaceId,workspaceId)")&&code.includes("eq(financeRecords.clientId,client.id)"));
check("Recurring invoices persist live workspace id",code.includes("workspaceId,clientId:client.id"));
check("Recurring notification recipients are active Super Admins from the same workspace",code.includes("eq(users.workspaceId,workspaceId)")&&code.includes('eq(users.role,"SUPER_ADMIN")')&&code.includes("eq(users.isActive,true)")&&code.includes("userId:admin.id"));
check("Recurring invoice display uses workspace currency",code.includes("workspaces.currency")&&code.includes('currency=workspace?.currency||"EGP"'));
check("Recurring preview is workspace scoped",code.includes("eq(clients.workspaceId,workspaceId),eq(clients.isActive,true)"));
check("Recurring preview duplicate lookup is workspace scoped",code.includes("eq(financeRecords.workspaceId,workspaceId),eq(financeRecords.clientId,c.id)"));
check("Recurring preview is private no-store",code.includes('"Cache-Control":"private, no-store"'));

const failed=checks.filter(c=>!c.ok);
for(const c of checks)console.log(`${c.ok?"PASS":"FAIL"}  ${c.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} recurring finance checks passed.`);
if(failed.length)process.exit(1);
