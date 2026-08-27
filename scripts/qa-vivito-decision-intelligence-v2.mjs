import fs from "node:fs";
const src=fs.readFileSync("lib/vivito/training-batch-17-decision-intelligence-v2.ts","utf8");
const academy=fs.readFileSync("lib/vivito/academy.ts","utf8");
const checks=[
  ["Batch 17 has at least 30 decision modules",(src.match(/M\("/g)||[]).length>=30],
  ["Teaches objective before tactic",src.includes("Objective before tactic")],
  ["Teaches evidence before certainty",src.includes("Evidence before certainty")],
  ["Teaches funnel before isolated metric",src.includes("Funnel before isolated metric")],
  ["Teaches economics before scale",src.includes("Economics before scale")],
  ["Teaches constraints before promises",src.includes("Constraints before promises")],
  ["Teaches hypothesis-driven testing",src.includes("Hypotheses before random changes")],
  ["Teaches business outcomes over vanity metrics",src.includes("Business outcomes before vanity metrics")],
  ["Teaches actionable owner timing guardrails",src.includes("Owner, timing and guardrails")],
  ["Teaches self-correction from new evidence",src.includes("New evidence must be allowed to change the answer")],
  ["Protects truth and evaluation standards",src.includes("Never improve a score by weakening truth")],
  ["Covers incomplete briefs",src.includes("Incomplete marketing brief")],
  ["Covers offer architecture",src.includes("Offer architecture")],
  ["Covers funnel diagnosis",src.includes("Unknown funnel leak")],
  ["Covers commercial economics",src.includes("Revenue growth with weak economics")],
  ["Covers budget allocation",src.includes("Budget allocation")],
  ["Covers scale decisions",src.includes("Scale decision")],
  ["Covers creative learning",src.includes("Winner fatigue")],
  ["Covers competitor transferability",src.includes("transferability")],
  ["Covers conflicting measurement",src.includes("Conflicting data sources")],
  ["Covers missing tracking",src.includes("Missing tracking")],
  ["Covers competing hypotheses",src.includes("Competing hypotheses")],
  ["Covers executive prioritization",src.includes("Many problems at once")],
  ["Covers cross-functional diagnosis",src.includes("Media blames sales")],
  ["Covers execution discipline",src.includes("Recommendation to execution")],
  ["Covers explicit self-correction",src.includes("New evidence contradicts first answer")],
  ["Covers critic pass",src.includes("final critic pass")],
  ["Covers Arabic-English business language",src.includes("Egyptian Arabic")],
  ["Covers integrated end-to-end decision system",src.includes("End-to-end agency decision")],
  ["Academy wires Batch 17 into runtime",academy.includes("VIVITO_TRAINING_BATCH_17_CONTEXT") && academy.includes("DECISION INTELLIGENCE V2")]
];
let passed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(ok)passed++;}
console.log(`\n${passed}/${checks.length} VIVITO Decision Intelligence V2 checks passed.`);
if(passed!==checks.length)process.exit(1);