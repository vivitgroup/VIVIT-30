export type VivitoCapabilityId=
  |"sales-v3"|"ceo-cfo-v2"|"real-estate-egypt-v2"|"hr-people-v2"|"simulation-v2"
  |"artifact-studio-v4"|"research-v3"|"client-twin-v2"|"learning-loop-v2"|"creative-director-v2"
  |"marketing-scientist-v2"|"decision-engine-v3"|"red-team-v3"|"live-knowledge-v2"|"blind-head-to-head-v2"
  |"decision-memory-v2"|"autonomous-research-v2"|"executive-war-room-v2"|"experimentation-os-v2"
  |"financial-digital-twin-v2"|"client-brand-twin-v3"|"creative-intelligence-v2"|"media-buyer-copilot-v2"
  |"sales-conversation-intelligence-v2"|"meeting-intelligence-v2"|"forecasting-engine-v2"|"self-improvement-engine-v2";

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

  {id:"decision-memory-v2",label:"Persistent Decision Memory V2",runtime:true,doctrine:["Store decision, assumptions, evidence snapshot, owner, expected outcome, review date and actual outcome as separate fields.","On a repeated decision, retrieve relevant prior outcomes and explicitly state what transferred and what did not.","Never let stale memory override fresher ERP or source evidence; supersede corrected assumptions instead of silently mutating history."]},
  {id:"autonomous-research-v2",label:"Autonomous Research Agent V2",runtime:true,externalEvidenceRequired:true,doctrine:["Decompose a research question into claims, source plan, contradiction checks and decision criteria before synthesis.","Maintain a claim ledger with source, date, authority, locality, confidence and contradictory evidence.","Do not turn search summaries into facts; finish with verified findings, unresolved gaps and the recommendation that the evidence can actually support."]},
  {id:"executive-war-room-v2",label:"Executive War Room V2",runtime:true,doctrine:["Simulate distinct CEO, CFO, CMO, Sales, Operations, Creative and Data lenses without averaging them into fake consensus.","Each lens must state objective, evidence, constraint, downside and veto condition.","Arbitrate to one enterprise decision with dissent, trade-offs, owner, trigger to revisit and evidence that would reverse the choice."]},
  {id:"experimentation-os-v2",label:"Marketing Experimentation OS V2",runtime:true,doctrine:["Convert uncertain optimization into Hypothesis -> Treatment -> Control/comparator -> Primary metric -> Guardrail metric -> Duration/sample rule -> Scale/Kill rule -> Learning.","Pre-register success criteria before reading the result when practical.","Never call a test a winner when tracking, sample sufficiency, seasonality or operational confounds make the conclusion unreliable."]},
  {id:"financial-digital-twin-v2",label:"Financial Digital Twin V2",runtime:true,doctrine:["Model revenue, gross margin, contribution margin, payroll, media spend, CAC, LTV, payback, collections, cash burn, runway and capacity with explicit formulas and dates.","Separate invoiced revenue, collected cash, pass-through spend and recognized agency revenue.","For a proposed decision, show base/upside/downside effect on profit, cash and constraint bottlenecks before recommending scale."]},
  {id:"client-brand-twin-v3",label:"Client & Brand Twin V3",runtime:true,doctrine:["Maintain brand voice, visual codes, ICP, jobs-to-be-done, offers, pricing, objections, journey, winning/failed creatives, channel history, competitors, constraints and business objectives.","Treat the twin as scoped memory, never as global truth; client isolation is mandatory.","When a brief conflicts with verified brand or business constraints, surface the conflict rather than silently following the latest text."]},
  {id:"creative-intelligence-v2",label:"Creative Intelligence V2",runtime:true,doctrine:["Score concepts before production on hook, stopping power, message clarity, product fidelity, brand fit, emotional mechanism, offer strength, platform fit, novelty and fatigue risk.","Separate predicted creative quality from observed performance; a high pre-score is a hypothesis, not proof.","Translate learning into testable creative variables such as hook, first frame, proof, format, CTA, angle and offer rather than vague style judgments."]},
  {id:"media-buyer-copilot-v2",label:"Media Buyer Copilot V2",runtime:true,doctrine:["Diagnose account -> campaign -> ad set -> ad hierarchy and distinguish zero-results, rising-cost, tracking-break, audience-fatigue, creative-fatigue, learning-limited, healthy and scaling-opportunity states.","Budget reallocation must consider marginal efficiency, conversion quality, saturation, delivery stability, cash constraints and downstream sales capacity.","All external writes remain approval-gated and reversible with verification plus rollback criteria."]},
  {id:"sales-conversation-intelligence-v2",label:"Sales Conversation Intelligence V2",runtime:true,doctrine:["Extract stakeholder, role, need, urgency, budget signal, objections, buying signals, competitor mentions, commitment, next step and deal risk from calls, notes or emails.","Do not infer a commitment that was not stated; distinguish explicit promise, soft signal and analyst inference.","Recommend next-best action with owner, deadline, proof needed and CRM field updates while respecting role permissions."]},
  {id:"meeting-intelligence-v2",label:"Meeting Intelligence V2",runtime:true,doctrine:["Convert meetings into Decisions, Actions, Owners, Deadlines, Risks, Open Questions and Dependencies.","Separate agreed decisions from suggestions, debate and background context.","Flag missing owner/deadline and contradictory commitments; never fabricate them to make minutes look complete."]},
  {id:"forecasting-engine-v2",label:"Forecasting Engine V2",runtime:true,doctrine:["Produce a distribution or Base/Upside/Downside forecast with explicit drivers, assumptions, confidence and forecast horizon.","Identify leading indicators, break conditions and trigger points that would move the forecast materially.","Use sensitivity ranges instead of point precision when the input quality cannot support a narrow estimate."]},
  {id:"self-improvement-engine-v2",label:"Self-Improvement Engine V2",runtime:true,doctrine:["Convert validated failures into error taxonomy, generalized lesson, remediation rule and regression test without exposing or gaming a frozen benchmark.","Require evidence that a lesson generalizes across paraphrases or adjacent cases before promoting it to a durable rule.","Never weaken evaluator, threshold, safety, authorization or evidence standards to manufacture improvement."]},
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
  "decision-memory-v2":/(remember|history|previous decision|last time|decision memory|افتكر|المرة اللي فاتت|قرار سابق|ذاكرة)/i,
  "autonomous-research-v2":/(deep research|research agent|evidence|claim ledger|sources|بحث عميق|مصادر|دليل|تحقق)/i,
  "executive-war-room-v2":/(war room|ceo|cfo|cmo|executive team|board decision|ادارة عليا|مجلس|سي اي او|سي اف او)/i,
  "experimentation-os-v2":/(experiment|a\/b|test plan|hypothesis|holdout|تجربة|اختبار|فرضية)/i,
  "financial-digital-twin-v2":/(financial model|digital twin|cash flow|runway|contribution margin|payback|نموذج مالي|تدفق نقدي|هامش مساهمة)/i,
  "client-brand-twin-v3":/(brand voice|brand twin|client twin|brand codes|audience|offer|هوية|براند|عميل|جمهور|عرض)/i,
  "creative-intelligence-v2":/(creative score|creative fatigue|hook|first frame|scroll stop|كريتيف|هوك|فاتيغ|اول فريم)/i,
  "media-buyer-copilot-v2":/(media buyer|campaign|ad set|budget reallocation|cpa|roas|frequency|ميديا باير|كامبين|اد سيت|ميزانية اعلان)/i,
  "sales-conversation-intelligence-v2":/(sales call|call notes|objection|buying signal|crm|مكالمة مبيعات|اعتراض|اشارة شراء|سي ار ام)/i,
  "meeting-intelligence-v2":/(meeting|minutes|action items|owners|deadline|اجتماع|محضر|اكشن ايتم|مسؤول|موعد نهائي)/i,
  "forecasting-engine-v2":/(forecast|projection|upside|downside|confidence interval|توقع|تنبؤ|سيناريو صاعد|سيناريو هابط)/i,
  "self-improvement-engine-v2":/(self improve|regression|failure taxonomy|benchmark failure|تحسين ذاتي|ريجريشن|فشل الامتحان|درس)/i,
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
  return `VIVITO CAPABILITY PACK V5 — ACTIVE\n${active.map(c=>`[${c.label}]\n- ${c.doctrine.join("\n- ")}`).join("\n\n")}`;
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

export type DecisionMemoryRecord={decision:string;assumptions:string[];evidence:string[];owner?:string;expectedOutcome?:string;reviewAt?:string;actualOutcome?:string;superseded?:boolean};
export function summarizeDecisionMemory(records:DecisionMemoryRecord[]){
  const active=records.filter(r=>!r.superseded);
  return {activeCount:active.length,completed:active.filter(r=>Boolean(r.actualOutcome)).length,pendingReview:active.filter(r=>!r.actualOutcome).length,records:active};
}

export type ExperimentPlan={hypothesis:string;primaryMetric:string;guardrailMetric:string;durationDays:number;minimumSample?:number;scaleRule:string;killRule:string};
export function validateExperimentPlan(plan:ExperimentPlan){
  const issues:string[]=[];
  if(!plan.hypothesis.trim())issues.push("missing-hypothesis");
  if(!plan.primaryMetric.trim())issues.push("missing-primary-metric");
  if(!plan.guardrailMetric.trim())issues.push("missing-guardrail-metric");
  if(plan.durationDays<=0)issues.push("invalid-duration");
  if(!plan.scaleRule.trim()||!plan.killRule.trim())issues.push("missing-decision-rule");
  return {valid:issues.length===0,issues,preRegistered:issues.length===0};
}

export type FinancialTwinInput={revenue:number;cogs:number;payroll:number;mediaSpend:number;otherVariableCost?:number;cash:number;monthlyFixedCost?:number;newCustomers?:number;ltvGrossProfit?:number};
export function calculateFinancialDigitalTwin(input:FinancialTwinInput){
  const other=input.otherVariableCost??0;
  const grossProfit=input.revenue-input.cogs;
  const contributionMargin=grossProfit-input.mediaSpend-other;
  const operatingContribution=contributionMargin-input.payroll-(input.monthlyFixedCost??0);
  const cac=input.newCustomers&&input.newCustomers>0?input.mediaSpend/input.newCustomers:null;
  const paybackMonths=cac!=null&&input.ltvGrossProfit!=null&&input.ltvGrossProfit>0?cac/(input.ltvGrossProfit/12):null;
  const monthlyBurn=operatingContribution<0?Math.abs(operatingContribution):0;
  const runwayMonths=monthlyBurn>0?input.cash/monthlyBurn:null;
  return {grossProfit,contributionMargin,operatingContribution,cac,paybackMonths,runwayMonths};
}

export type CreativeIntelligenceInput={hook:number;clarity:number;productFidelity:number;brandFit:number;emotion:number;offer:number;platformFit:number;novelty:number;fatigueRisk:number};
export function scoreCreativeIntelligence(input:CreativeIntelligenceInput){
  const positive=[input.hook,input.clarity,input.productFidelity,input.brandFit,input.emotion,input.offer,input.platformFit,input.novelty];
  const bounded=positive.map(v=>Math.max(0,Math.min(100,v)));
  const base=bounded.reduce((a,b)=>a+b,0)/bounded.length;
  const fatiguePenalty=Math.max(0,Math.min(100,input.fatigueRisk))*0.2;
  return {preTestScore:Math.max(0,Math.round(base-fatiguePenalty)),classification:"HYPOTHESIS_NOT_PERFORMANCE_PROOF" as const};
}

export type ForecastInput={base:number;upsidePct:number;downsidePct:number;confidence:"LOW"|"MEDIUM"|"HIGH";drivers:string[];breakConditions:string[]};
export function buildForecastV2(input:ForecastInput){
  return {base:input.base,upside:input.base*(1+input.upsidePct/100),downside:input.base*(1-input.downsidePct/100),confidence:input.confidence,drivers:input.drivers,breakConditions:input.breakConditions,classification:"FORECAST_WITH_ASSUMPTIONS" as const};
}

export function blindBenchmarkPolicy(){
  return {anonymize:true,identicalPrompts:true,frozenRubric:true,revealAfterScoring:true,superiorityClaimAllowed:false,externalJudgmentsRequired:true};
}
