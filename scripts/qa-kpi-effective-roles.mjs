import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8"),client=read("app/dashboard/clients/[id]/page.tsx"),v2=read("app/api/media-control-v2/route.ts"),legacy=read("app/api/media-control/route.ts"),checks=[
["Client workspace effective roles",client.includes("effectiveRoles(s.user)")&&client.includes('roles.includes("ACCOUNT_MANAGER")')],
["Client workspace effective finance",client.includes("canFinance=roles.some")],
["Media V2 effective roles",v2.includes("effectiveRoles(s.user)")&&v2.includes("or(eq(clients.mediaBuyerId,userId),eq(clients.accountManagerId,userId))")],
["Legacy media effective roles",legacy.includes("effectiveRoles(session.user)")&&legacy.includes("ownerScope")],
];let bad=0;for(const [n,ok] of checks){console.log((ok?"PASS":"FAIL")+"  "+n);if(!ok)bad++}if(bad)process.exit(1);
