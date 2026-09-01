import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8"),client=read("app/dashboard/clients/[id]/page.tsx"),v2=read("app/api/media-control-v2/route.ts"),monthly=read("app/api/monthly-summary/[clientId]/route.ts"),pdf=read("app/api/pdf-report/[clientId]/route.ts"),v1=read("app/api/v1/metrics/route.ts"),legacy=read("app/api/media-control/route.ts"),checks=[
["Client displayed metrics ignore reported override",client.includes("const metric=(x:CampaignRow,_start:string,_end:string)")&&!client.includes("same&&Object.keys(r).length")],
["Media V2 uses TOTAL root daily truth",v2.includes('p.breakdownType==="TOTAL"')&&v2.includes('metricSource:"ERP_DAILY"')&&!v2.includes('m:MetricBundle|JsonRecord=reported&&same?')],
["Monthly labels generic Results",monthly.includes("🎯 Results")&&monthly.includes("Cost / Result")&&monthly.includes("leads:results")],
["PDF labels generic Results",pdf.includes("Total Results")&&pdf.includes("Cost / Result")],
["Public API canonical Results",v1.includes("results:Number(row.results||0)")&&v1.includes("leads:Number(row.results||0)")],
["Legacy sync deletes root TOTAL only",legacy.includes('eq(adPerformanceDaily.breakdownType,"TOTAL"),isNull(adPerformanceDaily.adSetId),isNull(adPerformanceDaily.adId)')],
];let bad=0;for(const [n,ok] of checks){console.log((ok?"PASS":"FAIL")+"  "+n);if(!ok)bad++}if(bad)process.exit(1);
