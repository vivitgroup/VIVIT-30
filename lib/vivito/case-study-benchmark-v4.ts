export type VivitoCaseDomain="marketing"|"finance"|"business"|"media_buying";
export type VivitoCaseRole="SUPER_ADMIN"|"ACCOUNT_MANAGER"|"MEDIA_BUYER"|"CREATOR"|"ACCOUNTANT"|"SALES"|"CLIENT";
export type VivitoCaseStudyV4={id:string;domain:VivitoCaseDomain;industry:string;prompt:string;mustAddress:string[];roles:VivitoCaseRole[];risk:"advice"|"decision";};

const industries=["real estate","healthcare","ecommerce","SaaS","hospitality","automotive","beauty","education","B2B services","FMCG"] as const;
const cases:VivitoCaseStudyV4[]=[];
const ALL:VivitoCaseRole[]=["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","ACCOUNTANT","SALES","CLIENT"];
const roleMap:Record<VivitoCaseDomain,VivitoCaseRole[]>={
 marketing:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CREATOR","SALES","CLIENT"],
 finance:["SUPER_ADMIN","ACCOUNT_MANAGER","ACCOUNTANT"],
 business:["SUPER_ADMIN","ACCOUNT_MANAGER","ACCOUNTANT","SALES","CLIENT"],
 media_buying:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","CLIENT"]
};

function addDomain(domain:VivitoCaseDomain,problems:string[],conditions:string[],mustAddress:string[],instruction:string){
 let n=0;
 for(const industry of industries)for(const problem of problems)for(const condition of conditions){
  n++;
  cases.push({id:`${domain.toUpperCase().replace("_","")}-${String(n).padStart(3,"0")}`,domain,industry,prompt:`${industry} case study: ${problem}. Constraint/signal: ${condition}. ${instruction}`,mustAddress,roles:roleMap[domain],risk:domain==="finance"||domain==="business"?"decision":"advice"});
 }
}

addDomain("marketing",
 ["qualified demand is falling while traffic grows","brand awareness rises but pipeline stays flat","a launch gets clicks but weak purchase intent","retention falls despite stable acquisition","content volume doubles without revenue impact"],
 ["tracking is incomplete","budget cannot increase","sales capacity is constrained","competitors are discounting aggressively","the historical baseline is unreliable"],
 ["evidence","segment","funnel","economics","experiment","KPI","decision rule"],
 "Diagnose the root cause, separate facts from assumptions, connect customer behavior to funnel economics, prioritize experiments, define KPIs, owner, timing, and stop/scale rules. Do not execute changes."
);

addDomain("finance",
 ["revenue is growing but cash is tightening","gross margin is declining","receivables are aging","marketing spend is rising faster than contribution profit","a new service looks profitable before overhead allocation"],
 ["working capital is constrained","one customer represents a large revenue share","payment terms are lengthening","forecast confidence is low","fixed costs are about to increase"],
 ["revenue","gross margin","contribution margin","cash flow","working capital","scenario","risk","decision threshold"],
 "Assess P&L and cash separately, identify missing inputs, calculate or frame the relevant unit economics, stress-test downside scenarios, and recommend a reversible decision with thresholds. Never invent financial data."
);

addDomain("business",
 ["management is considering a price increase","the company is deciding whether to hire or outsource","the team wants to enter a new market","an unprofitable client consumes scarce capacity","capital must be allocated between growth and retention"],
 ["demand is volatile","customer concentration is high","capacity utilization is near its limit","the sales cycle is lengthening","retention is weakening"],
 ["objective","unit economics","cash","trade-off","opportunity cost","scenario","reversibility","trigger"],
 "Frame the decision, quantify what can be quantified, expose assumptions and opportunity cost, compare scenarios, identify second-order effects, and give a proceed/hold/stop trigger."
);

addDomain("media_buying",
 ["CTR falls while frequency rises","CPL improves while CRM lead quality collapses","ROAS rises while contribution profit falls","spend increases with flat purchases","reported conversions disagree with CRM"],
 ["Pixel and CAPI are healthy","CAPI is degraded","UTMs are missing","the landing page is slow","creative volume is too low"],
 ["measurement","result definition","business outcome","creative","audience","budget","validation","guardrail"],
 "Validate measurement before optimization, define the business-relevant result, distinguish platform signal from commercial outcome, diagnose creative/audience/budget issues, then recommend validation and stop/scale guardrails. Do not mutate campaigns."
);

export const VIVITO_CASE_STUDY_BENCHMARK_V4=Object.freeze(cases);
export const VIVITO_CASE_STUDY_BENCHMARK_V4_VERSION="4.0.0";
export const VIVITO_CASE_STUDY_BENCHMARK_V4_TARGET=1000;
export const VIVITO_CASE_STUDY_ROLE_SCOPE:Record<VivitoCaseRole,readonly VivitoCaseStudyV4[]>=Object.fromEntries(ALL.map(role=>[role,Object.freeze(cases.filter(c=>c.roles.includes(role)))])) as Record<VivitoCaseRole,readonly VivitoCaseStudyV4[]>;
export function vivitoCasesForRole(role:VivitoCaseRole){return VIVITO_CASE_STUDY_ROLE_SCOPE[role]||[];}
if(cases.length!==VIVITO_CASE_STUDY_BENCHMARK_V4_TARGET)throw new Error(`V4 benchmark must contain exactly 1000 cases; got ${cases.length}`);
if(VIVITO_CASE_STUDY_ROLE_SCOPE.SUPER_ADMIN.length!==1000)throw new Error("Super Admin must receive all 1000 cases");
