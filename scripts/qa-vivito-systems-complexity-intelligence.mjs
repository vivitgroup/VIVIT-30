import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-31-systems-complexity-intelligence.ts","utf8");
const parity=fs.readFileSync("lib/vivito/training-batches-32-41-marketing-parity.ts","utf8");
const superOps=fs.readFileSync("lib/vivito/training-batches-42-47-super-operator.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const parityMarkers=Array.from({length:10},(_,i)=>`BATCH ${i+32}`);
const superMarkers=Array.from({length:6},(_,i)=>`BATCH ${i+42}`);
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
["All Batches 32-41 are declared",parityMarkers.every(x=>parity.includes(x))],
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
["High-risk actions stay approval gated",parity.includes("approval-gated")],
["Batch 31 imports super operator context",src.includes("VIVITO_SUPER_OPERATOR_CONTEXT")&&src.includes("SUPER OPERATOR INTELLIGENCE")],
["All Batches 42-47 are declared",superMarkers.every(x=>superOps.includes(x))],
["Batch 42 sales director",superOps.includes("Sales Director Intelligence V2")&&superOps.includes("Pipeline Diagnosis")&&superOps.includes("Marketing Sales Closed Loop")],
["Batch 43 CEO CFO",superOps.includes("Business CEO CFO Intelligence")&&superOps.includes("P&L Reasoning")&&superOps.includes("Capital Allocation")&&superOps.includes("CEO Synthesis")],
["Batch 44 artifact engine",superOps.includes("Consulting Artifact Engine V3")&&superOps.includes("Executive Storyline")&&superOps.includes("Excel Model Architecture")&&superOps.includes("Board Ready PDF")],
["Batch 45 deep research",superOps.includes("Deep Research Competitive Intelligence V2")&&superOps.includes("Claim Ledger")&&superOps.includes("No Fabrication")],
["Batch 46 integrated marketing",superOps.includes("Integrated Marketing Growth Brain V3")&&superOps.includes("Marketing Economics")&&superOps.includes("CMO Synthesis")],
["Batch 47 super benchmark",superOps.includes("Super Benchmark V2")&&superOps.includes("Blind Pairwise Evaluation")&&superOps.includes("No Benchmark Leakage")&&superOps.includes("Promotion Gate")],
["Artifact truthfulness enforced",superOps.includes("Never claim a PPTX/PDF/XLSX was generated")||superOps.includes("Never claim an artifact is generated")],
["Head-to-head superiority requires evidence",superOps.includes("frozen, blind, reproducible head-to-head evidence")],
["No benchmark-answer leakage doctrine",superOps.includes("Training never contains benchmark-specific answers")]
];
let p=0;for(const [n,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${n}`);if(ok)p++;}
console.log(`\n${p}/${checks.length} Batch 31 + Marketing Parity 32-41 + Super Operator 42-47 checks passed.`);if(p!==checks.length)process.exit(1);