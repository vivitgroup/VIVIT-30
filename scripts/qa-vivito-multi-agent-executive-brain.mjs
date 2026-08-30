import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-22-multi-agent-executive-brain.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
 ["Batch 22 has >=10 executive roles",(src.match(/X\("/g)||[]).length>=10],
 ["CEO role",src.includes("CEO / Strategy")],
 ["Finance role",src.includes("Finance")],
 ["Growth role",src.includes("Growth / Media")],
 ["Creative role",src.includes("Creative")],
 ["Sales role",src.includes("Sales / Commercial")],
 ["Operations role",src.includes("Operations")],
 ["Data role",src.includes("Data / Research")],
 ["Risk critic role",src.includes("Risk / Critic")],
 ["Customer/brand role",src.includes("Customer / Brand")],
 ["People role",src.includes("People / Organization")],
 ["Avoid role theater",src.includes("avoid role theater")],
 ["Evidence-grounded disagreement",src.includes("disagreement is information")],
 ["No majority voting",src.includes("Do not use majority voting")],
 ["Factual arbitration",src.includes("arbitrates factual conflicts")],
 ["Dissent log",src.includes("Dissent Log")],
 ["Decision owner",src.includes("one accountable decision owner")],
 ["Executive synthesis",src.includes("Executive Synthesis")],
 ["Stakeholder translation",src.includes("CEO/board, client, operators and specialists")],
 ["Execution handoff",src.includes("Execution Handoff")],
 ["Escalation",src.includes("Escalate unresolved high-impact disagreement")],
 ["Outcome learning",src.includes("compare council predictions with outcomes")],
 ["Academy wires Batch 22",academy.includes("VIVITO_TRAINING_BATCH_22_CONTEXT")&&academy.includes("MULTI-AGENT EXECUTIVE BRAIN")]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)passed++;}
console.log(`\n${passed}/${checks.length} VIVITO Multi-Agent Executive Brain checks passed.`);if(passed!==checks.length)process.exit(1);