import {
  VIVITO_CAPABILITY_PACK_V4,detectVivitoCapabilities,simulateVivitoScenario,
  calculateEgyptRealEstateEconomics,calculateWorkforceEconomics,marketingCausalityAssessment,
  scoreCreativeDirectorV2,validateClaimLedger,blindBenchmarkPolicy
} from "../lib/vivito/capability-pack-v4";

const checks:{name:string;pass:boolean}[]=[];
const check=(name:string,pass:boolean)=>checks.push({name,pass});

check("at least 15 capability tracks exist",VIVITO_CAPABILITY_PACK_V4.length>=15);
check("all capability ids are unique",new Set(VIVITO_CAPABILITY_PACK_V4.map(x=>x.id)).size===VIVITO_CAPABILITY_PACK_V4.length);
check("all tracks are runtime-enabled",VIVITO_CAPABILITY_PACK_V4.every(x=>x.runtime));
check("sales routing activates Sales V3",detectVivitoCapabilities("pipeline close rate and objections").some(x=>x.id==="sales-v3"));
check("Egypt property routing activates Real Estate Egypt V2",detectVivitoCapabilities("عقارات مصر مقدم وتقسيط").some(x=>x.id==="real-estate-egypt-v2"));
check("HR routing activates people economics",detectVivitoCapabilities("headcount payroll hiring economics").some(x=>x.id==="hr-people-v2"));
check("decision engine is appended to active specialist routes",detectVivitoCapabilities("pipeline close rate").some(x=>x.id==="decision-engine-v3"));

const scenario=simulateVivitoScenario({base:100,bestPct:20,worstPct:-25,fixedCost:1000,unitContribution:100});
check("scenario engine computes base best worst",scenario.base===100&&scenario.best===120&&scenario.worst===75);
check("scenario engine labels scenarios as non-forecast",scenario.classification==="SCENARIO_NOT_FORECAST");
check("scenario engine computes break-even",scenario.breakEvenUnits===10);

const re=calculateEgyptRealEstateEconomics({unitPrice:12_000_000,downPaymentPct:10,installmentYears:8,annualRent:600_000});
check("real estate engine computes payment plan economics",re.downPayment===1_200_000&&re.financed===10_800_000&&re.monthlyInstallment===112_500);
check("real estate engine never invents appreciation",re.appreciationAssumption===null&&re.sourceRequiredForMarketClaims===true);

const hr=calculateWorkforceEconomics({headcount:10,averageMonthlySalary:20_000,monthlyRevenue:1_000_000,billableHours:1200,capacityHours:1600});
check("HR engine computes payroll and utilization",hr.monthlyPayroll===200_000&&hr.revenuePerFte===100_000&&hr.utilization===0.75);

check("observational marketing evidence is not causation",marketingCausalityAssessment("OBSERVATIONAL").causalClaim==="NOT_CAUSATION");
check("randomized marketing evidence supports scoped causal claim",marketingCausalityAssessment("RANDOMIZED").causalClaim==="SUPPORTED_WITH_SCOPE");

const creative=scoreCreativeDirectorV2({hook:true,hierarchy:true,productFidelity:true,brandCodes:true,clearCta:false,tested:false});
check("creative scoring separates execution from performance proof",creative.executionScore===80&&creative.performanceClaim==="HYPOTHESIS_ONLY");

const ledger=validateClaimLedger([{claim:"market grew",status:"REPORTED"},{claim:"possible cause",status:"INFERRED"}]);
check("claim ledger blocks reported claims without source",ledger[0].valid===false&&ledger[1].valid===true);

const blind=blindBenchmarkPolicy();
check("blind benchmark forbids premature superiority claims",blind.anonymize&&blind.identicalPrompts&&blind.frozenRubric&&!blind.superiorityClaimAllowed&&blind.externalJudgmentsRequired);
check("head-to-head track explicitly requires external evidence",VIVITO_CAPABILITY_PACK_V4.find(x=>x.id==="blind-head-to-head-v2")?.externalEvidenceRequired===true);

for(const c of checks)console.log(`${c.pass?"PASS":"FAIL"}  ${c.name}`);
const passed=checks.filter(x=>x.pass).length;
console.log(`\nCapability Pack V4: ${passed}/${checks.length}`);
if(passed!==checks.length)process.exit(1);
