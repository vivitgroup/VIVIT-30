import fs from "node:fs";const s=fs.readFileSync("app/api/assistant/route.ts","utf8"),checks=[
["Vivito reads effective roles",s.includes("effectiveRoles(session.user).map(String)")],
["Vivito unions client scopes",s.includes("Promise.all(roles.map(r=>clientScope")&&s.includes("new Map(scoped.flat()")],
["Vivito routes media by effective role",s.includes("mediaRole=contextRole")&&s.includes("mediaContext(mediaRole")],
["Vivito routes finance by effective role",s.includes("financeRole=contextRole")&&s.includes("financeContext(financeRole")],
["Vivito routes sales by effective role",s.includes("salesRole=contextRole")&&s.includes("salesContext(salesRole")],
["Vivito excludes deleted clients",s.includes("archived_at is null and deleted_at is null and account_manager_id")&&s.includes("archived_at is null and deleted_at is null and media_buyer_id")],
];let bad=0;for(const [n,ok] of checks){console.log((ok?"PASS":"FAIL")+"  "+n);if(!ok)bad++}if(bad)process.exit(1);