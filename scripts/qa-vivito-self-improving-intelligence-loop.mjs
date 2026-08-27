import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-26-self-improving-intelligence-loop.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
 ["Batch 26 has >=30 modules",(src.match(/L\("/g)||[]).length>=30],
 ["Closed loop",src.includes("observe -> predict -> act -> measure -> reflect -> update")||src.includes("Observe -> predict -> act -> measure -> reflect -> update")],
 ["Error taxonomy",src.includes("Error Taxonomy")],
 ["Prediction ledger",src.includes("Prediction Ledger")],
 ["Calibration",src.includes("Calibration")],
 ["Lesson provenance",src.includes("Lesson Provenance")],
 ["Counterexamples",src.includes("Counterexample Search")],
 ["Regression protection",src.includes("Regression Protection")],
 ["Benchmark isolation",src.includes("Benchmark Isolation")&&src.includes("Improve capability, not the score illusion")],
 ["Reward hacking defense",src.includes("Reward Hacking Defense")],
 ["Offline evaluation",src.includes("Offline Evaluation")],
 ["Shadow evaluation",src.includes("Shadow Evaluation")],
 ["Canary rollout",src.includes("Canary Rollout")],
 ["Versioned doctrine",src.includes("Versioned Doctrine")],
 ["Rollback",src.includes("prior-good version")],
 ["Human approval boundary",src.includes("Human Approval Boundary")&&src.includes("require accountable human approval")],
 ["Distribution shift",src.includes("Distribution Shift")],
 ["Promotion gate",src.includes("Promotion Gate")],
 ["No autonomous authority from learning",src.includes("learning does not grant authority")],
 ["Academy wires Batch 26",academy.includes("VIVITO_TRAINING_BATCH_26_CONTEXT")&&academy.includes("SELF-IMPROVING INTELLIGENCE LOOP")]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)passed++;}console.log(`\n${passed}/${checks.length} VIVITO Self-Improving Intelligence Loop checks passed.`);if(passed!==checks.length)process.exit(1);
