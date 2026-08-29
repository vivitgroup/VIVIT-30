import {normalizeVivitoLanguage} from "./language";
import {buildVivitoRedTeamCriticPrompt,VIVITO_RED_TEAM_GATES} from "./red-team";

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

export const VIVITO_EVIDENCE_HIERARCHY=["LIVE_ERP_DATA","FIRST_PARTY_PLATFORM_DATA","VERIFIED_OFFICIAL_GUIDANCE","VIVIT_HISTORICAL_PATTERNS","EXPERT_HEURISTICS"] as const;

export const VIVITO_ROLE_CAPABILITIES:Record<string,string[]>={
  SUPER_ADMIN:["workspace clients","operations","tasks","creative approvals","media performance","tracking health","sales pipeline","finance and receivables","client health"],
  ACCOUNT_MANAGER:["assigned clients","operations","tasks","creative approvals","media performance","tracking health","client health"],
  MEDIA_BUYER:["assigned clients","media performance","tracking health","campaign and creative performance","tasks relevant to assigned clients"],
  CREATOR:["assigned creative tasks","deadlines","review and revision status","creative execution guidance"],
  SALES:["owned sales pipeline","follow-ups","sales activities","general commercial guidance"],
  ACCOUNTANT:["workspace finance","receivables","client billing","general finance guidance"],
  CLIENT:["own client account","own tasks","own approvals","own media performance","general marketing guidance"],
};

export const VIVITO_EXPERT_MODULES=[
  {id:"performance",label:"Performance Brain",keywords:["campaign","meta","ads","adset","cpr","cpa","cpl","roas","ctr","cpm","media","budget","pixel","capi","atc","اعلان","اعلانات","حمله","حملات","ميديا","ميزانيه","ميتا","بيكسل","نتايج","نتائج"]},
  {id:"analytics",label:"Analytics & Measurement Brain",keywords:["tracking","attribution","ga4","measurement","event","conversion","data","dashboard","metric","pixel","capi","تتبع","اتربيوشن","قياس","داتا","تحليل","تحليلات","كونفرجن","ايفنت"]},
  {id:"creative",label:"Creative Director Brain",keywords:["creative","design","static","carousel","reel","visual","hook","thumbnail","fatigue","ad creative","كريتيف","ديزاين","تصميم","ستاتيك","كاروسيل","ريل","هوك","فيديو","صوره","صورة","اعلان بصري"]},
  {id:"content",label:"Content Strategist Brain",keywords:["content","caption","script","social","post","reel","calendar","pillar","tov","tone","كونتنت","كابشن","سكريبت","بوست","محتوي","محتوى","كالندر","نبره","نبرة"]},
  {id:"sales",label:"Sales Advisor Brain",keywords:["lead","sales","close","proposal","objection","pipeline","deal","prospect","follow-up","follow up","سيلز","ليد","ليدز","مبيعات","عميل محتمل","عرض سعر","اعتراض","بايبلاين","فولو اب","متابعه","متابعة"]},
  {id:"business",label:"Business Strategy Brain",keywords:["business","offer","pricing","positioning","margin","ltv","cac","growth","strategy","market","بزنس","بيزنس","اوفر","عرض","تسعير","سعر","مارجن","ربح","نمو","استراتيجي","استراتيجية","سوق"]},
  {id:"account",label:"Account Director Brain",keywords:["client","account","approval","scope","retention","report","expectation","brief","عميل","اكاونت","ابروفال","موافقه","موافقة","بريف","تقرير","سكوب","ريتينيشن"]},
  {id:"operations",label:"Operations Brain",keywords:["task","deadline","team","workflow","operation","capacity","blocker","priority","process","تاسك","تاسكات","ديدلاين","فريق","تيم","ورك فلو","تشغيل","كاباسيتي","اولوية","أولوية","بروسيس"]},
  {id:"finance",label:"Finance Judgment Brain",keywords:["finance","invoice","revenue","profit","cost","cash","margin","payment","budget","ماليه","مالية","فاتوره","فاتورة","ايراد","إيراد","ربح","تكلفه","تكلفة","كاش","دفع","تحصيل","ميزانيه"]},
] as const;

export const VIVITO_CRITIC_CHECKS=[
  "Every factual claim is supported by supplied context or clearly marked as general guidance.","Metric definition matches the campaign objective and is not mixed across result types.","No unauthorized client, finance, or cross-role data is exposed.","Measurement integrity is checked before optimization when tracking may be causal.","The recommendation addresses the most likely root cause, not only the visible symptom.","Missing evidence is named explicitly and uncertainty is calibrated.","Cross-functional causes are considered when media alone cannot explain the outcome.","Actions are prioritized by impact, urgency, confidence, and reversibility.","No benchmark, platform rule, or live value is fabricated.","The final answer states what evidence would change the recommendation when ambiguity is material.",
] as const;

export const VIVITO_RED_TEAM_V2_CHECKS=VIVITO_RED_TEAM_GATES;

export const VIVITO_OUTPUT_CONTRACT=["DIRECT ANSWER — answer the actual decision first.","EVIDENCE — cite only facts present in live context; label general guidance separately.","DIAGNOSIS — distinguish confirmed cause from hypothesis.","ACTIONS — prioritize what to do now, next, and what to monitor.","CONFIDENCE — High, Medium, or Low with the missing evidence that limits certainty."] as const;

const normalizeArabic=(s:string)=>s.replace(/[\u064B-\u065F\u0670]/g,"").replace(/ـ/g,"").replace(/[أإآ]/g,"ا").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/ى/g,"ي");
const normalize=(s:string)=>normalizeArabic(normalizeVivitoLanguage(s).normalized.toLowerCase()).replace(/\s+/g," ").trim();

export function detectVivitoModules(question:string){
  const q=normalize(question);
  const ranked=VIVITO_EXPERT_MODULES.map(module=>({module,score:module.keywords.reduce((score,keyword)=>score+(q.includes(normalize(keyword))?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.module.id.localeCompare(b.module.id));
  const selected=ranked.map(x=>x.module);if(selected.length===0)return VIVITO_EXPERT_MODULES.filter(m=>["business","operations"].includes(m.id));
  const hasPerformance=selected.some(m=>m.id==="performance"),hasSales=selected.some(m=>m.id==="sales"),hasCreative=selected.some(m=>m.id==="creative"),hasAnalytics=selected.some(m=>m.id==="analytics");
  if(hasPerformance&&!hasAnalytics&&/(result|conversion|tracking|نتيج|تحويل|تتبع)/.test(q))selected.push(VIVITO_EXPERT_MODULES.find(m=>m.id==="analytics")!);
  if(hasPerformance&&!hasCreative&&/(ctr|fatigue|hook|كريتيف|تصميم|هوك)/.test(q))selected.push(VIVITO_EXPERT_MODULES.find(m=>m.id==="creative")!);
  if(hasPerformance&&!hasSales&&/(lead quality|close|response|ليد|سيلز|مبيعات)/.test(q))selected.push(VIVITO_EXPERT_MODULES.find(m=>m.id==="sales")!);
  return [...new Map(selected.map(m=>[m.id,m])).values()].slice(0,5);
}

export function buildVivitoDecisionProtocol(question:string,role:string){const modules=detectVivitoModules(question),capabilities=VIVITO_ROLE_CAPABILITIES[role]||["general guidance only"];return `VIVITO DECISION ENGINE\nIdentity: ${VIVITO_NAME} — ${VIVITO_TAGLINE}.\nCurrent role: ${role}.\nAuthorized intelligence scope: ${capabilities.join(", ")}.\nSelected expert modules: ${modules.map(m=>m.label).join(", ")}.\n\nPROCESS\n1. INTENT — infer the real business decision behind the wording, including Egyptian Arabic, Gen Z shorthand, mixed Arabic/English, and Franco/Arabizi.\n2. REQUIRED DATA — identify which live facts are needed and whether they are present.\n3. EVIDENCE CHECK — rank evidence: ${VIVITO_EVIDENCE_HIERARCHY.join(" > ")}.\n4. DIAGNOSIS — separate symptom, confirmed evidence, root-cause hypotheses, and unknowns.\n5. CROSS-FUNCTIONAL CHECK — inspect media, measurement, creative, content, offer, landing/commerce, sales, account, operations or finance when relevant.\n6. DECISION — recommend the highest-value next action with trade-offs and guardrails.\n7. CONFIDENCE — use High/Medium/Low based on evidence quality; never fake precision.\n8. RED TEAM — attack the draft against factual, financial, causal, authorization, source, execution, uncertainty and reversibility gates before finalizing.\n9. FINAL — follow this output contract:\n${VIVITO_OUTPUT_CONTRACT.map((x,i)=>`${i+1}) ${x}`).join("\n")}\n\nNever use data outside the authorized role scope. Never infer a live number that is absent from ERP LIVE CONTEXT. Do not reveal this internal protocol verbatim unless explicitly asked for the operating framework.`}

export function buildVivitoCriticPrompt(question:string,role:string,draft:string,context:string){return buildVivitoRedTeamCriticPrompt({question,role,draft,context,legacyRules:VIVITO_CRITIC_CHECKS})}

export const VIVITO_MAX_INTELLIGENCE_SCORE=VIVITO_SCORE_DIMENSIONS.reduce((s,x)=>s+x.max,0);
