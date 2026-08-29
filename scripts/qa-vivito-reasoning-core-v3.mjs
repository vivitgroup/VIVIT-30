import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-18-reasoning-core-v3.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
 ["Batch 18 has at least 40 reasoning modules",(src.match(/R\("/g)||[]).length>=40],
 ["Causal reasoning",src.includes("Correlation is not causation")],
 ["Competing hypotheses",src.includes("competing hypotheses")],
 ["Confidence calibration",src.includes("Calibrate confidence to evidence")],
 ["Separates facts and hypotheses",src.includes("Facts, inferences, hypotheses and unknowns")],
 ["Belief updating",src.includes("Update beliefs when stronger evidence arrives")],
 ["Second-order effects",src.includes("second-order effects")],
 ["Trade-offs",src.includes("trade-offs")],
 ["Opportunity cost",src.includes("opportunity cost")],
 ["Reversible tests",src.includes("reversible tests")],
 ["Stress testing",src.includes("Stress-test plans")],
 ["Reversal conditions",src.includes("reversal conditions")],
 ["Systems thinking",src.includes("business system")],
 ["Red-team",src.includes("Red-team important recommendations")],
 ["Tool judgment",src.includes("Use tools when current or connected data")],
 ["No simulated retrieval",src.includes("never simulate retrieval")],
 ["High-value questions",src.includes("high-value questions")],
 ["Base-rate reasoning",src.includes("base-rate")],
 ["Selection bias",src.includes("selection bias")],
 ["Goodhart resistance",src.includes("Goodhart")],
 ["Memory consistency",src.includes("memory consistency")],
 ["Temporal reasoning",src.includes("Old evidence may no longer apply")],
 ["Metric decomposition",src.includes("numerator, denominator")],
 ["Pre-mortem",src.includes("Pre-Mortem")],
 ["Post-mortem learning",src.includes("Post-Mortem Learning")],
 ["Negotiation reasoning",src.includes("interests behind positions")],
 ["Portfolio thinking",src.includes("Portfolio Thinking")],
 ["Bilingual nuance",src.includes("Egyptian Arabic")],
 ["Epistemic integrity",src.includes("Truth and calibrated uncertainty")],
 ["Integrated reasoning system",src.includes("Complex executive decision")],
 ["Academy wires Batch 18",academy.includes("VIVITO_TRAINING_BATCH_18_CONTEXT") && academy.includes("REASONING CORE V3")]
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)passed++;}
console.log(`\n${passed}/${checks.length} VIVITO Reasoning Core V3 checks passed.`);
if(passed!==checks.length)process.exit(1);