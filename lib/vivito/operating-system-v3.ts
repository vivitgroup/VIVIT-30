export type VivitoOperatingSystemV3Id=
  | "strategic-memory-graph-v3"
  | "counterfactual-reasoning-v2"
  | "portfolio-optimization-v2"
  | "pricing-revenue-architecture-v2"
  | "demand-capacity-planning-v2"
  | "customer-economics-v2"
  | "competitive-game-theory-v2"
  | "crisis-command-v2"
  | "governance-approval-intelligence-v2"
  | "knowledge-freshness-v2"
  | "operator-profile-v2"
  | "proof-of-work-ledger-v2";

export type VivitoOperatingSystemV3Capability={
  id:VivitoOperatingSystemV3Id;
  label:string;
  doctrine:string[];
};

export const VIVITO_OPERATING_SYSTEM_V3:VivitoOperatingSystemV3Capability[]=[
  {id:"strategic-memory-graph-v3",label:"Strategic Memory Graph V3",doctrine:["Link client, objective, campaign, audience, offer, creative, sales outcome and financial outcome across time.","Preserve provenance for every learned relationship and let newer verified evidence supersede stale assumptions.","Never leak graph nodes or inferred relationships across client boundaries."]},
  {id:"counterfactual-reasoning-v2",label:"Counterfactual Reasoning V2",doctrine:["Separate observed outcome from the credible no-intervention baseline.","State the assumptions required for a counterfactual and never claim causal lift from before/after movement alone.","Prefer holdout, matched comparison, synthetic control or explicit scenario range when a true counterfactual is unavailable."]},
  {id:"portfolio-optimization-v2",label:"Portfolio Optimization V2",doctrine:["Optimize scarce budget, people and attention across campaigns, clients and projects rather than treating every item independently.","Rank opportunities by expected contribution, confidence, capacity, strategic importance and downside risk.","Respect hard constraints, minimum service levels, concentration risk and client commitments before reallocating resources."]},
  {id:"pricing-revenue-architecture-v2",label:"Pricing & Revenue Architecture V2",doctrine:["Model list price, net price, discount, payment timing, scope burden, contribution margin and retention economics together.","Use tiers, bundles, retainers, commissions, upsell, cross-sell and willingness-to-pay hypotheses without inventing elasticity.","Every discount requires a reciprocal concession and a protected margin floor."]},
  {id:"demand-capacity-planning-v2",label:"Demand & Capacity Planning V2",doctrine:["Connect forecast demand to sales, creative, media, inventory, fulfillment and support capacity.","Detect when growth would exceed operational throughput and recommend staged scaling instead of blindly increasing demand.","Track utilization, queue/backlog, service level and bottleneck capacity as scaling constraints."]},
  {id:"customer-economics-v2",label:"Customer Economics V2",doctrine:["Use cohort retention, repeat rate, churn, gross-margin LTV, contribution LTV and marginal CAC where data supports them.","Distinguish blended CAC from marginal CAC and acquisition LTV from total-account value.","Set CAC ceilings from contribution economics and payback tolerance, not from ROAS alone."]},
  {id:"competitive-game-theory-v2",label:"Competitive Strategy & Game Theory V2",doctrine:["Anticipate plausible competitor responses to pricing, offer, positioning, media intensity and distribution moves.","Evaluate first-order gain and second-order reaction before committing to a strategy.","Use payoff ranges and strategic options when competitor intent cannot be known with confidence."]},
  {id:"crisis-command-v2",label:"Crisis Command V2",doctrine:["For severe incidents use Stabilize -> Diagnose -> Contain -> Recover -> Postmortem.","Separate customer, financial, operational, technical and reputation blast radius and assign an incident owner.","Preserve evidence, define communication cadence, rollback/containment trigger and exit criteria before declaring recovery."]},
  {id:"governance-approval-intelligence-v2",label:"Governance & Approval Intelligence V2",doctrine:["Classify actions as recommend-only, approval-required or safely executable within existing authorization.","Require explicit approval and four-eyes review for material irreversible, financial, permission-changing or external-write actions when policy requires it.","Never infer authorization from urgency, role prestige or prior unrelated approvals."]},
  {id:"knowledge-freshness-v2",label:"Knowledge Freshness Engine V2",doctrine:["Track source authority, fetched-at time, effective date, freshness SLA and supersession for time-sensitive knowledge.","Mark stale evidence explicitly and prefer newer first-party guidance when behavior or policy may have changed.","Do not present an old platform tactic, price, regulation or benchmark as current without freshness validation."]},
  {id:"operator-profile-v2",label:"Personalized Operator Profiles V2",doctrine:["Adapt depth, terminology and action granularity to the authorized role while preserving the same underlying facts.","CEO views emphasize decision, economics and risk; specialists receive execution detail and diagnostics.","Personalization must not change permissions, evidence standards, truthfulness or client isolation."]},
  {id:"proof-of-work-ledger-v2",label:"Proof-of-Work Ledger V2",doctrine:["Never claim an action was executed unless verifiable execution evidence exists.","Bind execution claims to an action id, commit SHA, artifact id, database mutation result, provider response or equivalent trace.","Distinguish PLANNED, ATTEMPTED, EXECUTED, VERIFIED and FAILED states and report partial execution accurately."]},
];

const OS_V3_PATTERNS:Record<VivitoOperatingSystemV3Id,RegExp>={
  "strategic-memory-graph-v3":/(memory|history|past|relationship|client context|ذاكرة|سجل|تاريخ|علاقة)/i,
  "counterfactual-reasoning-v2":/(counterfactual|incremental|without this|what if we did not|causal|ماذا لو لم|سببية|انكريمنتال)/i,
  "portfolio-optimization-v2":/(portfolio|allocate|reallocate|across campaigns|across clients|resource allocation|محفظة|توزيع ميزانية|توزيع موارد)/i,
  "pricing-revenue-architecture-v2":/(pricing|price|discount|bundle|retainer|commission|upsell|cross.?sell|تسعير|خصم|باندل|ريتainer|عمولة)/i,
  "demand-capacity-planning-v2":/(capacity|demand|backlog|throughput|utilization|inventory|قدرة|طلب|سعة|مخزون|ضغط تشغيل)/i,
  "customer-economics-v2":/(cohort|retention|churn|repeat|marginal cac|customer economics|احتفاظ|تسرب|تكرار شراء|اقتصاديات العميل)/i,
  "competitive-game-theory-v2":/(competitor response|game theory|reaction|competitive move|رد المنافس|نظرية الألعاب|منافس)/i,
  "crisis-command-v2":/(crisis|incident|emergency|outage|reputation|كارثة|أزمة|حادث|طوارئ)/i,
  "governance-approval-intelligence-v2":/(approval|authorize|permission|four.?eyes|governance|موافقة|صلاحية|اعتماد|حوكمة)/i,
  "knowledge-freshness-v2":/(fresh|stale|latest|current|effective date|fetched|حديث|قديم|احدث|حالي|تاريخ السريان)/i,
  "operator-profile-v2":/(ceo|cfo|cmo|media buyer|account manager|creator|accountant|role|مدير|ميديا باير|اكونت مانجر|محاسب)/i,
  "proof-of-work-ledger-v2":/(executed|implemented|done|commit|artifact|action id|نفذت|اتعمل|كوميت|اثبات تنفيذ)/i,
};

export function detectVivitoOperatingSystemV3(question:string){
  const selected=VIVITO_OPERATING_SYSTEM_V3.filter(c=>OS_V3_PATTERNS[c.id].test(question));
  if(selected.length===0&&/(decide|recommend|strategy|plan|قرار|توصية|استراتيجية|خطة)/i.test(question)){
    return VIVITO_OPERATING_SYSTEM_V3.filter(c=>["strategic-memory-graph-v3","proof-of-work-ledger-v2"].includes(c.id));
  }
  return selected;
}

export function buildVivitoOperatingSystemV3Context(question:string){
  const active=detectVivitoOperatingSystemV3(question);
  if(!active.length)return "";
  return `VIVITO OPERATING SYSTEM V3 — ACTIVE\n${active.map(c=>`[${c.label}]\n- ${c.doctrine.join("\n- ")}`).join("\n\n")}`;
}

export type PortfolioCandidate={id:string;expectedContribution:number;confidence:number;capacityCost:number;strategicWeight?:number;riskPenalty?:number;minimumAllocation?:number};
export function rankPortfolioCandidates(items:PortfolioCandidate[]){
  return [...items].map(item=>{
    const confidence=Math.min(1,Math.max(0,item.confidence));
    const strategicWeight=item.strategicWeight??1;
    const riskPenalty=Math.max(0,item.riskPenalty??0);
    const denominator=Math.max(0.0001,item.capacityCost);
    const score=(item.expectedContribution*confidence*strategicWeight-riskPenalty)/denominator;
    return {...item,score};
  }).sort((a,b)=>b.score-a.score);
}

export type PricingArchitectureInput={listPrice:number;discountPct?:number;variableCost:number;serviceBurdenCost?:number;collectionDelayDays?:number};
export function calculatePricingArchitecture(input:PricingArchitectureInput){
  if(input.listPrice<=0||input.variableCost<0)throw new Error("invalid-pricing-input");
  const discountPct=Math.min(100,Math.max(0,input.discountPct??0));
  const netPrice=input.listPrice*(1-discountPct/100);
  const totalDirectCost=input.variableCost+(input.serviceBurdenCost??0);
  const contribution=netPrice-totalDirectCost;
  const contributionMargin=netPrice>0?contribution/netPrice:null;
  return {netPrice,totalDirectCost,contribution,contributionMargin,collectionDelayDays:input.collectionDelayDays??0,discountRequiresReciprocalConcession:discountPct>0};
}

export type CapacityPlanInput={forecastDemand:number;unitsPerCapacity:number;availableCapacity:number;serviceLevelBufferPct?:number};
export function calculateDemandCapacityPlan(input:CapacityPlanInput){
  if(input.forecastDemand<0||input.unitsPerCapacity<=0||input.availableCapacity<0)throw new Error("invalid-capacity-input");
  const buffer=1+(input.serviceLevelBufferPct??10)/100;
  const requiredCapacity=input.forecastDemand*buffer/input.unitsPerCapacity;
  const utilization=requiredCapacity/input.availableCapacity;
  return {requiredCapacity,utilization,capacityGap:input.availableCapacity-requiredCapacity,scaleAllowed:utilization<=1};
}

export type CustomerEconomicsInput={acquisitionCost:number;grossMarginPerOrder:number;expectedOrders:number;retentionProbability?:number};
export function calculateCustomerEconomics(input:CustomerEconomicsInput){
  if(input.acquisitionCost<0||input.grossMarginPerOrder<0||input.expectedOrders<0)throw new Error("invalid-customer-economics-input");
  const retention=Math.min(1,Math.max(0,input.retentionProbability??1));
  const contributionLtv=input.grossMarginPerOrder*input.expectedOrders*retention;
  const ltvCac=input.acquisitionCost>0?contributionLtv/input.acquisitionCost:null;
  const paybackOrders=input.grossMarginPerOrder>0?input.acquisitionCost/input.grossMarginPerOrder:null;
  return {contributionLtv,ltvCac,paybackOrders,cacCeiling:contributionLtv};
}

export type ProofOfWorkState="PLANNED"|"ATTEMPTED"|"EXECUTED"|"VERIFIED"|"FAILED";
export type ProofOfWorkEntry={state:ProofOfWorkState;action:string;evidenceId?:string;evidenceType?:"ACTION_ID"|"COMMIT_SHA"|"ARTIFACT_ID"|"DB_RESULT"|"PROVIDER_RESPONSE"|"OTHER"};
export function validateProofOfWork(entry:ProofOfWorkEntry){
  const executionClaim=entry.state==="EXECUTED"||entry.state==="VERIFIED";
  return {...entry,claimAllowed:!executionClaim||Boolean(entry.evidenceId&&entry.evidenceType),verified:entry.state==="VERIFIED"&&Boolean(entry.evidenceId)};
}

export type FreshKnowledge={source:string;authority:"FIRST_PARTY"|"OFFICIAL"|"TRUSTED_SECONDARY"|"OTHER";fetchedAt:string;effectiveDate?:string;freshnessSlaHours:number;supersedes?:string};
export function assessKnowledgeFreshness(input:FreshKnowledge,nowMs=Date.now()){
  const fetchedMs=Date.parse(input.fetchedAt);
  if(!Number.isFinite(fetchedMs))throw new Error("invalid-fetched-at");
  const ageHours=Math.max(0,(nowMs-fetchedMs)/3600000);
  return {...input,ageHours,fresh:ageHours<=input.freshnessSlaHours};
}

export type CounterfactualInput={observed:number;baseline:number;baselineConfidence:number};
export function assessCounterfactual(input:CounterfactualInput){
  const confidence=Math.min(1,Math.max(0,input.baselineConfidence));
  return {observed:input.observed,baseline:input.baseline,estimatedIncrement:input.observed-input.baseline,confidence,causalClaim:confidence>=0.8?"PLAUSIBLE_NOT_PROVEN":"INSUFFICIENT_FOR_CAUSALITY" as const};
}
