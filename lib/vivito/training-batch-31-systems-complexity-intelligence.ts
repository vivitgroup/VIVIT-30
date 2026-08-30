import { VIVITO_MARKETING_PARITY_CONTEXT } from "./training-batches-32-41-marketing-parity";
import { VIVITO_SUPER_OPERATOR_CONTEXT } from "./training-batches-42-47-super-operator";

export type SystemsComplexityModule={name:string;principle:string;checks:string[];outputs:string[]};
const M=(name:string,principle:string,checks:string[],outputs:string[]):SystemsComplexityModule=>({name,principle,checks,outputs});
export const VIVITO_SYSTEMS_COMPLEXITY_MODULES:SystemsComplexityModule[]=[
M("System Boundary","Define what is inside the system, what is outside, and which interfaces matter before diagnosing.",["What boundary makes this problem tractable without hiding a critical dependency?"],["system boundary"]),
M("Stock and Flow Thinking","Separate accumulated state from rates of change so symptoms are not confused with drivers.",["What is accumulating and what changes its level?"],["stock-flow map"]),
M("Reinforcing Feedback","Identify loops that amplify growth, decline, risk or behavior over time.",["What process makes more create even more?"],["reinforcing-loop map"]),
M("Balancing Feedback","Identify stabilizing loops, constraints and controls that push a system toward equilibrium.",["What pushes the system back when it moves too far?"],["balancing-loop map"]),
M("Delay Awareness","Account for time lags between action and observable outcome before declaring success or failure.",["How long should this intervention take to show signal?"],["delay map"]),
M("Nonlinearity","Expect thresholds, saturation and disproportionate responses rather than assuming linear cause and effect.",["Where can a small change create a large effect or no effect at all?"],["nonlinearity assessment"]),
M("Bottleneck Logic","The throughput of a system is constrained by its limiting step, not by average local performance.",["What single constraint currently limits end-to-end output?"],["constraint map"]),
M("Local vs Global Optimization","Reject improvements that make one team metric better while worsening enterprise outcome.",["Does this local win improve the whole system?"],["global-effect review"]),
M("Second-Order Effects","Evaluate what happens after the immediate effect, including behavioral and operational reactions.",["Then what happens because we did this?"],["second-order map"]),
M("Unintended Consequences","Search for incentives, workarounds, displacement and hidden costs created by interventions.",["How could this solution create a new problem?"],["unintended-consequence register"]),
M("Leverage Points","Prefer interventions that alter information, rules, incentives, structure or goals over brute-force effort when appropriate.",["Where can a small structural change create durable impact?"],["leverage-point recommendation"]),
M("Causal Loop Discipline","Build causal loops with explicit direction and polarity rather than storytelling after the fact.",["Does each link have a defensible causal direction?"],["causal-loop diagram"]),
M("Emergence","Recognize patterns that arise from many local interactions without a single central cause.",["Could this outcome emerge from interaction rather than one actor?"],["emergence hypothesis"]),
M("Path Dependence","Past choices can constrain current options; do not treat the present state as freely resettable.",["Which historical choices shape today's option set?"],["path-dependence note"]),
M("Lock-In and Switching Cost","Measure technological, behavioral, contractual and organizational friction before recommending migration.",["What makes the current state hard to leave?"],["switching-cost map"]),
M("Network Effects","Assess how participant value changes as adoption, connectivity or complementors change.",["Does each additional participant change value for others?"],["network-effect assessment"]),
M("Resilience vs Efficiency","Do not optimize slack, redundancy or inventory away when they protect critical continuity.",["What efficiency gain could reduce resilience?"],["resilience trade-off"]),
M("Fragility and Robustness","Identify variables where variance can cause nonlinear damage and design buffers accordingly.",["Where is the system most sensitive to shocks?"],["fragility map"]),
M("Scenario Stress Testing","Test plans under demand, cost, capacity, supplier, policy and execution shocks.",["Which scenario breaks the plan first?"],["stress-test matrix"]),
M("Adaptive Policy","When the environment changes, use trigger-based policies instead of one fixed forecast-dependent plan.",["What evidence should cause us to change course?"],["adaptive policy"]),
M("Incentive Architecture","Behavior follows incentives, constraints and information; inspect these before blaming individuals.",["What behavior is the system rewarding?"],["incentive map"]),
M("Coordination Cost","More actors and handoffs can increase delay and error even when each actor performs well.",["Where are handoffs creating friction?"],["coordination map"]),
M("Common-Cause Failure","Redundant components are not truly redundant if they depend on the same hidden dependency.",["What single dependency can break multiple safeguards?"],["common-cause risk"]),
M("Policy Resistance","Systems can counteract interventions through adaptation, displacement or compensating behavior.",["How might the system neutralize this intervention?"],["policy-resistance review"]),
M("Systems Synthesis","Combine loops, delays, constraints, incentives, uncertainty and second-order effects into one decision recommendation.",["What is the smallest defensible intervention that improves the whole system and how will we know?"],["systems recommendation"])
];
export const VIVITO_SYSTEMS_COMPLEXITY_INTELLIGENCE_DOCTRINE=`
Systems Thinking & Complex Adaptive Intelligence doctrine:
1. Define the system boundary, actors, interfaces, stocks, flows and objective before diagnosing.
2. Distinguish reinforcing feedback from balancing feedback and explicitly model delays.
3. Do not assume linearity; look for thresholds, saturation, compounding and nonlinear risk.
4. Optimize the end-to-end system, not isolated departmental metrics.
5. Find the binding constraint before adding effort elsewhere.
6. Evaluate second-order effects and unintended consequences before implementation.
7. Prefer structural leverage points when evidence supports them, but keep interventions reversible when uncertainty is high.
8. Treat incentives, rules, information and coordination structure as causal variables.
9. Preserve resilience where redundancy, slack or buffers protect critical outcomes.
10. Stress-test recommendations against plausible shocks and common-cause failures.
11. Use adaptive trigger-based policies when the environment is uncertain or path dependent.
12. Final recommendations must state system objective, constraint, key feedback loops, intervention, expected delay, guardrails, failure modes and evidence that would change the decision.
`;
const VIVITO_BATCH_31_BASE_CONTEXT=[VIVITO_SYSTEMS_COMPLEXITY_INTELLIGENCE_DOCTRINE,...VIVITO_SYSTEMS_COMPLEXITY_MODULES.map((m,i)=>`## SYSTEMS ${String(i+1).padStart(2,"0")} — ${m.name}\nPrinciple: ${m.principle}\nChecks:\n${m.checks.map(q=>`- ${q}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`)].join("\n\n");
export const VIVITO_TRAINING_BATCH_31_CONTEXT=[VIVITO_BATCH_31_BASE_CONTEXT,"# MARKETING PARITY INTELLIGENCE — BATCHES 32-41",VIVITO_MARKETING_PARITY_CONTEXT,"# SUPER OPERATOR INTELLIGENCE — BATCHES 42-47",VIVITO_SUPER_OPERATOR_CONTEXT].join("\n\n");