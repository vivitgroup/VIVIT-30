import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-21-business-economics-capital-allocation.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
 ["Batch 21 has >=24 modules",(src.match(/E\("/g)||[]).length>=24],
 ["Gross margin",src.includes("gross margin")],
 ["Contribution margin",src.includes("contribution margin")],
 ["CAC",src.includes("CAC")],
 ["Margin-based LTV",src.includes("margin-based LTV")],
 ["Payback",src.includes("payback")],
 ["Breakeven ROAS",src.includes("Breakeven ROAS")],
 ["Marginal returns",src.includes("marginal, not average, returns")],
 ["Diminishing returns",src.includes("diminishing returns")],
 ["Incrementality",src.includes("incrementality")],
 ["Cohort economics",src.includes("Cohort Economics")],
 ["Retention economics",src.includes("Retention Economics")],
 ["Working capital",src.includes("working capital")],
 ["Cash constraints",src.includes("Cash Constraints")],
 ["Expected value",src.includes("Expected Value")],
 ["Opportunity cost",src.includes("opportunity cost")],
 ["Hurdle rate",src.includes("hurdle rate")],
 ["Portfolio allocation",src.includes("Portfolio Allocation")],
 ["Concentration risk",src.includes("concentration")],
 ["Stop-loss",src.includes("stop-loss")],
 ["Scale conditions",src.includes("Scale Conditions")],
 ["Scenario economics",src.includes("Scenario Economics")],
 ["Capital allocation council",src.includes("Capital Allocation Council")],
 ["Academy wires Batch 21",academy.includes("VIVITO_TRAINING_BATCH_21_CONTEXT")&&academy.includes("BUSINESS ECONOMICS & CAPITAL ALLOCATION")]
];
let passed=0;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)passed++;}
console.log(`\n${passed}/${checks.length} VIVITO Business Economics & Capital Allocation checks passed.`);if(passed!==checks.length)process.exit(1);