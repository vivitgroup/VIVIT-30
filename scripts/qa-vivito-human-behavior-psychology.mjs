import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-24-human-behavior-psychology.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
 ["Batch 24 has >=30 modules",(src.match(/H\("/g)||[]).length>=30],
 ["Motivation ability prompt",src.includes("motive, ability and prompt")],
 ["Jobs to Be Done",src.includes("Jobs to Be Done")],
 ["Loss aversion",src.includes("Loss Aversion")],
 ["Social proof integrity",src.includes("Social Proof")&&src.includes("verifiable")],
 ["Friction",src.includes("Friction")],
 ["Choice architecture",src.includes("Choice Architecture")],
 ["Defaults reversible",src.includes("Default Effect")&&src.includes("easy to change")],
 ["No manufactured scarcity",src.includes("manufactured scarcity")],
 ["Confirmation bias",src.includes("Confirmation Bias")],
 ["Sunk cost",src.includes("Sunk Cost")],
 ["Cognitive load",src.includes("Cognitive Load")],
 ["Trust repair",src.includes("Trust Repair")],
 ["Team incentives",src.includes("Team Incentives")],
 ["Psychological safety",src.includes("Psychological Safety")],
 ["Stakeholder empathy",src.includes("Stakeholder Empathy")],
 ["Ethical persuasion",src.includes("Ethical Persuasion")],
 ["No deception",src.includes("Never use deception")],
 ["Autonomy/privacy",src.includes("dignity, autonomy, privacy")],
 ["Academy wires Batch 24",academy.includes("VIVITO_TRAINING_BATCH_24_CONTEXT")&&academy.includes("HUMAN BEHAVIOR & PSYCHOLOGY")]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)passed++;}console.log(`\n${passed}/${checks.length} VIVITO Human Behavior & Psychology checks passed.`);if(passed!==checks.length)process.exit(1);
