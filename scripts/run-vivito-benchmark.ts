import fs from "node:fs";
import path from "node:path";
import { VIVITO_BENCHMARK_CASES,VIVITO_BENCHMARK_VERSION,type VivitoBenchmarkCase } from "../lib/vivito/benchmark";
import { scoreVivitoAnswer,scoreVivitoBenchmark } from "../lib/vivito/evaluator";
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

type SyntheticContext={
  benchmarkMode:boolean;benchmarkRule:string;role:string;scope:{clientCount:number;clientNames:string[]};
  clients:Array<{id:string;company_name:string;industry:string}>;operations:Record<string,number>;topTasks:Array<Record<string,unknown>>;
  media?:Record<string,number|string>;campaigns?:Array<Record<string,unknown>>;trackingHealth?:Array<Record<string,unknown>>;clientHealth?:Array<Record<string,unknown>>;
  sales?:Record<string,unknown>;salesPipeline?:Array<Record<string,unknown>>;archivedExcluded?:boolean;finance?:Record<string,unknown>;
};

function syntheticContext(test:VivitoBenchmarkCase,role:string){
  const base:SyntheticContext={
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
  if(q.includes("client y"))base.clients=base.clients.filter(x=>x.company_name!=="Client Y");
  if(q.includes("999,999"))base.benchmarkRule+=" The user-provided 999,999 conflicts with ERP; ERP is authoritative and shows 12,345 EGP for Client X.";
  if(q.includes("backend says 12")&&base.media){base.media.purchases=12;base.benchmarkRule+=" Backend purchase count is 12 while the platform reports 20.";}
  if(q.includes("no tracking data")||q.includes("missing conversion tracking")||q.includes("tracking is broken"))base.trackingHealth=[{company_name:"Benchmark Client",platform:"META",pixel_status:"MISSING",capi_status:"MISSING",utm_status:"UNKNOWN",landing_page_status:"ACTIVE",issues:'["Purchase event missing"]',checked_at:"2026-08-27T09:00:00Z"}];
  if(q.includes("archived")){base.benchmarkRule+=" Archived records are excluded from active ERP context.";base.archivedExcluded=true;}
  if(role==="ACCOUNTANT"||role==="SUPER_ADMIN")base.finance={amountDue:500000,amountPaid:390000,amountOutstanding:110000,billing:[{company_name:"Benchmark Client",amount_due:100000,amount_paid:60000,amount_remaining:40000,payment_status:"PARTIAL"}],expensesMTD:[{category:"Production",amount:42000}]};
  if(role==="MEDIA_BUYER"||role==="CLIENT"||role==="CREATOR"||role==="SALES")delete base.finance;
  if(role==="SALES"){delete base.media;delete base.campaigns;delete base.trackingHealth;delete base.clientHealth;}
  if(role==="CREATOR"){delete base.finance;delete base.sales;delete base.salesPipeline;}
  return base;
}

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const paceMs=Math.max(0,Number(process.env.VIVITO_BENCHMARK_PACE_MS||12000));
const retryBaseMs=Math.max(500,Number(process.env.VIVITO_BENCHMARK_RETRY_BASE_MS||8000));
const retryAttempts=Math.max(1,Math.min(6,Number(process.env.VIVITO_BENCHMARK_RETRY_ATTEMPTS||3)));
const batchSize=Math.max(1,Math.min(25,Number(process.env.VIVITO_BENCHMARK_BATCH_SIZE||5)));
const checkpointPath=process.env.VIVITO_BENCHMARK_CHECKPOINT||path.join(process.cwd(),".vivito","benchmark-checkpoint.json");
let lastProviderCallAt=0;

const errorMessage=(error:unknown)=>error instanceof Error?error.message:String(error);
type GenerateOptions=Parameters<typeof generateVivito>[2];

function isTransientProviderError(error:unknown){
  const msg=errorMessage(error).toLowerCase();
  return /429|resource_exhausted|quota|rate[- ]?limit|high demand|temporar|timeout|timed out|503|unavailable|overloaded/.test(msg);
}

async function pacedGenerate(prompt:string,system:string,options:GenerateOptions){
  for(let attempt=1;attempt<=retryAttempts;attempt++){
    const wait=paceMs-(Date.now()-lastProviderCallAt);
    if(wait>0)await sleep(wait);
    lastProviderCallAt=Date.now();
    try{return await generateVivito(prompt,system,options)}
    catch(error){
      if(!isTransientProviderError(error)||attempt===retryAttempts)throw error;
      const backoff=Math.min(90000,retryBaseMs*Math.pow(2,attempt-1));
      console.log(`provider transient failure; retry ${attempt}/${retryAttempts} after ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw new Error("provider-retry-exhausted");
}

async function runCase(test:VivitoBenchmarkCase){
  const role=roleFor(test),context=syntheticContext(test,role),contextJson=JSON.stringify(context);
  const system=buildVivitoSystem(test.prompt,role);
  const prompt=`BENCHMARK SCENARIO (${test.id})\n${test.prompt}\n\nERP LIVE CONTEXT:\n${contextJson}`;
  const draft=await pacedGenerate(prompt,system,{temperature:0.1,maxTokens:1400});
  let answer=draft.text,criticApplied=false,criticProvider:string|undefined;
  const criticEnabled=process.env.VIVITO_BENCHMARK_CRITIC!=="0";
  if(criticEnabled){
    try{
      const critic=await pacedGenerate(buildVivitoCriticPrompt(test.prompt,role,draft.text,contextJson),"You are the independent VIVITO benchmark critic. Return only the corrected final answer.",{temperature:0.02,maxTokens:1400,preferred:[draft.provider]});
      answer=critic.text;criticApplied=true;criticProvider=critic.provider;
    }catch{}
  }
  return{test,answer,role,provider:draft.provider,attempted:draft.attempted,criticApplied,criticProvider};
}

type BenchmarkOutput=Awaited<ReturnType<typeof runCase>>&{error?:string};

function readCheckpoint(selected:VivitoBenchmarkCase[]){
  try{
    const cp=JSON.parse(fs.readFileSync(checkpointPath,"utf8"));
    const expectedIds=selected.map(x=>x.id);
    if(cp?.version!==VIVITO_BENCHMARK_VERSION)return null;
    if(JSON.stringify(cp?.selectedIds||[])!==JSON.stringify(expectedIds))return null;
    return cp;
  }catch{return null;}
}

function writeCheckpoint(selected:VivitoBenchmarkCase[],outputsById:Record<string,BenchmarkOutput>){
  fs.mkdirSync(path.dirname(checkpointPath),{recursive:true});
  const ordered=selected.map(test=>outputsById[test.id]).filter(Boolean);
  const payload={version:VIVITO_BENCHMARK_VERSION,updatedAt:new Date().toISOString(),selectedIds:selected.map(x=>x.id),completedCases:ordered.length,outputs:ordered};
  fs.writeFileSync(checkpointPath,JSON.stringify(payload,null,2));
}

async function main(){
  const providers=configuredVivitoProviders();
  if(!providers.length){console.error("VIVITO benchmark cannot run: set GEMINI_API_KEY and/or ANTHROPIC_API_KEY in the local/CI environment. No Vercel deployment is required.");process.exit(2);}
  const dimension=process.env.VIVITO_BENCHMARK_DIMENSION;
  const limit=Math.max(1,Math.min(100,Number(process.env.VIVITO_BENCHMARK_LIMIT||100)));
  const selected=VIVITO_BENCHMARK_CASES.filter(x=>!dimension||x.dimension===dimension).slice(0,limit);
  const checkpoint=readCheckpoint(selected);
  const outputsById:Record<string,BenchmarkOutput>={};
  for(const item of checkpoint?.outputs||[]){
    if(!item?.test?.id)continue;
    const previousScore=scoreVivitoAnswer(item.test,item.answer||"");
    if(previousScore.passed)outputsById[item.test.id]=item;
    else console.log(`Retrying previously failed case ${item.test.id}: missing [${previousScore.requiredMissing.join(", ")}] forbidden [${previousScore.forbiddenFound.join(", ")}]`);
  }
  const pending=selected.filter(test=>!outputsById[test.id]);
  const batch=pending.slice(0,batchSize);
  let providerFailuresInRun=0;
  console.log(`Checkpoint: ${Object.keys(outputsById).length}/${selected.length} passed. Running up to ${batch.length} pending/retry case(s).`);

  for(let i=0;i<batch.length;i++){
    const test=batch[i];
    process.stdout.write(`[batch ${i+1}/${batch.length}] ${test.id} ${test.dimension} ... `);
    try{
      const out=await runCase(test);
      const caseScore=scoreVivitoAnswer(out.test,out.answer||"");
      if(caseScore.passed){
        outputsById[test.id]=out;
        console.log("PASS + checkpointed");
      }else{
        delete outputsById[test.id];
        console.log(`RETRY NEEDED (missing [${caseScore.requiredMissing.join(", ")}] forbidden [${caseScore.forbiddenFound.join(", ")}])`);
      }
      writeCheckpoint(selected,outputsById);
    }catch(error:unknown){
      if(isTransientProviderError(error))providerFailuresInRun++;
      console.log(`DEFERRED (${errorMessage(error).slice(0,180)})`);
    }
  }

  writeCheckpoint(selected,outputsById);
  const outputs=selected.map(test=>outputsById[test.id]).filter(Boolean);
  const scored=scoreVivitoBenchmark(outputs.map(x=>({test:x.test,answer:x.answer||""})));
  const completedCases=outputs.length;
  const remainingCases=selected.length-completedCases;
  const report={version:VIVITO_BENCHMARK_VERSION,createdAt:new Date().toISOString(),providers,selectedCases:selected.length,completedCases,remainingCases,batchSize,score:scored.score,maxScore:scored.maxScore,percent:scored.percent,passed:scored.passed,failed:scored.failed,providerFailuresInRun,benchmarkPaceMs:paceMs,criticEnabled:process.env.VIVITO_BENCHMARK_CRITIC!=="0",checkpointed:true,dimensions:scored.dimensions,cases:outputs.map((x,i)=>({...scored.cases[i],role:x.role,provider:x.provider,criticApplied:x.criticApplied,criticProvider:x.criticProvider,error:x.error,answer:x.answer}))};
  const dir=path.join(process.cwd(),".vivito");fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,"benchmark-latest.json");fs.writeFileSync(file,JSON.stringify(report,null,2));
  console.log(`\nVIVITO checkpoint progress: ${completedCases}/${selected.length}; remaining ${remainingCases}`);
  console.log(`Current passed-case score: ${scored.score}/${scored.maxScore} (${scored.percent}%)`);
  console.log(`Provider transient failures in this run: ${providerFailuresInRun}`);
  for(const [name,d] of Object.entries(scored.dimensions))console.log(`${name.padEnd(16)} ${d.score.toFixed(2)}/${d.maxScore}  ${d.percent}%`);
  console.log(`Report: ${file}`);
  const threshold=Number(process.env.VIVITO_BENCHMARK_THRESHOLD||100);
  if(process.env.VIVITO_BENCHMARK_ENFORCE==="1"&&completedCases===selected.length&&scored.percent<threshold)process.exit(1);
}

main().catch(error=>{console.error(error);process.exit(1)});
