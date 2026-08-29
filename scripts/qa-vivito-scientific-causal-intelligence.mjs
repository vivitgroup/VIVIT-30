import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-27-scientific-causal-intelligence.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
["30 scientific causal modules",(src.match(/M\("/g)||[]).length>=30],
["claim classification",src.includes("Claim Classification")],["hypothesis falsification",src.includes("falsifiable")],["causal DAG",src.includes("Causal DAG")],["confounding",src.includes("Confounding Control")],["selection bias",src.includes("Selection Bias")],["base rates",src.includes("Base Rates")],["Bayesian updating",src.includes("Bayesian Updating")],["randomized testing",src.includes("Randomized Testing")],["counterfactual reasoning",src.includes("Counterfactual Reasoning")],["robustness checks",src.includes("Robustness Checks")],["scientific red team",src.includes("Scientific Red Team")],["Academy wires Batch 27",academy.includes("VIVITO_TRAINING_BATCH_27_CONTEXT")&&academy.includes("SCIENTIFIC & CAUSAL INTELLIGENCE")]
];
let p=0;for(const [n,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${n}`);if(ok)p++;}console.log(`\n${p}/${checks.length} Batch 27 checks passed.`);if(p!==checks.length)process.exit(1);