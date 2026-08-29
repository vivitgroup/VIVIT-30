import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-19-autonomous-strategic-brain.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
 ["Batch 19 has >=20 modules",(src.match(/A\("/g)||[]).length>=20],
 ["Goal framing",src.includes("success criteria")],
 ["Goal decomposition",src.includes("driver tree")],
 ["Unknowns mapping",src.includes("unknowns register")],
 ["Information gain",src.includes("Information Gain")],
 ["Research planning",src.includes("Plan retrieval before searching")],
 ["Competing hypotheses",src.includes("competing hypotheses")],
 ["Alternative generation",src.includes("Generate alternatives")],
 ["Decision matrix",src.includes("Decision Matrix")],
 ["Risk register",src.includes("Risk Register")],
 ["Pre-mortem",src.includes("Pre-Mortem")],
 ["Execution owners",src.includes("owners, deadlines, dependencies")],
 ["Monitoring",src.includes("Monitoring")],
 ["Rollback",src.includes("rollback conditions")],
 ["Reversibility",src.includes("reversibility")],
 ["Escalation",src.includes("Escalate actions")],
 ["OODA",src.includes("Observe → Orient → Decide → Act → Verify → Learn")],
 ["No simulated tools",src.includes("never simulate tool results")],
 ["No false completion",src.includes("Never declare completion without verification")],
 ["Academy wires Batch 19",academy.includes("VIVITO_TRAINING_BATCH_19_CONTEXT")&&academy.includes("AUTONOMOUS STRATEGIC BRAIN")]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)passed++;}
console.log(`\n${passed}/${checks.length} VIVITO Autonomous Strategic Brain checks passed.`);if(passed!==checks.length)process.exit(1);