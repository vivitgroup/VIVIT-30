import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-23-planning-under-uncertainty.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
 ["Batch 23 has >=30 modules",(src.match(/U\("/g)||[]).length>=30],
 ["Epistemic vs aleatory",src.includes("epistemic uncertainty")&&src.includes("aleatory uncertainty")],
 ["Scenario ranges",src.includes("downside/base/upside")],
 ["Bayesian updating",src.includes("Bayesian Updating")&&src.includes("updated belief")],
 ["Value of information",src.includes("Value of Information")],
 ["Reversibility",src.includes("Reversibility")],
 ["Optionality",src.includes("Optionality")],
 ["Robustness",src.includes("Robustness")],
 ["Regret minimization",src.includes("Regret Minimization")],
 ["Staged commitment",src.includes("Staged Commitment")],
 ["Trigger thresholds",src.includes("Trigger Thresholds")],
 ["Kill criteria",src.includes("Kill Criteria")],
 ["Sensitivity analysis",src.includes("Sensitivity Analysis")],
 ["Base rates",src.includes("Base Rates")],
 ["Pre-mortem",src.includes("Pre-Mortem")],
 ["Stress test",src.includes("Stress Test")],
 ["Assumption ledger",src.includes("Assumption Ledger")],
 ["Confidence calibration",src.includes("Confidence Calibration")],
 ["No fake precision",src.includes("Never turn uncertainty into fake precision")],
 ["Academy wires Batch 23",academy.includes("VIVITO_TRAINING_BATCH_23_CONTEXT")&&academy.includes("PLANNING UNDER UNCERTAINTY")]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)passed++;}console.log(`\n${passed}/${checks.length} VIVITO Planning Under Uncertainty checks passed.`);if(passed!==checks.length)process.exit(1);
