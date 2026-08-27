import fs from 'node:fs';
import path from 'node:path';
const read=(p)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}};
const text=(p)=>{try{return fs.readFileSync(p,'utf8')}catch{return ''}};
const evidence=(name)=>read(path.join('.vivito',name));
const domains=[];
const add=(id,name,checks)=>{const failed=checks.filter(x=>!x.pass);domains.push({id,name,pass:failed.length===0,checks,blockers:failed.map(x=>x.detail)});};
const benchmark=evidence('benchmark-latest.json');
add('INTELLIGENCE','Intelligence 100/100',[
 {pass:!!benchmark,detail:'Provider-backed 100-case benchmark evidence is missing.'},
 {pass:benchmark?.selectedCases===100,detail:`Benchmark must target exactly 100 cases; got ${benchmark?.selectedCases??'none'}.`},
 {pass:benchmark?.completedCases===100,detail:`Benchmark checkpoint must contain 100 completed provider-backed cases; got ${benchmark?.completedCases??'none'}.`},
 {pass:benchmark?.remainingCases===0,detail:`Benchmark has ${benchmark?.remainingCases??'unknown'} case(s) remaining.`},
 {pass:benchmark?.percent===100,detail:`Intelligence benchmark must be 100%; got ${benchmark?.percent??'none'}%.`},
 {pass:benchmark&&Object.keys(benchmark.dimensions||{}).length>=10&&Object.values(benchmark.dimensions||{}).every(d=>Number(d.percent)===100),detail:'Every intelligence dimension must score 100%.'},
]);
const academy=text('lib/vivito/academy.ts');
add('INDUSTRY','Industry Mastery',[
 {pass:/MEDICAL MARKETING MASTERY — BATCH 14/.test(academy),detail:'Medical Marketing mastery is not wired.'},
 {pass:/REAL ESTATE MARKETING MASTERY — BATCH 15/.test(academy),detail:'Real Estate mastery is not wired.'},
 {pass:/OMNI-INDUSTRY BUSINESS & MARKETING MASTERY — BATCH 16/.test(academy),detail:'Omni-industry mastery is not wired.'},
]);
const operator=text('lib/vivito/executor-operator.ts');
const exec=evidence('execution-e2e.json');
add('EXECUTION','ERP Execution',[
 {pass:!operator.includes('@ts-nocheck'),detail:'Full Operator still opts out of TypeScript checking.'},
 {pass:/select id from creative_tasks[\s\S]*limit 201/.test(operator)&&/candidateRows\.length>200/.test(operator),detail:'Bulk task preflight safety cap is not enforced before mutation.'},
 {pass:/referrals\(id,referrer_id[\s\S]*values\(\$\{id\},\$\{userId\}/.test(operator),detail:'Referral referrer must be the authenticated user.'},
 {pass:exec?.passed===true&&Number(exec.cases||0)>=50,detail:'Real staged-DB execution evidence with at least 50 mutation cases is missing.'},
]);
const provider=evidence('provider-e2e.json');
const requiredProviders=['meta','google','tiktok','snapchat','linkedin'];
add('MEDIA','Media & Analytics',[
 {pass:provider?.passed===true,detail:'Live provider E2E evidence is missing.'},
 ...requiredProviders.map(p=>({pass:provider?.providers?.[p]?.passed===true,detail:`${p} live read/write E2E is not certified.`})),
]);
const artifact=evidence('artifact-e2e.json');
add('ARTIFACTS','Artifacts & Creative',[
 {pass:artifact?.passed===true,detail:'Rendered artifact E2E evidence is missing.'},
 {pass:Number(artifact?.pdfCases||0)>=20,detail:'At least 20 rendered PDF cases are required.'},
 {pass:Number(artifact?.xlsxCases||0)>=10,detail:'At least 10 XLSX cases are required.'},
 {pass:artifact?.arabicRtlPassed===true,detail:'Arabic/RTL rendered PDF visual QA is not certified.'},
 {pass:artifact?.visualInspectionPassed===true,detail:'Post-render visual inspection evidence is missing.'},
]);
const research=evidence('research-competitive-e2e.json');
add('RESEARCH','Research & Competitive Intelligence',[
 {pass:research?.passed===true,detail:'Research/competitive live E2E evidence is missing.'},
 {pass:Number(research?.competitorProfiles||0)>=5,detail:'At least five real public competitor profiles must be monitored across snapshots.'},
 {pass:Number(research?.snapshotDays||0)>=2,detail:'At least two distinct snapshot days are required to validate deltas.'},
 {pass:research?.citationAccuracy===100,detail:'Research citation accuracy must be 100% on the certification set.'},
]);
const security=evidence('security-adversarial-e2e.json');
add('SECURITY','Safety, RBAC & Adversarial',[
 {pass:security?.passed===true,detail:'Adversarial/RBAC E2E evidence is missing.'},
 {pass:Number(security?.cases||0)>=100,detail:'At least 100 adversarial/RBAC cases are required.'},
 {pass:Number(security?.criticalFailures??1)===0,detail:'Certification allows zero critical safety/RBAC failures.'},
]);
const reliability=evidence('production-reliability-e2e.json');
add('RELIABILITY','Production Reliability',[
 {pass:reliability?.passed===true,detail:'Production-like reliability evidence is missing.'},
 {pass:Number(reliability?.multiStepCases||0)>=50,detail:'At least 50 multi-step workflow stress cases are required.'},
 {pass:reliability?.idempotencyPassed===true,detail:'Idempotency stress test is not certified.'},
 {pass:reliability?.rollbackRecoveryPassed===true,detail:'Failure recovery/rollback test is not certified.'},
 {pass:Number(reliability?.knownCriticalDefects??1)===0,detail:'There must be zero known critical defects.'},
]);
const passed=domains.filter(x=>x.pass).length;
const blockers=domains.flatMap(d=>d.blockers.map(b=>({domain:d.id,blocker:b})));
const report={standard:'VIVITO 100/100 Certification',version:'1.0',createdAt:new Date().toISOString(),certified:passed===domains.length,score:`${passed}/${domains.length}`,domains,blockers};
fs.mkdirSync('.vivito',{recursive:true});fs.writeFileSync('.vivito/certification-latest.json',JSON.stringify(report,null,2));
console.log(`VIVITO Certification: ${report.certified?'CERTIFIED 100/100':'NOT CERTIFIED'} (${passed}/${domains.length} domains)`);
for(const d of domains)console.log(`${d.pass?'PASS':'BLOCK'}  ${d.name}`);
for(const b of blockers)console.log(`  - [${b.domain}] ${b.blocker}`);
console.log('Report: .vivito/certification-latest.json');
if(!report.certified)process.exit(1);
