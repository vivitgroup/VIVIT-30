import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-31-systems-complexity-intelligence.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
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
["Academy wires Batch 31",academy.includes("VIVITO_TRAINING_BATCH_31_CONTEXT")&&academy.includes("SYSTEMS THINKING & COMPLEX ADAPTIVE INTELLIGENCE")]
];let p=0;for(const [n,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${n}`);if(ok)p++;}console.log(`\n${p}/${checks.length} Batch 31 checks passed.`);if(p!==checks.length)process.exit(1);