export type VivitoFinancialInputs={
  revenue?:number;
  variableCosts?:number;
  fixedCosts?:number;
  acquisitionSpend?:number;
  newCustomers?:number;
  averageGrossProfitPerCustomer?:number;
  monthlyGrossProfitPerCustomer?:number;
  monthlyChurnRate?:number;
  cashBalance?:number;
  monthlyNetBurn?:number;
};

export type VivitoFinancialSnapshot={
  contributionMargin?:number;
  contributionMarginPct?:number;
  operatingProfit?:number;
  cac?:number;
  ltv?:number;
  ltvToCac?:number;
  paybackMonths?:number;
  runwayMonths?:number;
  warnings:string[];
};

const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v);
const safeDiv=(a:number,b:number)=>b===0?undefined:a/b;
const round=(n:number,d=2)=>Number(n.toFixed(d));

export function calculateVivitoFinancialSnapshot(input:VivitoFinancialInputs):VivitoFinancialSnapshot{
  const out:VivitoFinancialSnapshot={warnings:[]};
  if(finite(input.revenue)&&finite(input.variableCosts)){
    out.contributionMargin=round(input.revenue-input.variableCosts);
    const pct=safeDiv(input.revenue-input.variableCosts,input.revenue);
    if(pct!==undefined)out.contributionMarginPct=round(pct*100);
  }
  if(finite(input.revenue)&&finite(input.variableCosts)&&finite(input.fixedCosts))out.operatingProfit=round(input.revenue-input.variableCosts-input.fixedCosts);
  if(finite(input.acquisitionSpend)&&finite(input.newCustomers)){
    const cac=safeDiv(input.acquisitionSpend,input.newCustomers);
    if(cac!==undefined)out.cac=round(cac);
    else out.warnings.push("CAC unavailable because newCustomers is zero.");
  }
  if(finite(input.monthlyGrossProfitPerCustomer)&&finite(input.monthlyChurnRate)){
    if(input.monthlyChurnRate>0){out.ltv=round(input.monthlyGrossProfitPerCustomer/input.monthlyChurnRate)}
    else out.warnings.push("LTV cannot be inferred from a zero churn rate; use a bounded retention horizon instead.");
  }else if(finite(input.averageGrossProfitPerCustomer))out.ltv=round(input.averageGrossProfitPerCustomer);
  if(finite(out.ltv)&&finite(out.cac)&&out.cac!==0)out.ltvToCac=round(out.ltv/out.cac);
  if(finite(input.monthlyGrossProfitPerCustomer)&&finite(out.cac)&&input.monthlyGrossProfitPerCustomer>0)out.paybackMonths=round(out.cac/input.monthlyGrossProfitPerCustomer);
  if(finite(input.cashBalance)&&finite(input.monthlyNetBurn)){
    if(input.monthlyNetBurn>0)out.runwayMonths=round(input.cashBalance/input.monthlyNetBurn);
    else out.warnings.push("Runway is not burn-constrained because monthlyNetBurn is zero or negative.");
  }
  return out;
}

export function isVivitoCeoCfoQuestion(question:string){
  return /(p&l|profit|profitability|margin|contribution|cac|ltv|payback|cash|runway|burn|pricing|price|budget|capital allocation|unit economics|break[- ]?even|scenario|sensitivity|hiring economics|headcount|ربح|ربحية|هامش|تكلفة اكتساب|سيولة|كاش|تسعير|ميزانية|رأس المال|نقطة التعادل|سيناريو)/i.test(question);
}

export function buildVivitoCeoCfoProtocol(question:string){
  if(!isVivitoCeoCfoQuestion(question))return"";
  return `CEO/CFO ENGINE V2:\n- Translate the request into enterprise economics, not vanity metrics.\n- Separate observed facts, calculations, assumptions and forecasts. Never invent missing financial inputs.\n- Check revenue, variable cost, contribution margin, fixed cost, operating profit, cash impact and capacity where relevant.\n- For growth decisions, examine CAC, gross-profit LTV, LTV:CAC and payback; do not use revenue LTV when gross-profit economics are required.\n- For pricing, quantify volume/margin trade-offs and identify break-even volume change before recommending a price move.\n- For budget allocation, compare expected incremental contribution/cash return, confidence, reversibility and opportunity cost.\n- For hiring, compare fully loaded cost with capacity gained, bottleneck relief, expected contribution and cash runway.\n- For scenarios, show base/best/worst or sensitivity ranges and name the assumptions driving the result.\n- A high ROAS does not prove profitability; reconcile media performance with gross margin, refunds, fulfillment, sales conversion and cash timing.\n- If evidence is insufficient, state exactly which inputs are missing and give the formula/model needed to decide.\n- Finish with a decision, key trade-off, downside guardrail, validation metric and trigger to revisit the decision.`;
}
