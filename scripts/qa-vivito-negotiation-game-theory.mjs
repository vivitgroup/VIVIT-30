import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-25-negotiation-game-theory.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
 ["Batch 25 has >=30 modules",(src.match(/N\("/g)||[]).length>=30],
 ["BATNA",src.includes("BATNA")],
 ["Reservation value",src.includes("Reservation Value")],
 ["ZOPA",src.includes("ZOPA")],
 ["Interests vs positions",src.includes("Interests vs Positions")],
 ["Anchoring",src.includes("Anchoring")],
 ["Conditional concessions",src.includes("Concession Strategy")&&src.includes("conditional")],
 ["Issue trading",src.includes("Issue Trading")],
 ["Information asymmetry",src.includes("Information Asymmetry")],
 ["Credible commitment",src.includes("Credible Commitment")],
 ["Repeated games",src.includes("Repeated Games")],
 ["Principal-agent",src.includes("Principal-Agent")],
 ["Moral hazard",src.includes("Moral Hazard")],
 ["Adverse selection",src.includes("Adverse Selection")],
 ["Mechanism design",src.includes("Mechanism Design")],
 ["Winner's curse",src.includes("Winner’s Curse")||src.includes("Winner's Curse")],
 ["Coalitions",src.includes("Coalitions")],
 ["De-escalation",src.includes("de-escalation")],
 ["Negotiation ethics",src.includes("Never fabricate alternatives")],
 ["Academy wires Batch 25",academy.includes("VIVITO_TRAINING_BATCH_25_CONTEXT")&&academy.includes("NEGOTIATION & GAME THEORY")]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)passed++;}console.log(`\n${passed}/${checks.length} VIVITO Negotiation & Game Theory checks passed.`);if(passed!==checks.length)process.exit(1);
