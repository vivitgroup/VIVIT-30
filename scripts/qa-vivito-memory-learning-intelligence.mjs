import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-20-memory-learning-intelligence.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
 ["Batch 20 has >=20 modules",(src.match(/M\("/g)||[]).length>=20],
 ["Memory taxonomy",src.includes("fact, preference, decision, hypothesis")],
 ["Provenance",src.includes("source, timestamp, owner and confidence")],
 ["Freshness",src.includes("volatile facts expire")],
 ["Contradictions",src.includes("Resolve contradictions explicitly")],
 ["Scope isolation",src.includes("user/client/project memory boundaries")],
 ["Episodic memory",src.includes("Episodic Memory")],
 ["Semantic memory",src.includes("Semantic Memory")],
 ["Procedural memory",src.includes("Procedural Memory")],
 ["Decision journal",src.includes("Decision Journal")],
 ["Prediction ledger",src.includes("Prediction Ledger")],
 ["Outcome learning",src.includes("Compare expected and actual results")],
 ["Post-mortem",src.includes("hindsight bias")],
 ["Anti-overfitting",src.includes("single-case overfitting")],
 ["Decay",src.includes("Apply decay")],
 ["Invalidation",src.includes("Invalidate stale rules")],
 ["Relevant retrieval",src.includes("relevant memories, not merely recent memories")],
 ["Calibration",src.includes("measure calibration")],
 ["Closed learning loop",src.includes("decision → prediction → action → outcome → lesson → updated rule")],
 ["Academy wires Batch 20",academy.includes("VIVITO_TRAINING_BATCH_20_CONTEXT")&&academy.includes("MEMORY & LEARNING INTELLIGENCE")]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)passed++;}
console.log(`\n${passed}/${checks.length} VIVITO Memory & Learning Intelligence checks passed.`);if(passed!==checks.length)process.exit(1);