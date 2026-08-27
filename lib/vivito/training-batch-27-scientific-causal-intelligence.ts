export type ScientificCausalModule={name:string;principle:string;checks:string[];outputs:string[]};
const M=(name:string,principle:string,checks:string[],outputs:string[]):ScientificCausalModule=>({name,principle,checks,outputs});
export const VIVITO_SCIENTIFIC_CAUSAL_MODULES:ScientificCausalModule[]=[
M("Claim Classification","Separate observation, correlation, causal claim, mechanism, prediction and value judgment.",["What type of claim is this?","What evidence standard applies?"],["claim type","evidence standard"]),
M("Hypothesis Framing","State falsifiable hypotheses before looking for confirming evidence.",["What would disconfirm this?"],["hypothesis","falsifier"]),
M("Causal DAG Thinking","Map treatment, outcome, mediators, confounders and colliders before inference.",["What opens or blocks a backdoor path?"],["causal graph"]),
M("Confounding Control","Do not infer causality from association when common causes are plausible.",["Which variables affect both exposure and outcome?"],["confounder list"]),
M("Selection Bias","Check whether observed data are conditioned on who entered the sample.",["Who is missing and why?"],["selection-risk note"]),
M("Survivorship Bias","Do not learn only from visible winners.",["Which failures disappeared from view?"],["survivor correction"]),
M("Base Rates","Use prior prevalence before overweighting vivid cases.",["What is the relevant base rate?"],["prior"]),
M("Bayesian Updating","Update beliefs proportional to evidence strength, not emotionally.",["How diagnostic is this evidence?"],["posterior belief"]),
M("Natural Experiments","Look for exogenous variation when randomized tests are unavailable.",["What changed independently of the outcome?"],["quasi-experimental design"]),
M("Randomized Testing","Use random assignment when feasible and ethical to estimate causal effect.",["What is randomized?","Is interference controlled?"],["experiment plan"]),
M("Power & Sample Size","Avoid declaring no effect from underpowered tests.",["What effect size is detectable?"],["power note"]),
M("Multiple Testing","Control false discoveries when many hypotheses are tested.",["How many comparisons were run?"],["multiplicity correction"]),
M("Regression to Mean","Expect extreme values to partially normalize without intervention.",["Was action triggered by an extreme observation?"],["RTM warning"]),
M("Seasonality","Separate calendar/market cycles from intervention effects.",["What seasonal baseline applies?"],["seasonal adjustment"]),
M("Lag Structure","Allow causal effects to appear with realistic delays.",["When should the effect emerge?"],["lag model"]),
M("Mediation","Distinguish total effect from pathways through mediators.",["Through what mechanism does effect travel?"],["mediation map"]),
M("Heterogeneous Effects","Average effects may hide segment differences.",["Who benefits or is harmed?"],["segment effects"]),
M("External Validity","Do not generalize beyond population, market, channel or time without support.",["Where does this evidence transport?"],["validity boundary"]),
M("Measurement Validity","Verify that the metric measures the construct intended.",["Is the proxy valid?"],["measurement audit"]),
M("Construct Drift","Definitions and tracking can change over time.",["Did the metric definition change?"],["drift note"]),
M("Counterfactual Reasoning","Ask what would likely have happened without the intervention.",["What is the best counterfactual?"],["counterfactual estimate"]),
M("Mechanism Tests","Strong causal stories require plausible mechanism evidence, not narrative only.",["Which intermediate evidence should move?"],["mechanism evidence"]),
M("Triangulation","Prefer conclusions supported by different methods with different biases.",["Do independent methods agree?"],["triangulation summary"]),
M("Null Interpretation","A null result can mean no effect, low power, bad measurement or wrong timing.",["Which explanation fits?"],["null diagnosis"]),
M("Robustness Checks","Vary specifications, samples and assumptions to see if conclusions survive.",["What reasonable alternative changes the answer?"],["robustness report"]),
M("Sensitivity Analysis","Quantify how strong an unobserved confounder must be to overturn the result.",["How fragile is inference?"],["sensitivity result"]),
M("Replication","Treat one study or one campaign as provisional until repeated when stakes justify it.",["Has the result repeated?"],["replication status"]),
M("Evidence Hierarchy","Weight evidence by design quality, directness, freshness and relevance.",["Which source is strongest for this claim?"],["evidence ranking"]),
M("Scientific Red Team","Actively construct the strongest alternative explanation.",["What rival model explains the same facts?"],["rival hypothesis"]),
M("Causal Decision Rule","Use causal estimates only when assumptions are explicit enough for the decision stakes.",["What assumption would reverse the action?"],["decision + assumption ledger"])
];
export const VIVITO_SCIENTIFIC_CAUSAL_INTELLIGENCE_DOCTRINE=`
Scientific & Causal Intelligence doctrine:
1. Correlation is not causation; classify the claim before evaluating it.
2. State falsifiable hypotheses and disconfirming evidence in advance.
3. Build a causal model with confounders, mediators and selection mechanisms before estimating effect.
4. Prefer randomized or credible quasi-experimental evidence for causal claims; otherwise label inference uncertainty.
5. Use base rates and Bayesian updating; vivid anecdotes never outrank stronger aggregate evidence.
6. Audit measurement validity, construct drift, seasonality, lags and regression to the mean.
7. Distinguish average effects from heterogeneous segment effects and respect external-validity boundaries.
8. Run robustness, sensitivity, counterfactual and rival-hypothesis checks for material decisions.
9. Triangulate across independent methods and sources where practical.
10. A null result is ambiguous until power, measurement and timing are checked.
11. Strong narratives do not substitute for mechanism evidence.
12. The final recommendation must name key assumptions, confidence and what evidence would reverse it.
`;
export const VIVITO_TRAINING_BATCH_27_CONTEXT=[VIVITO_SCIENTIFIC_CAUSAL_INTELLIGENCE_DOCTRINE,...VIVITO_SCIENTIFIC_CAUSAL_MODULES.map((m,i)=>`## SCI-CAUSAL ${String(i+1).padStart(2,"0")} — ${m.name}\nPrinciple: ${m.principle}\nChecks:\n${m.checks.map(q=>`- ${q}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`)].join("\n\n");