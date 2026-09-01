import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8"),client=read("app/dashboard/clients/[id]/page.tsx"),legacy=read("app/api/media-control/route.ts"),checks=[
["Client detail workspace fenced",client.includes("c.workspace_id=${workspaceId}")&&client.includes("c.deleted_at is null")],
["Client activity workspace fenced",client.includes("workspace_id=${workspaceId} and is_active=true and archived_at is null and deleted_at is null")],
["Legacy media campaign lifecycle fenced",legacy.includes("workspace_id=${ctx.workspaceId} and archived_at is null and deleted_at is null")],
["Legacy media returns TOTAL root rows",legacy.includes('eq(adPerformanceDaily.breakdownType,"TOTAL")')&&legacy.includes("isNull(adPerformanceDaily.adSetId)")&&legacy.includes("isNull(adPerformanceDaily.adId)")],
["Legacy media writes explicit workspace",legacy.includes("workspaceId:ctx.workspaceId,clientId:body.clientId")],
];let bad=0;for(const [n,ok] of checks){console.log((ok?"PASS":"FAIL")+"  "+n);if(!ok)bad++}if(bad)process.exit(1);
