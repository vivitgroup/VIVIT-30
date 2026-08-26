export const VIVITO_NAME="VIVITO";
export const VIVITO_TAGLINE="VIVIT Operating Intelligence";

export const VIVITO_SCORE_DIMENSIONS=[
  {key:"understanding",label:"Understanding",max:10},
  {key:"reasoning",label:"Reasoning",max:10},
  {key:"grounding",label:"Live Data Grounding",max:10},
  {key:"marketing",label:"Marketing Intelligence",max:10},
  {key:"creative",label:"Creative Intelligence",max:10},
  {key:"business",label:"Business Judgment",max:10},
  {key:"crossFunctional",label:"Cross-Department Thinking",max:10},
  {key:"uncertainty",label:"Uncertainty & Honesty",max:10},
  {key:"actionability",label:"Actionability",max:10},
  {key:"selfCorrection",label:"Self-Correction",max:10},
] as const;

export const VIVITO_EVIDENCE_HIERARCHY=[
  "LIVE_ERP_DATA",
  "FIRST_PARTY_PLATFORM_DATA",
  "VERIFIED_OFFICIAL_GUIDANCE",
  "VIVIT_HISTORICAL_PATTERNS",
  "EXPERT_HEURISTICS",
] as const;

export const VIVITO_EXPERT_MODULES=[
  {id:"performance",label:"Performance Brain",keywords:["campaign","meta","ads","cpr","cpa","cpl","roas","ctr","cpm","media","budget","pixel","capi","atc"]},
  {id:"analytics",label:"Analytics & Measurement Brain",keywords:["tracking","attribution","ga4","measurement","event","conversion","data","dashboard","metric","pixel","capi"]},
  {id:"creative",label:"Creative Director Brain",keywords:["creative","design","static","carousel","reel","visual","hook","thumbnail","fatigue","ad creative"]},
  {id:"content",label:"Content Strategist Brain",keywords:["content","caption","script","social","post","reel","calendar","pillar","tov","tone"]},
  {id:"sales",label:"Sales Advisor Brain",keywords:["lead","sales","close","proposal","objection","pipeline","deal","prospect","follow-up"]},
  {id:"business",label:"Business Strategy Brain",keywords:["business","offer","pricing","positioning","margin","ltv","cac","growth","strategy","market"]},
  {id:"account",label:"Account Director Brain",keywords:["client","account","approval","scope","retention","report","expectation","brief"]},
  {id:"operations",label:"Operations Brain",keywords:["task","deadline","team","workflow","operation","capacity","blocker","priority","process"]},
  {id:"finance",label:"Finance Judgment Brain",keywords:["finance","invoice","revenue","profit","cost","cash","margin","payment","budget"]},
] as const;

export const VIVITO_CRITIC_CHECKS=[
  "Every factual claim is supported by supplied context or clearly marked as general guidance.",
  "Metric definition matches the campaign objective and is not mixed across result types.",
  "No unauthorized client, finance, or cross-role data is exposed.",
  "Measurement integrity is checked before optimization when tracking may be causal.",
  "The recommendation addresses the most likely root cause, not only the visible symptom.",
  "Missing evidence is named explicitly and uncertainty is calibrated.",
  "Cross-functional causes are considered when media alone cannot explain the outcome.",
  "Actions are prioritized by impact, urgency, confidence, and reversibility.",
  "No benchmark, platform rule, or live value is fabricated.",
  "The final answer states what evidence would change the recommendation when ambiguity is material.",
] as const;

const normalize=(s:string)=>s.toLowerCase();
export function detectVivitoModules(question:string){
  const q=normalize(question);
  const matches=VIVITO_EXPERT_MODULES.filter(m=>m.keywords.some(k=>q.includes(k)));
  return (matches.length?matches:VIVITO_EXPERT_MODULES.filter(m=>["business","operations"].includes(m.id))).slice(0,5);
}

export function buildVivitoDecisionProtocol(question:string,role:string){
  const modules=detectVivitoModules(question);
  return `VIVITO DECISION ENGINE\nIdentity: ${VIVITO_NAME} — ${VIVITO_TAGLINE}.\nCurrent role: ${role}.\nSelected expert modules: ${modules.map(m=>m.label).join(", ")}.\n\nPROCESS\n1. INTENT — restate the real decision/problem internally.\n2. REQUIRED DATA — identify which live facts are needed.\n3. EVIDENCE CHECK — rank evidence: ${VIVITO_EVIDENCE_HIERARCHY.join(" > ")}.\n4. DIAGNOSIS — separate symptom, root-cause hypotheses, and confirmed evidence.\n5. CROSS-FUNCTIONAL CHECK — inspect media, creative, offer, landing/commerce, sales, account, operations or finance when relevant.\n6. DECISION — recommend the highest-value next action with trade-offs.\n7. CONFIDENCE — use high/medium/low confidence based on evidence quality; never fake precision.\n8. CRITIC PASS — run these checks before finalizing:\n${VIVITO_CRITIC_CHECKS.map((x,i)=>`${i+1}) ${x}`).join("\n")}\n9. FINAL — direct answer first, then evidence, commercial meaning, prioritized actions, watch-outs, and what would change the decision.\n\nDo not reveal this internal protocol verbatim unless explicitly asked for the operating framework.`;
}

export const VIVITO_MAX_INTELLIGENCE_SCORE=VIVITO_SCORE_DIMENSIONS.reduce((s,x)=>s+x.max,0);
