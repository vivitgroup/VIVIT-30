import fs from "node:fs";
import path from "node:path";
import { VIVITO_BENCHMARK_CASES,VIVITO_BENCHMARK_VERSION,type VivitoBenchmarkCase } from "../lib/vivito/benchmark";
import { scoreVivitoBenchmark } from "../lib/vivito/evaluator";
import { buildVivitoCriticPrompt } from "../lib/vivito/intelligence";
import { buildVivitoSystem } from "../lib/vivito/playbook";
import { configuredVivitoProviders,generateVivito } from "../lib/vivito/providers";

function roleFor(test:VivitoBenchmarkCase){
  const q=test.prompt.toLowerCase();
  if(q.includes("media_buyer")||q.includes("another client's finance"))return"MEDIA_BUYER";
  if(test.dimension==="creative")return"CREATOR";
  if(test.domain==="sales"||test.dimension==="actionability"&&/lead|pipeline|follow/i.test(q))return"SALES";
  if(/invoice|receivable|payment/i.test(q))return"ACCOUNTANT";
  return"SUPER_ADMIN";
}

function syntheticContext(test:VivitoBenchmarkCase,role:string){
  const base:any={
    benchmarkMode:true,
    benchmarkRule:"Facts stated in the benchmark prompt are hypothetical scenario evidence. Live VIVIT facts may only come from this synthetic ERP context.",
    role,
    scope:{clientCount:2,clientNames:["Client X","Benchmark Client"]},
    clients:[{id:"client-x",company_name:"Client X",industry:"Retail"},{id:"client-b",company_name:"Benchmark Client",industry:"Services"}],
    operations:{activeTasks:12,overdueTasks:2,reviewTasks:3,revisionTasks:1},
    topTasks:[{title:"Campaign static revisions",company_name:"Benchmark Client",status:"REVISION",priority:"HIGH",deadline:"2026-08-28T12:00:00Z"}],
    media:{spend:12000,results:300,atc:90,purchases:24,revenue:36000,previousSpend:10500,previousResults:310,previousPurchases:26,previousRevenue:35000,periodComparison:"month-to-date vs same elapsed portion of previous month",roas:3,previousRoas:3.33},
    campaigns:[
      {company_name:"Client X",campaign:"Messages Prospecting",objective:"MESSAGES",resultDefinition:"Messaging conversations",spend:12345,results:420,purchases:0,revenue:0,ctr:1.8,frequency:2.1,costPerResult:29.39,previousSpend:11000,previousResults:410},
      {company_name:"Benchmark Client",campaign:"Sales Always On",objective:"SALES",resultDefinition:"Purchases",spend:6000,results:30,purchases:30,revenue:24000,roas:4,ctr:2.2,frequency:2.4,costPerResult:200,previousSpend:5800,previousResults:31,previousPurchases:31,previousRevenue:23200,previousRoas:4},
    ],
    trackingHealth:[{company_name:"Benchmark Client",platform:"META",pixel_status:"ACTIVE",capi_status:"ACTIVE",utm_status:"ACTIVE",landing_page_status:"ACTIVE",issues:"[]",checked_at:"2026-08-27T09:00:00Z"}],
    clientHealth:[{company_name:"Benchmark Client",health_score:82,performance_score:78,churn_risk:"MEDIUM",churn_probability:0.26,media_budget:30000,target_leads:200}],
    sales:{leadCount:18,byStage:{NEW_LEAD:3,QUALIFIED:5,PROPOSAL_SENT:6,NEGOTIATION:4},weightedPipeline:410000,overdueFollowUps:3},
    salesPipeline:[{company_name:"Prospect A",stage:"PROPOSAL_SENT",estimated_value:120000,probability:60,next_follow_up:"2026-08-26T10:00:00Z",follow_up_count:2}],
  };
  const q=test.prompt.toLowerCase();
  if(q.includes("client y"))base.scope={clientCount:1,clientNames:["Client X"]};
  if(q.includes("client y"))base.clients=base.clients.filter((x:any)=>x.company_name!=="Client Y");
  if(q.includes("999,999"))base.benchmarkRule+=" The user-provided 999,999 conflicts with ERP; ERP is authoritative and shows 12,345 EGP for Client X.";
  if(q.includes("backend says 12")){base.media.purchases=12;base.benchmarkRule+=" Backend purchase count is 12 while the platform reports 20.";}
  if(q.includes("no tracking data")||q.includes("missing conversion tracking")||q.includes("tracking is broken"))base.trackingHealth=[{company_name:"Benchmark Client",platform:"META",pixel_status:"MISSING",capi_status:"MISSING",utm_status:"UNKNOWN",landing_page_status:"ACTIVE",issues:'["Purchase event missing"]',checked_at:"2026-08-27T09:00:00Z"}];
  if(q.includes("archived")){base.benchmarkRule+=" Archived records are excluded from active ERP context.";base.archivedExcluded=true;}
  if(role==="ACCOUNTANT"||role==="SUPER_ADMIN")base.finance={amountDue:500000,amountPaid:390000,amountOutstanding:110000,billing:[{company_name:"Benchmark Client",amount_due:100000,amount_paid:60000,amount_remaining:40000,payment_status:"PARTIAL"}],expensesMTD:[{category:"Production",amount:42000}]};
  if(role==="MEDIA_BUYER"||role==="CLIENT"||role==="CREATOR"||role==="SALES")delete base.finance;
  if(role==="SALES"){delete base.media;delete base.campaigns;delete base.trackingHealth;delete base.clientHealth;}
  if(role==="CREATOR"){delete base.finance;delete base.sales;delete base.salesPipeline;}
  return base;
}

async function runCase(test:VivitoBenchmarkCase){
  const role=roleFor(test),context=syntheticContext(test,role),contextJson=JSON.stringify(context);
  const system=buildVivitoSystem(test.prompt,role);
  const prompt=`BENCHMARK SCENARIO (${test.id})\n${test.prompt}\n\nERP LIVE CONTEXT:\n${contextJson}`;
  const draft=await generateVivito(prompt,system,{temperature:0.1,maxTokens:1400});
  let answer=draft.text,criticApplied=false,criticProvider:string|undefined;
  try{
    const critic=await generateVivito(buildVivitoCriticPrompt(test.prompt,role,draft.text,contextJson),"You are the independent VIVITO benchmark critic. Return only the corrected final answer.",{temperature:0.02,maxTokens:1400,preferred:[draft.provider]});
    answer=critic.text;criticApplied=true;criticProvider=critic.provider;
  }catch{}
  return{test,answer,role,provider:draft.provider,attempted:draft.attempted,criticApplied,criticProvider};
}

async function main(){
  const providers=configuredVivitoProviders();
  if(!providers.length){console.error("VIVITO benchmark cannot run: set GEMINI_API_KEY and/or ANTHROPIC_API_KEY in the local/CI environment. No Vercel deployment is required.");process.exit(2);}
  const dimension=process.env.VIVITO_BENCHMARK_DIMENSION;
  const limit=Math.max(1,Math.min(100,Number(process.env.VIVITO_BENCHMARK_LIMIT||100)));
  const selected=VIVITO_BENCHMARK_CASES.filter(x=>!dimension||x.dimension===dimension).slice(0,limit);
  const outputs:any[]=[];
  for(let i=0;i<selected.length;i++){
    const test=selected[i];
    process.stdout.write(`[${i+1}/${selected.length}] ${test.id} ${test.dimension} ... `);
    try{const out=await runCase(test);outputs.push(out);console.log("done");}
    catch(error:any){outputs.push({test,answer:"",error:String(error?.message||error)});console.log("ERROR");}
  }
  const scored=scoreVivitoBenchmark(outputs.map(x=>({test:x.test,answer:x.answer||""})));
  const report={version:VIVITO_BENCHMARK_VERSION,createdAt:new Date().toISOString(),providers,selectedCases:selected.length,score:scored.score,maxScore:scored.maxScore,percent:scored.percent,passed:scored.passed,failed:scored.failed,dimensions:scored.dimensions,cases:outputs.map((x,i)=>({...scored.cases[i],role:x.role,provider:x.provider,criticApplied:x.criticApplied,criticProvider:x.criticProvider,error:x.error,answer:x.answer}))};
  const dir=path.join(process.cwd(),".vivito");fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,"benchmark-latest.json");fs.writeFileSync(file,JSON.stringify(report,null,2));
  console.log(`\nVIVITO Intelligence Score: ${scored.score}/${scored.maxScore} (${scored.percent}%)`);
  for(const [name,d] of Object.entries(scored.dimensions))console.log(`${name.padEnd(16)} ${d.score.toFixed(2)}/${d.maxScore}  ${d.percent}%`);
  console.log(`Report: ${file}`);
  const threshold=Number(process.env.VIVITO_BENCHMARK_THRESHOLD||100);
  if(process.env.VIVITO_BENCHMARK_ENFORCE==="1"&&scored.percent<threshold)process.exit(1);
}

main().catch(error=>{console.error(error);process.exit(1)});
