import assert from "node:assert/strict";
import {
  VIVITO_OPERATING_SYSTEM_V3,
  detectVivitoOperatingSystemV3,
  rankPortfolioCandidates,
  calculatePricingArchitecture,
  calculateDemandCapacityPlan,
  calculateCustomerEconomics,
  validateProofOfWork,
  assessKnowledgeFreshness,
  assessCounterfactual,
} from "../lib/vivito/operating-system-v3";

const expectedIds=[
  "strategic-memory-graph-v3","counterfactual-reasoning-v2","portfolio-optimization-v2",
  "pricing-revenue-architecture-v2","demand-capacity-planning-v2","customer-economics-v2",
  "competitive-game-theory-v2","crisis-command-v2","governance-approval-intelligence-v2",
  "knowledge-freshness-v2","operator-profile-v2","proof-of-work-ledger-v2",
];
assert.equal(VIVITO_OPERATING_SYSTEM_V3.length,12);
assert.deepEqual(VIVITO_OPERATING_SYSTEM_V3.map(x=>x.id),expectedIds);
assert.ok(VIVITO_OPERATING_SYSTEM_V3.every(x=>x.doctrine.length>=3));

assert.ok(detectVivitoOperatingSystemV3("allocate budget across campaigns").some(x=>x.id==="portfolio-optimization-v2"));
assert.ok(detectVivitoOperatingSystemV3("we executed the change, show proof").some(x=>x.id==="proof-of-work-ledger-v2"));
assert.ok(detectVivitoOperatingSystemV3("current platform rule freshness").some(x=>x.id==="knowledge-freshness-v2"));
assert.ok(detectVivitoOperatingSystemV3("client crisis and reputation incident").some(x=>x.id==="crisis-command-v2"));

const ranked=rankPortfolioCandidates([
  {id:"a",expectedContribution:100,confidence:1,capacityCost:10},
  {id:"b",expectedContribution:50,confidence:0.5,capacityCost:10},
]);
assert.equal(ranked[0].id,"a");

const pricing=calculatePricingArchitecture({listPrice:1000,discountPct:10,variableCost:400,serviceBurdenCost:100});
assert.equal(pricing.netPrice,900);
assert.equal(pricing.contribution,400);
assert.equal(pricing.discountRequiresReciprocalConcession,true);

const capacity=calculateDemandCapacityPlan({forecastDemand:100,unitsPerCapacity:10,availableCapacity:12,serviceLevelBufferPct:10});
assert.ok(Math.abs(capacity.requiredCapacity-11)<1e-9);
assert.equal(capacity.scaleAllowed,true);

const economics=calculateCustomerEconomics({acquisitionCost:100,grossMarginPerOrder:50,expectedOrders:4,retentionProbability:0.75});
assert.equal(economics.contributionLtv,150);
assert.equal(economics.ltvCac,1.5);
assert.equal(economics.paybackOrders,2);

assert.equal(validateProofOfWork({state:"EXECUTED",action:"deploy"}).claimAllowed,false);
assert.equal(validateProofOfWork({state:"VERIFIED",action:"deploy",evidenceId:"abc123",evidenceType:"COMMIT_SHA"}).verified,true);

const now=Date.parse("2026-08-28T00:00:00Z");
assert.equal(assessKnowledgeFreshness({source:"official",authority:"FIRST_PARTY",fetchedAt:"2026-08-27T23:00:00Z",freshnessSlaHours:2},now).fresh,true);
assert.equal(assessKnowledgeFreshness({source:"old",authority:"OTHER",fetchedAt:"2026-08-27T00:00:00Z",freshnessSlaHours:2},now).fresh,false);

assert.equal(assessCounterfactual({observed:120,baseline:100,baselineConfidence:0.5}).causalClaim,"INSUFFICIENT_FOR_CAUSALITY");
assert.equal(assessCounterfactual({observed:120,baseline:100,baselineConfidence:0.9}).causalClaim,"PLAUSIBLE_NOT_PROVEN");

console.log("PASS 12/12 VIVITO Operating System V3 capabilities");
console.log("PASS runtime detection and operating helper regressions");
