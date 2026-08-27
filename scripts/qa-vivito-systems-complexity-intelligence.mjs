import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-31-systems-complexity-intelligence.ts","utf8");
const parity=fs.readFileSync("lib/vivito/training-batches-32-41-marketing-parity.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const batchMarkers=Array.from({length:10},(_,i)=>`BATCH ${i+32}`);
const checks=[
["25 systems complexity modules",(src.match(/M\("/g)||[]).length>=25],
["system boundary",src.includes("System Boundary")],
["reinforcing feedback",src.includes("Reinforcing Feedback")],
["balancing feedback",src.includes("Balancing Feedback")],
["delay awareness",src.includes("Delay Awareness")],
["bottleneck logic",src.includes("Bottleneck Logic")],
["second-order effects",src.includes("Second-Order Effects")],
["unintended consequences",src.includes("Unintended Consequences")],
["resilience trade-off",src.includes("Resilience vs Efficiency")],
["adaptive policy",src.includes("Adaptive Policy")],
["systems synthesis",src.includes("Systems Synthesis")],
["Academy wires Batch 31",academy.includes("VIVITO_TRAINING_BATCH_31_CONTEXT")&&academy.includes("SYSTEMS THINKING & COMPLEX ADAPTIVE INTELLIGENCE")],
["Batch 31 imports marketing parity context",src.includes("VIVITO_MARKETING_PARITY_CONTEXT")&&src.includes("MARKETING PARITY INTELLIGENCE")],
["Marketing parity has at least 120 modules",(parity.match(/M\(/g)||[]).length>=120],
["All Batches 32-41 are declared",batchMarkers.every(x=>parity.includes(x))],
["Batch 32 causal intelligence",parity.includes("Marketing Causal Intelligence")&&parity.includes("Incrementality Discipline")&&parity.includes("Counterfactual Reasoning")],
["Batch 33 psychology and JTBD",parity.includes("Consumer Psychology & JTBD")&&parity.includes("Jobs-to-be-Done")&&parity.includes("Ethical Persuasion Guardrail")],
["Batch 34 positioning offer messaging",parity.includes("Positioning Offer Messaging")&&parity.includes("Value Proposition")&&parity.includes("Offer Architecture")],
["Batch 35 advanced media buying",parity.includes("Advanced Media Buying")&&parity.includes("Marginal Efficiency")&&parity.includes("Scale Hold Cut Test")],
["Batch 36 experimentation",parity.includes("Marketing Experimentation")&&parity.includes("Holdout Design")&&parity.includes("Incrementality Ladder")],
["Batch 37 creative director",parity.includes("Creative Director Intelligence")&&parity.includes("Message-Market Fit")&&parity.includes("Art Direction Brief")],
["Batch 38 market research agent",parity.includes("Market Research Agent")&&parity.includes("Research Citation Ledger")&&parity.includes("Research Freshness")],
["Batch 39 CRM lifecycle retention",parity.includes("CRM Lifecycle Retention")&&parity.includes("Lead Quality")&&parity.includes("Closed-Loop Learning")],
["Batch 40 marketing world model",parity.includes("Marketing World Model")&&parity.includes("Scenario Forecast")&&parity.includes("Forecast Calibration")],
["Batch 41 autonomous CMO",parity.includes("Autonomous CMO Agency Brain")&&parity.includes("Agency Diagnostic Sweep")&&parity.includes("Learning Loop")],
["No fake-data doctrine",parity.includes("never invents live data")],
["High-risk actions stay approval gated",parity.includes("approval-gated")]
];
let p=0;for(const [n,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${n}`);if(ok)p++;}
console.log(`\n${p}/${checks.length} Batch 31 + Marketing Parity 32-41 checks passed.`);if(p!==checks.length)process.exit(1);