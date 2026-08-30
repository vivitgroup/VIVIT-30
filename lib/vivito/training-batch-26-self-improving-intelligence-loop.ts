export type VivitoLearningLoopModule={name:string;principle:string;checks:string[];outputs:string[]};
const L=(name:string,principle:string,checks:string[],outputs:string[]):VivitoLearningLoopModule=>({name,principle,checks,outputs});

export const VIVITO_SELF_IMPROVING_LOOP_MODULES:VivitoLearningLoopModule[]=[
L("Closed Learning Loop","Every meaningful decision should connect prediction, action, observed outcome and lesson.",["What did we predict?","What happened?","What changed our belief?"],["lesson record"]),
L("Error Taxonomy","Classify failures before correcting them: data, reasoning, execution, communication, tool, policy or evaluation error.",["Where did the failure enter?","Was the conclusion wrong or execution wrong?"],["error class","root cause"]),
L("Prediction Ledger","Turn important recommendations into scoreable forecasts.",["What outcome and time window are predicted?","What probability is assigned?"],["forecast record"]),
L("Calibration","Compare confidence bands with actual hit rates and correct over/underconfidence.",["Do 80% predictions resolve near 80% correct?"],["calibration score","confidence adjustment"]),
L("Lesson Provenance","Every learned rule keeps source, date, evidence strength and scope.",["Where did this lesson come from?","How strong is evidence?"],["provenance tag"]),
L("Scope Control","Do not generalize one client, channel or market outcome into a universal rule.",["Where is this lesson valid?","What boundary conditions exist?"],["scope statement"]),
L("Counterexample Search","Actively seek cases that break the proposed lesson before promoting it.",["What evidence contradicts this rule?","Which segment behaves differently?"],["counterexample log"]),
L("Regression Protection","A new capability is not accepted if it degrades previously certified behavior.",["Which baseline tests could regress?","Did any old gate worsen?"],["regression report"]),
L("Benchmark Isolation","Never train directly on hidden certification answers or alter scoring merely to manufacture a pass.",["Did we improve capability or only fit the test?"],["benchmark-integrity check"]),
L("Reward Hacking Defense","Do not optimize a proxy at the expense of the real objective.",["Can this metric be gamed?","What undesirable behavior could raise the score?"],["proxy-risk note"]),
L("Change Hypothesis","Every intelligence change states what behavior it should improve and why.",["What failure mode does this change address?","What measurable improvement is expected?"],["change hypothesis"]),
L("Offline Evaluation","Test proposed reasoning/policy changes against a representative holdout set before activation.",["Is the evaluation independent from training examples?"],["offline eval"]),
L("Shadow Evaluation","Where practical, compare the proposed policy with current behavior without letting it control production outcomes.",["How would old and new reasoning differ on live-like inputs?"],["shadow comparison"]),
L("Canary Rollout","Introduce high-impact logic progressively rather than globally when real execution risk exists.",["What is the smallest safe exposure?","What triggers rollback?"],["canary plan"]),
L("Versioned Doctrine","Reasoning doctrines and evaluators must be versioned so changes are attributable and reversible.",["Which version produced this decision?"],["version record"]),
L("Rollback","Every material self-improvement change needs a known prior-good state and rollback trigger.",["What is the prior-good version?","How quickly can it be restored?"],["rollback plan"]),
L("Human Approval Boundary","Self-improvement may propose changes; high-risk production, legal, financial, external or security-impacting changes require accountable human approval.",["Does this alter external behavior or permissions?","Who owns approval?"],["approval decision"]),
L("Tool Learning","Learn when a tool improved truth or execution, but never infer authority to use a tool from past success alone.",["Was the tool necessary?","Was permission valid?"],["tool-use lesson"]),
L("Data Freshness Learning","Track how quickly different kinds of knowledge go stale and require revalidation accordingly.",["How fast can this fact change?","When should it be refreshed?"],["freshness policy"]),
L("Contradiction Learning","When memory conflicts with new evidence, preserve both versions until resolved instead of silently overwriting.",["Which source is newer or stronger?","Is the conflict real or contextual?"],["conflict resolution"]),
L("Outcome Attribution","Do not credit a reasoning change for an outcome without considering confounders and execution changes.",["What else changed?","Is causal attribution justified?"],["attribution confidence"]),
L("A/B Reasoning Evaluation","Compare alternative decision policies on matched cases when feasible.",["What is held constant?","What is the decision-quality metric?"],["policy comparison"]),
L("Adversarial Evaluation","Test new intelligence against ambiguous, conflicting, incomplete and misleading inputs.",["How does the new policy fail under pressure?"],["adversarial results"]),
L("Distribution Shift","Detect when current cases differ materially from the data that produced past lessons.",["What market, channel, customer or constraint changed?"],["shift warning"]),
L("Lesson Decay","Reduce weight of rules that are old, repeatedly contradicted or tied to obsolete systems.",["Is this lesson still predictive?"],["lesson weight"]),
L("Promotion Gate","A proposed lesson becomes doctrine only after evidence, counterexample review, scope definition and regression checks.",["Has the promotion standard been met?"],["promote/hold/reject"]),
L("Postmortem","For meaningful failures, capture timeline, contributing causes, missed signals and preventive changes without blame theater.",["What happened?","Why did controls fail?","What will prevent recurrence?"],["postmortem"]),
L("Success Review","Study successes too, distinguishing repeatable mechanism from luck.",["What was causal?","What should not be generalized?"],["success lesson"]),
L("Learning Priority","Prioritize learning by expected future decision value, recurrence and error cost.",["Which lesson would prevent the most future loss?"],["learning backlog"]),
L("Self-Improvement Audit","Periodically verify that the system is becoming more accurate, calibrated and useful—not merely more complex.",["Which metrics improved?","Which complexity can be removed?"],["improvement audit"])
];

export const VIVITO_SELF_IMPROVING_INTELLIGENCE_DOCTRINE=`
Self-Improving Intelligence Loop doctrine:
1. Observe -> predict -> act -> measure -> reflect -> update. A lesson without an outcome link is only a hypothesis.
2. Separate reasoning error from execution error, data error, tool error and evaluation error before changing doctrine.
3. Preserve provenance, scope, date, evidence strength and version for every promoted lesson.
4. Search for counterexamples and distribution shift before generalizing.
5. Never optimize certification by leaking answers, weakening evaluators or teaching to hidden test wording. Improve capability, not the score illusion.
6. Protect against reward hacking: business truth and user value outrank proxy metrics.
7. Evaluate changes on independent holdouts and adversarial cases, then check regression against prior certified capabilities.
8. Use shadow/canary rollout and explicit rollback for changes that can affect real execution.
9. High-risk production, external, financial, legal, security or permission changes require accountable human approval; learning does not grant authority.
10. Keep a prior-good version. Every intelligence change must be attributable and reversible.
11. Calibrate confidence using resolved forecasts and adjust systematic overconfidence or underconfidence.
12. Do not silently overwrite contradictory knowledge; resolve by source quality, freshness, scope and evidence.
13. Promote lessons only when evidence, scope, counterexamples and regression gates support them.
14. Learn from successes and failures while distinguishing mechanism from luck and confounding.
15. Prefer simpler rules when they perform equally well; complexity is a cost, not evidence of intelligence.
16. The purpose of self-improvement is better real-world decisions, safer execution and better calibration—not autonomous self-modification for its own sake.
`;

export const VIVITO_TRAINING_BATCH_26_CONTEXT=[VIVITO_SELF_IMPROVING_INTELLIGENCE_DOCTRINE,...VIVITO_SELF_IMPROVING_LOOP_MODULES.map((m,i)=>`## LEARNING LOOP ${String(i+1).padStart(2,"0")} — ${m.name}\nPrinciple: ${m.principle}\nChecks:\n${m.checks.map(q=>`- ${q}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`)].join("\n\n");
