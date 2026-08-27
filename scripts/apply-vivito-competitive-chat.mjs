import fs from "node:fs";
const p="app/api/assistant/route.ts";let s=fs.readFileSync(p,"utf8");
const imp='import {buildVivitoArtifactPlannerSystem,likelyVivitoArtifactIntent,likelyVivitoResearchIntent,likelyVivitoVisionIntent,parseVivitoArtifactProposal,requestedArtifactKind} from "@/lib/vivito/artifact-router";';
const add=imp+'\nimport {buildCompetitivePlannerSystem,likelyCompetitiveChatIntent,parseCompetitiveChatPlan} from "@/lib/vivito/competitive-chat";\nimport {buildDailyCompetitiveReport,platformFromUrl} from "@/lib/vivito/competitive-intelligence";';
if(!s.includes('from "@/lib/vivito/competitive-chat"')){if(!s.includes(imp))throw new Error("competitive import anchor missing");s=s.replace(imp,add)}
const anchor=' if(likelyVivitoArtifactIntent(question)){';
const block=` if(likelyCompetitiveChatIntent(question)){
  try{
   const planned=await generateVivito(question+"\\n\\nAUTHORIZED CLIENTS: "+JSON.stringify(clients.map((c:any)=>c.company_name)),buildCompetitivePlannerSystem(),{temperature:0,maxTokens:1400});
   const cp=parseCompetitiveChatPlan(planned.text);
   if(cp){const client=resolveAuthorizedClient(clients,cp.clientName);if(!client)return NextResponse.json({answer:isArabic(question)?"حدد اسم العميل/البراند اللي هنراقب المنافسين بتوعه بوضوح.":"Specify the client/brand whose competitors should be monitored.",mode:"competitive-clarification",intelligence:"VIVITO"},{headers:{"Cache-Control":"private, no-store"}});
    if(cp.op==="report"){const report=await buildDailyCompetitiveReport(String(client.id));return NextResponse.json({answer:report.summary,mode:"competitive-report",intelligence:"VIVITO",competitiveReport:report,sources:["VIVITO Competitive Intelligence","Public social snapshots"]},{headers:{"Cache-Control":"private, no-store"}})}
    let added=0;for(const comp of cp.competitors){if(!comp.urls.length)continue;const w=Array.from(await db.execute(sql\`insert into competitor_watchlists(workspace_id,client_id,competitor_name,created_by) values(\${W},\${String(client.id)},\${comp.name||"Competitor"},\${userId}) returning id\`) as any)[0] as any;for(const url of comp.urls){const platform=platformFromUrl(url);await db.execute(sql\`insert into competitor_social_profiles(watchlist_id,platform,profile_url) values(\${String(w.id)},\${platform},\${url}) on conflict do nothing\`);added++}}
    return NextResponse.json({answer:isArabic(question)?"تم تفعيل مراقبة المنافسين: "+added+" حساب/رابط. VIVITO هيخزن snapshots يومية ويطلع التغييرات والتقرير.":"Competitive monitoring enabled for "+added+" social profile(s). Daily snapshots and deltas are now configured.",mode:"competitive-setup",intelligence:"VIVITO",sources:["VIVITO Competitive Intelligence"]},{headers:{"Cache-Control":"private, no-store"}})
   }
  }catch(error:any){return NextResponse.json({answer:isArabic(question)?"مش قادر أفعّل المراقبة بالروابط دي. اتأكد إن الروابط عامة وصحيحة.":"I could not configure monitoring from those links. Use valid public social URLs.",mode:"competitive-error",intelligence:"VIVITO"},{headers:{"Cache-Control":"private, no-store"}})}
 }

`;
if(!s.includes('mode:"competitive-setup"')){if(!s.includes(anchor))throw new Error("competitive route anchor missing");s=s.replace(anchor,block+anchor)}
fs.writeFileSync(p,s);console.log("competitive chat integration applied");
