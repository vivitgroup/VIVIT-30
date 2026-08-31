import fs from "node:fs";
import path from "node:path";
import {VIVITO_CASE_STUDY_ROLE_SCOPE,type VivitoCaseRole,type VivitoCaseStudyV4} from "../lib/vivito/case-study-benchmark-v4";
import {buildVivitoSystem} from "../lib/vivito/playbook";
import {configuredVivitoProviders,generateVivito} from "../lib/vivito/providers";

const role=(process.env.VIVITO_CASE_ROLE||"SUPER_ADMIN") as VivitoCaseRole;
const limit=Math.max(1,Math.min(1000,Number(process.env.VIVITO_CASE_LIMIT||20)));
const selected=VIVITO_CASE_STUDY_ROLE_SCOPE[role].slice(0,limit);
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const pace=Math.max(0,Number(process.env.VIVITO_CASE_PACE_MS||800));

function tokenHit(answer:string,token:string){
 const a=answer.toLowerCase(),t=token.toLowerCase();
 const aliases:Record<string,string[]>={
  evidence:["evidence","data","source","fact"],segment:["segment","audience","customer"],funnel:["funnel","journey","conversion"],economics:["economics","margin","profit","unit economics"],experiment:["experiment","test","hypothesis"],kpi:["kpi","metric","measure"],"decision rule":["decision rule","threshold","stop","scale"],
  revenue:["revenue","sales"],"gross margin":["gross margin","margin"],"contribution margin":["contribution margin","contribution profit"],"cash flow":["cash flow","cash"],"working capital":["working capital","receivable","payable"],scenario:["scenario","downside","base case"],risk:["risk","downside"],"decision threshold":["threshold","trigger","proceed","hold","stop"],
  objective:["objective","goal"],cash:["cash"],"trade-off":["trade-off","tradeoff"],"opportunity cost":["opportunity cost"],reversibility:["reversible","reversibility","rollback"],trigger:["trigger","threshold"],
  measurement:["measurement","tracking","pixel","capi","utm"],"result definition":["result definition","result","conversion"],"business outcome":["business outcome","revenue","profit","qualified"],creative:["creative","hook","message"],audience:["audience","targeting"],budget:["budget","spend"],validation:["validate","validation","verify"],guardrail:["guardrail","stop","scale","threshold"]
 };
 return (aliases[t]||[t]).some(x=>a.includes(x));
}
function score(c:VivitoCaseStudyV4,answer:string){const hits=c.mustAddress.filter(x=>tokenHit(answer,x));return{hits:hits.length,total:c.mustAddress.length,passed:hits.length>=Math.ceil(c.mustAddress.length*.75),missing:c.mustAddress.filter(x=>!hits.includes(x))};}

async function main(){
 const providers=configuredVivitoProviders();if(!providers.length){console.error("No VIVITO provider configured");process.exit(2)}
 const out=[] as Array<Record<string,unknown>>;
 for(let i=0;i<selected.length;i++){
  const c=selected[i];
  const system=buildVivitoSystem(c.prompt,role);
  const prompt=`CASE STUDY ${c.id} (${c.domain})\n${c.prompt}\n\nAnswer as VIVITO for role ${role}. Give a decision-grade answer with diagnosis, assumptions, quantified logic where possible, prioritized actions, KPIs, owner/timing and guardrails. This is analysis only; do not execute ERP or external actions.`;
  try{
   const r=await generateVivito(prompt,system,{temperature:0.1,maxTokens:1600});
   const s=score(c,r.text);out.push({id:c.id,domain:c.domain,role,provider:r.provider,passed:s.passed,hits:s.hits,total:s.total,missing:s.missing,answer:r.text});
   console.log(`${s.passed?"PASS":"FAIL"} ${role} ${i+1}/${selected.length} ${c.id} ${s.hits}/${s.total}`);
  }catch(e){out.push({id:c.id,domain:c.domain,role,passed:false,error:e instanceof Error?e.message:String(e)});console.log(`FAIL ${role} ${i+1}/${selected.length} ${c.id} provider-error`)}
  if(pace&&i<selected.length-1)await sleep(pace);
 }
 const passed=out.filter(x=>x.passed===true).length;const dir=path.join(process.cwd(),".vivito");fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`case-study-v4-${role}.json`);fs.writeFileSync(file,JSON.stringify({role,total:selected.length,passed,failed:selected.length-passed,percent:Math.round(passed/selected.length*10000)/100,cases:out},null,2));
 console.log(`VIVITO_CASE_V4_RESULT role=${role} passed=${passed}/${selected.length} report=${file}`);if(passed!==selected.length)process.exit(1);
}
main().catch(e=>{console.error(e);process.exit(1)});
