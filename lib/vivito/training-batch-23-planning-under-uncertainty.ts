export type VivitoUncertaintyModule={name:string;principle:string;questions:string[];output:string[]};
const U=(name:string,principle:string,questions:string[],output:string[]):VivitoUncertaintyModule=>({name,principle,questions,output});

export const VIVITO_PLANNING_UNDER_UNCERTAINTY_MODULES:VivitoUncertaintyModule[]=[
U("Uncertainty Type","Separate epistemic uncertainty (missing knowledge) from aleatory uncertainty (inherent variability).",["What can be learned?","What will remain variable even with more data?"],["uncertainty map","learning plan"]),
U("Scenario Range","Use ranges and scenarios instead of false-point precision.",["What are plausible downside/base/upside outcomes?","Which assumptions drive the spread?"],["scenario table","assumption drivers"]),
U("Bayesian Updating","Change confidence when new evidence arrives rather than defending the first view.",["What was the prior?","How diagnostic is the new evidence?","What is the updated belief?"],["prior","evidence weight","posterior confidence"]),
U("Value of Information","Buy information only when it can change a meaningful decision.",["What decision could change?","What is the cost of learning?","What is the expected value of reducing uncertainty?"],["information-value decision"]),
U("Reversibility","Move faster on reversible choices and raise evidence thresholds for irreversible ones.",["Can we undo this?","What is the cost/time of reversal?"],["decision class","evidence threshold"]),
U("Optionality","Preserve valuable future choices when uncertainty is high.",["Which option keeps more paths open?","What commitment unnecessarily closes alternatives?"],["optionality map"]),
U("Robustness","Prefer plans that survive several plausible worlds over plans optimal in one fragile forecast.",["Which option performs acceptably across scenarios?","Where does each option break?"],["robustness comparison"]),
U("Regret Minimization","Consider future regret, especially under asymmetric downside.",["Which mistake is more costly: acting or waiting?","What is maximum plausible regret?"],["regret matrix"]),
U("Staged Commitment","Convert big bets into evidence-gated stages.",["What is the smallest useful commitment?","What evidence unlocks the next stage?"],["stage plan","gate criteria"]),
U("Trigger Thresholds","Pre-commit to observable triggers for scaling, pausing, reversing or escalating.",["What metric changes the action?","At what threshold and over what window?"],["trigger table"]),
U("Kill Criteria","Define failure before launch to avoid escalation of commitment.",["What result proves the thesis is not working?","How long are we willing to wait?"],["kill criteria"]),
U("Contingency Tree","Plan responses to major branches before pressure arrives.",["If demand is lower/higher than expected, then what?","If a dependency fails, what is the fallback?"],["contingency tree"]),
U("Sensitivity Analysis","Find assumptions that matter most to the outcome.",["Which variable moves the result most?","What change flips the decision?"],["sensitivity ranking"]),
U("Base Rates","Anchor unusual stories to relevant historical frequencies before relying on narrative.",["What usually happens in comparable cases?","Why should this case differ?"],["base-rate anchor","case-specific adjustment"]),
U("Pre-Mortem","Assume the plan failed and generate plausible causes before execution.",["It is six months later and this failed. Why?","Which failure can we prevent now?"],["failure modes","preventive controls"]),
U("Stress Test","Test the plan under shocks to budget, conversion, costs, capacity and timing.",["What if revenue is 20% lower?","What if costs rise?","What if a key channel fails?"],["stress-test summary"]),
U("Decision Deadline","Do not research forever; set a decision deadline and evidence stop rule.",["When must we decide?","What minimum evidence is enough?"],["deadline","stop rule"]),
U("Uncertainty Budget","Allocate more analysis effort where uncertainty and impact are both high.",["Which unknown could most change enterprise value?","Which unknown is cheap to resolve?"],["uncertainty priority queue"]),
U("Assumption Ledger","Make assumptions explicit, dated and testable.",["What are we assuming?","Who owns validation?","When does it expire?"],["assumption ledger"]),
U("Confidence Calibration","Use numeric confidence as a trackable forecast, not decoration.",["What probability do we assign?","What outcome will score this forecast?"],["calibrated confidence"]),
U("Dependency Risk","Model upstream dependencies and correlated failures.",["Which dependencies share the same failure source?","What single point can break the plan?"],["dependency map"]),
U("Path Dependence","Consider how today’s choice changes future costs and options.",["Does this create lock-in?","What switching cost appears later?"],["path-dependence note"]),
U("Real Options","Treat pilots, reservations and phased contracts as options whose value rises with uncertainty.",["Can we pay a small amount to preserve a later choice?"],["real-option recommendation"]),
U("Portfolio of Bets","Diversify uncertain growth bets while concentrating proven execution.",["Which bets are correlated?","How much capital should remain exploratory?"],["bet portfolio"]),
U("Unknown Unknowns","Reserve margin for surprises instead of pretending the model is complete.",["What buffer is justified by novelty and complexity?"],["contingency reserve"]),
U("Evidence Ladder","Distinguish anecdote, observational signal, controlled evidence and causal proof.",["How strong is the evidence?","What stronger test is feasible?"],["evidence grade"]),
U("Decision Log","Record what was known at decision time so outcomes do not rewrite history.",["What did we know?","What did we predict?","Why did we choose this?"],["decision log"]),
U("Adaptive Plan","Specify how the plan changes when evidence changes.",["What remains fixed?","What is allowed to adapt?"],["adaptive policy"]),
U("Escalation Under Uncertainty","Escalate high-impact irreversible decisions when critical uncertainty remains unresolved.",["Is impact high?","Is the choice irreversible?","Is authority sufficient?"],["escalation decision"]),
U("Communication of Uncertainty","Communicate ranges, assumptions and confidence without hiding uncertainty or paralyzing action.",["What is known?","What is uncertain?","What are we doing despite that?"],["executive uncertainty brief"])
];

export const VIVITO_PLANNING_UNDER_UNCERTAINTY_DOCTRINE=`
Planning Under Uncertainty doctrine:
1. Never turn uncertainty into fake precision. State ranges, assumptions and confidence.
2. Separate what can be learned from what is inherently variable.
3. Match the evidence threshold to irreversibility, downside and external commitment.
4. Preserve optionality when uncertainty is high; commit progressively as evidence improves.
5. Use downside/base/upside scenarios and identify the assumptions that flip the decision.
6. Predefine scale, pause, stop, rollback and escalation triggers before execution.
7. Prefer robust plans that remain acceptable across plausible worlds over fragile optimums.
8. Use value-of-information logic: research only when learning can change a material decision.
9. Update beliefs when evidence changes; do not defend sunk conclusions.
10. Score forecasts after outcomes so confidence becomes calibrated over time.
11. Keep a dated assumption and decision ledger to prevent hindsight bias.
12. Maintain contingency capacity for unknown unknowns in novel or high-complexity work.
13. Communicate uncertainty clearly while still giving one recommended action.
`;

export const VIVITO_TRAINING_BATCH_23_CONTEXT=[VIVITO_PLANNING_UNDER_UNCERTAINTY_DOCTRINE,...VIVITO_PLANNING_UNDER_UNCERTAINTY_MODULES.map((m,i)=>`## UNCERTAINTY ${String(i+1).padStart(2,"0")} — ${m.name}\nPrinciple: ${m.principle}\nQuestions:\n${m.questions.map(q=>`- ${q}`).join("\n")}\nOutputs: ${m.output.join(", ")}`)].join("\n\n");
