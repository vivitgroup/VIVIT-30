export type VivitoCapabilityId=
  |"sales-v3"|"ceo-cfo-v2"|"real-estate-egypt-v2"|"hr-people-v2"|"simulation-v2"
  |"artifact-studio-v4"|"research-v3"|"client-twin-v2"|"learning-loop-v2"|"creative-director-v2"
  |"marketing-scientist-v2"|"decision-engine-v3"|"red-team-v3"|"live-knowledge-v2"|"blind-head-to-head-v2";

export type VivitoCapability={
  id:VivitoCapabilityId;
  label:string;
  runtime:boolean;
  externalEvidenceRequired?:boolean;
  doctrine:string[];
};

export const VIVITO_CAPABILITY_PACK_V4:VivitoCapability[]=[
  {id:"sales-v3",label:"Sales V3 Operator",runtime:true,doctrine:["Diagnose pipeline stage leakage before blaming lead volume.","Use deal strategy, forecast confidence, objection trees, negotiation plans, buying committees, lost-deal reasons and expansion paths.","Separate lead quality, offer, sales execution, pricing, operations and attribution causes."]},
  {id:"ceo-cfo-v2",label:"CEO/CFO Engine V2",runtime:true,doctrine:["Translate recommendations into contribution margin, CAC/LTV, payback, cash, capacity and downside risk.","Never infer profitability from ROAS alone.","Separate facts, assumptions, calculations and scenario outputs."]},
  {id:"real-estate-egypt-v2",label:"Real Estate Egypt Brain V2",runtime:true,doctrine:["Egypt-first evidence priority: official Egyptian sources and verified developer/project facts before regional proxies.","Model unit mix, absorption, payment plans, affordability, financing environment, broker economics and buyer-vs-investor economics.","Never invent appreciation, rental yield, launch inventory or sales velocity."]},
  {id:"hr-people-v2",label:"HR/People Intelligence V2",runtime:true,doctrine:["Link headcount, payroll, utilization, capacity, attrition and hiring decisions to business economics.","Do not infer protected or sensitive employee traits.","Use role scorecards and evidence-based performance criteria."]},
  {id:"simulation-v2",label:"Simulation Engine V2",runtime:true,doctrine:["Produce base, best and worst cases with explicit assumptions.","Show break-even or stop-loss where computable.","Do not present a scenario as a forecast without evidence."]},
  {id:"artifact-studio-v4",label:"Artifact Studio V4",runtime:true,doctrine:["Board-ready story, assertion headlines, source traceability and calculation integrity.","PPTX/PDF/XLSX outputs must fail closed when required evidence or format support is missing.","Artifact generation is not proof of visual superiority; use render QA and blind review."]},
  {id:"research-v3",label:"Research Intelligence V3",runtime:true,doctrine:["Maintain claim ledger: observed, reported, inferred, estimated, assumed.","Rank sources by authority, freshness, locality and directness.","Surface contradictions instead of silently resolving them."]},
  {id:"client-twin-v2",label:"Client Digital Twin V2",runtime:true,doctrine:["Maintain business model, ICP, pricing, margins, constraints, competitors, historical wins/losses, seasonality and client preferences.","Live ERP facts outrank memory.","Never leak one client's twin into another client's context."]},
  {id:"learning-loop-v2",label:"Agency Learning Loop V2",runtime:true,doctrine:["Learn what worked, what failed, under which conditions and what must not be generalized.","Outcomes are observations, not automatic causation.","Corrections supersede stale assumptions."]},
  {id:"creative-director-v2",label:"Creative Director V2",runtime:true,doctrine:["Score hook, hierarchy, product fidelity, brand codes, thumb-stop, fatigue, novelty and testability.","Creative hypotheses require performance evidence before becoming rules.","Preserve supplied product/logo fidelity."]},
  {id:"marketing-scientist-v2",label:"Marketing Scientist V2",runtime:true,doctrine:["Distinguish correlation, attribution and incrementality.","Require appropriate controls, holdouts or quasi-experimental evidence for causal claims.","Check sample sufficiency, tracking quality and measurement bias before optimization."]},
  {id:"decision-engine-v3",label:"Decision Engine V3",runtime:true,doctrine:["Diagnose -> Evidence -> Hypotheses -> Trade-offs -> Scenario -> Recommendation -> Risk -> Next action.","State what evidence would change the decision.","Prefer reversible tests under uncertainty."]},
  {id:"red-team-v3",label:"Red Team V3",runtime:true,doctrine:["Check stale data, source mismatch, financial contradiction, over-generalization, false certainty and risky automation.","Block unsupported live claims and fabricated execution.","Force explicit validation and rollback for high-impact recommendations."]},
  {id:"live-knowledge-v2",label:"Live Knowledge Fabric V2",runtime:true,doctrine:["Prefer first-party APIs/data feeds where available, then official pages, then trusted secondary sources.","Track fetched-at, effective date, freshness SLA, source authority and supersession.","Egypt real-estate queries prioritize Egyptian official sources."]},
  {id:"blind-head-to-head-v2",label:"Blind Head-to-Head V2",runtime:true,externalEvidenceRequired:true,doctrine:["Use identical prompts, anonymized A/B outputs and frozen rubric.","Do not reveal model identity before scoring.","Never claim superiority before completed blind judgments and joined results."]},
];

const patterns:Record<VivitoCapabilityId,RegExp>={
  "sales-v3":/(sales|pipeline|lead|deal|objection|negotiat|proposal|forecast|close rate|مبيعات|ليد|صفقة|اعتراض)/i,
  "ceo-cfo-v2":/(margin|profit|cash|cac|ltv|payback|runway|pricing|budget|p&l|ربح|هامش|سيولة|تسعير|ميزانية)/i,
  "real-estate-egypt-v2":/(real estate|property|developer|unit|compound|mortgage|عقار|عقارات|وحدة|كمباوند|مطور|تمويل عقاري|مقدم|تقسيط)/i,
  "hr-people-v2":/(hr|headcount|salary|payroll|utilization|attrition|hiring|workforce|موظف|رواتب|توظيف|موارد بشرية)/i,
  "simulation-v2":/(what if|scenario|sensitivity|best case|worst case|ماذا لو|سيناريو|حساسية)/i,
  "artifact-studio-v4":/(pptx|presentation|deck|pdf|xlsx|excel|spreadsheet|برزنتيشن|عرض|اكسل|بي دي اف)/i,
  "research-v3":/(research|competitor|source|citation|market scan|بحث|منافس|مصدر|دراسة سوق)/i,
  "client-twin-v2":/(client|account|customer|عميل|اكونت)/i,
  "learning-loop-v2":/(learn|learning|worked|failed|outcome|lesson|تعلم|نجح|فشل|نتيجة)/i,
  "creative-director-v2":/(creative|design|hook|visual|reel|concept|كريتيف|ديزاين|هوك|فكرة)/i,
  "marketing-scientist-v2":/(incremental|causal|attribution|holdout|experiment|ab test|سببية|اتريبيوشن|تجربة)/i,
  "decision-engine-v3":/(decide|recommend|priority|trade-off|قرار|اختار|اولوية|توصية)/i,
  "red-team-v3":/(risk|validate|rollback|audit|check|مخاطر|تحقق|راجع|رول باك)/i,
  "live-knowledge-v2":/(latest|current|today|live|update|احدث|حالي|دلوقتي|لايف|تحديث)/i,
  "blind-head-to-head-v2":/(claude|head.?to.?head|benchmark|blind|كلود|مقارنة|امتحان)/i,
};

export function detectVivitoCapabilities(question:string):VivitoCapability[]{
  const selected=VIVITO_CAPABILITY_PACK_V4.filter(c=>patterns[c.id].test(question));
  const ids=new Set(selected.map(x=>x.id));
  if(selected.length&&!ids.has("decision-engine-v3"))selected.push(VIVITO_CAPABILITY_PACK_V4.find(x=>x.id==="decision-engine-v3")!);
  return selected;
}

export function buildVivitoCapabilityContext(question:string){
  const active=detectVivitoCapabilities(question);
  if(!active.length)return "";
  return `VIVITO CAPABILITY PACK V4 — ACTIVE\n${active.map(c=>`[${c.label}]\n- ${c.doctrine.join("\n- ")}`).join("\n\n")}`;
}

export type ScenarioInput={base:number;bestPct?:number;worstPct?:number;fixedCost?:number;unitContribution?:number};
export function simulateVivitoScenario(input:ScenarioInput){
  if(!Number.isFinite(input.base))throw new Error("invalid-base");
  const bestPct=input.bestPct??10;
  const worstPct=input.worstPct??-10;
  const breakEvenUnits=input.fixedCost!=null&&input.unitContribution!=null&&input.unitContribution>0?input.fixedCost/input.unitContribution:null;
  return {base:input.base,best:input.base*(1+bestPct/100),worst:input.base*(1+worstPct/100),bestPct,worstPct,breakEvenUnits,classification:"SCENARIO_NOT_FORECAST" as const};
}

export type EgyptRealEstateInput={unitPrice:number;downPaymentPct:number;installmentYears:number;annualRent?:number};
export function calculateEgyptRealEstateEconomics(input:EgyptRealEstateInput){
  if(input.unitPrice<=0||input.downPaymentPct<0||input.downPaymentPct>100||input.installmentYears<=0)throw new Error("invalid-real-estate-input");
  const downPayment=input.unitPrice*input.downPaymentPct/100;
  const financed=input.unitPrice-downPayment;
  const monthlyInstallment=financed/(input.installmentYears*12);
  const grossRentalYield=input.annualRent!=null&&input.annualRent>=0?input.annualRent/input.unitPrice:null;
  return {downPayment,financed,monthlyInstallment,grossRentalYield,appreciationAssumption:null,sourceRequiredForMarketClaims:true};
}

export type WorkforceInput={headcount:number;averageMonthlySalary:number;monthlyRevenue?:number;billableHours?:number;capacityHours?:number};
export function calculateWorkforceEconomics(input:WorkforceInput){
  if(input.headcount<0||input.averageMonthlySalary<0)throw new Error("invalid-workforce-input");
  const monthlyPayroll=input.headcount*input.averageMonthlySalary;
  const revenuePerFte=input.monthlyRevenue!=null&&input.headcount>0?input.monthlyRevenue/input.headcount:null;
  const utilization=input.billableHours!=null&&input.capacityHours!=null&&input.capacityHours>0?input.billableHours/input.capacityHours:null;
  return {monthlyPayroll,revenuePerFte,utilization};
}

export type CausalEvidence="OBSERVATIONAL"|"ATTRIBUTION"|"HOLDOUT"|"RANDOMIZED"|"QUASI_EXPERIMENTAL";
export function marketingCausalityAssessment(evidence:CausalEvidence){
  if(evidence==="RANDOMIZED"||evidence==="HOLDOUT")return {causalClaim:"SUPPORTED_WITH_SCOPE" as const,confidence:"HIGH" as const};
  if(evidence==="QUASI_EXPERIMENTAL")return {causalClaim:"POSSIBLE_WITH_ASSUMPTIONS" as const,confidence:"MEDIUM" as const};
  return {causalClaim:"NOT_CAUSATION" as const,confidence:"LOW" as const};
}

export type CreativeEvidence={hook:boolean;hierarchy:boolean;productFidelity:boolean;brandCodes:boolean;clearCta:boolean;tested:boolean};
export function scoreCreativeDirectorV2(e:CreativeEvidence){
  const criteria=[e.hook,e.hierarchy,e.productFidelity,e.brandCodes,e.clearCta];
  const executionScore=Math.round(criteria.filter(Boolean).length/criteria.length*100);
  return {executionScore,performanceClaim:e.tested?"EVIDENCE_AVAILABLE":"HYPOTHESIS_ONLY" as const};
}

export type ClaimLedgerEntry={claim:string;status:"OBSERVED"|"REPORTED"|"INFERRED"|"ESTIMATED"|"ASSUMED";source?:string;effectiveDate?:string;fetchedAt?:string};
export function validateClaimLedger(entries:ClaimLedgerEntry[]){
  return entries.map(e=>({...e,requiresSource:e.status==="OBSERVED"||e.status==="REPORTED",valid:!(e.status==="OBSERVED"||e.status==="REPORTED")||Boolean(e.source)}));
}

export function blindBenchmarkPolicy(){
  return {anonymize:true,identicalPrompts:true,frozenRubric:true,revealAfterScoring:true,superiorityClaimAllowed:false,externalJudgmentsRequired:true};
}
