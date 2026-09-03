import fs from "node:fs";

const src = fs.readFileSync("lib/vivito/autonomous-operating-intelligence-v4.ts", "utf8");
const checks = [
  ["goal decomposition", /decomposeGoal|Goal decomposition/i],
  ["constraint-aware planning", /constraints|Constraint-aware planning/i],
  ["KPI control tower", /KPI control tower/i],
  ["decision confidence", /confidenceScore|Decision confidence/i],
  ["opportunity cost", /opportunityCost|Opportunity cost/i],
  ["budget reallocation", /marginalBudgetAllocation|Budget reallocation/i],
  ["unit economics", /unitEconomics|Unit economics diagnostics/i],
  ["business anomaly", /detectBusinessAnomaly|Business anomaly detective/i],
  ["strategic calendar", /buildStrategicCalendar|Strategic calendar intelligence/i],
  ["post-mortem", /buildPostMortem|Automated post-mortems/i],
  ["internal benchmarking", /safePeerBenchmark|Internal benchmarking/i],
  ["trust layer", /EvidenceLedgerEntry|ExecutionProof|Trust layer/i],
  ["proof-of-work", /Never say an action was executed without evidence/i],
  ["marginal return discipline", /marginal return/i],
  ["client privacy", /without leaking client data/i],
];

const failed = checks.filter(([, rx]) => !rx.test(src)).map(([name]) => name);
if (failed.length) {
  console.error(`VIVITO AOI V4 regression failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`VIVITO AOI V4 regression: ${checks.length}/${checks.length} passed`);
