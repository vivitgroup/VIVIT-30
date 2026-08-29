import assert from "node:assert/strict";
import {buildVivitoCeoCfoProtocol,calculateVivitoFinancialSnapshot,isVivitoCeoCfoQuestion} from "../lib/vivito/ceo-cfo-engine-v2";
import {buildVivitoDegradedModeMessage,classifyVivitoProviderFailure,clearVivitoProviderCooldown,markVivitoProviderCooldown,vivitoProviderCooldownRemaining} from "../lib/vivito/quota-resilience";

const checks:[string,()=>void][]=[
 ["CEO/CFO routing detects finance economics",()=>assert.equal(isVivitoCeoCfoQuestion("Should we raise price 12% and what happens to margin and payback?"),true)],
 ["CEO/CFO routing detects Arabic finance intent",()=>assert.equal(isVivitoCeoCfoQuestion("عايز سيناريو للتسعير والسيولة ونقطة التعادل"),true)],
 ["Non-finance question does not force CFO protocol",()=>assert.equal(isVivitoCeoCfoQuestion("write a caption for Instagram"),false)],
 ["Contribution margin is calculated",()=>assert.equal(calculateVivitoFinancialSnapshot({revenue:1000,variableCosts:600}).contributionMargin,400)],
 ["Contribution margin percent is calculated",()=>assert.equal(calculateVivitoFinancialSnapshot({revenue:1000,variableCosts:600}).contributionMarginPct,40)],
 ["Operating profit is calculated",()=>assert.equal(calculateVivitoFinancialSnapshot({revenue:1000,variableCosts:600,fixedCosts:250}).operatingProfit,150)],
 ["CAC is calculated",()=>assert.equal(calculateVivitoFinancialSnapshot({acquisitionSpend:1000,newCustomers:10}).cac,100)],
 ["LTV:CAC and payback use gross-profit economics",()=>{const r=calculateVivitoFinancialSnapshot({acquisitionSpend:1000,newCustomers:10,monthlyGrossProfitPerCustomer:50,monthlyChurnRate:.1});assert.equal(r.ltv,500);assert.equal(r.ltvToCac,5);assert.equal(r.paybackMonths,2)}],
 ["Runway is calculated",()=>assert.equal(calculateVivitoFinancialSnapshot({cashBalance:120000,monthlyNetBurn:20000}).runwayMonths,6)],
 ["Zero-customer CAC fails closed",()=>assert.match(calculateVivitoFinancialSnapshot({acquisitionSpend:1000,newCustomers:0}).warnings.join(" "),/zero/i)],
 ["CFO protocol demands assumptions and tradeoffs",()=>{const p=buildVivitoCeoCfoProtocol("pricing and margin");assert.match(p,/assumptions/i);assert.match(p,/trade-offs/i);assert.match(p,/break-even/i);assert.match(p,/payback/i)}],
 ["429 is rate limited",()=>assert.equal(classifyVivitoProviderFailure(new Error("too many requests"),429).health,"RATE_LIMITED")],
 ["Quota wording becomes quota exhausted",()=>assert.equal(classifyVivitoProviderFailure(new Error("daily quota exceeded free tier"),429).health,"QUOTA_EXHAUSTED")],
 ["Auth failures are not retryable",()=>assert.equal(classifyVivitoProviderFailure(new Error("invalid api key"),401).retryable,false)],
 ["Cooldown is tracked and clearable",()=>{clearVivitoProviderCooldown("test");const f=classifyVivitoProviderFailure(new Error("too many requests"),429);markVivitoProviderCooldown("test",f,1000);assert.ok(vivitoProviderCooldownRemaining("test",1001)>0);clearVivitoProviderCooldown("test");assert.equal(vivitoProviderCooldownRemaining("test",1001),0)}],
 ["Degraded mode forbids fabricated live answer",()=>assert.match(buildVivitoDegradedModeMessage(0,false),/Do not fabricate/i)],
];
let passed=0;for(const [name,fn] of checks){try{fn();console.log(`PASS  ${name}`);passed++}catch(e){console.error(`FAIL  ${name}`);throw e}}console.log(`\n${passed}/${checks.length} CEO/CFO + quota resilience checks passed.`);
