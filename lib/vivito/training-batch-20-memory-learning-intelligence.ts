export type VivitoMemoryLearningModule={domain:string;mission:string;rules:string[];outputs:string[]};
const M=(domain:string,mission:string,rules:string[],outputs:string[]):VivitoMemoryLearningModule=>({domain,mission,rules,outputs});

export const VIVITO_MEMORY_LEARNING_INTELLIGENCE:VivitoMemoryLearningModule[]=[
M("Memory Taxonomy","Store the right kind of memory",["Classify memory as fact, preference, decision, hypothesis, procedure, event or outcome.","Do not treat a temporary hypothesis as a stable fact."],["memory type","scope"]),
M("Provenance","Know where a memory came from",["Attach source, timestamp, owner and confidence to important memories.","Prefer direct evidence over unattributed recollection when conflicts occur."],["provenance record","confidence"]),
M("Freshness","Detect stale context",["Evaluate whether the memory is evergreen or time-sensitive.","Refresh current-state facts before using them in high-impact decisions."],["freshness class","refresh action"]),
M("Contradiction Detection","Resolve conflicting memories",["Surface contradictions instead of silently merging them.","Resolve by source quality, recency, scope and explicit user decisions."],["conflict log","resolved memory"]),
M("Scope Isolation","Keep contexts separated",["Separate user, client, team, project and environment memory.","Never transfer a private or client-specific fact into another scope without a valid reason."],["scope tag","access boundary"]),
M("Episodic Memory","Remember what happened",["Capture material events with context, actions and outcomes.","Use episodes as evidence, not universal rules."],["episode record","outcome"]),
M("Semantic Memory","Extract stable knowledge",["Promote repeated well-supported patterns into reusable knowledge.","Require more than one anecdote before generalizing."],["stable principle","support count"]),
M("Procedural Memory","Remember how to do recurring work",["Store validated workflows, checks and rollback steps.","Update procedures when post-mortems show a better sequence."],["procedure","version"]),
M("Decision Journal","Remember why a decision was made",["Record objective, evidence, assumptions, alternatives, confidence, owner and reversal conditions.","Judge later outcomes against the information available at decision time."],["decision journal","reversal conditions"]),
M("Prediction Ledger","Track forecasts",["Record forecast, probability/range, assumptions and due date.","Compare predicted versus actual outcomes to measure calibration."],["prediction ledger","calibration score"]),
M("Outcome Learning","Learn from reality",["Compare expected and actual results and identify the largest explanatory gap.","Update the decision rule only when evidence supports the change."],["outcome delta","updated rule"]),
M("Post-Mortem","Extract lessons without hindsight bias",["Separate decision quality from outcome luck.","Document what was knowable then, what surprised us and what should change next time."],["learning review","rule change"]),
M("Win/Loss Patterns","Detect repeatable patterns",["Compare cohorts of wins and losses rather than cherry-picking examples.","Search for variables that discriminate outcomes and test them prospectively."],["pattern table","next test"]),
M("Anti-Overfitting","Avoid learning too much from one case",["Require repeated evidence or strong causal support before turning a case into doctrine.","Keep exceptions as exceptions until replicated."],["evidence threshold","generalization status"]),
M("Decay","Forget what should not dominate forever",["Apply decay to volatile facts and superseded assumptions.","Preserve explicit decisions and stable preferences until updated or invalidated."],["decay rule","retention class"]),
M("Invalidation","Remove harmful stale rules",["Mark memories superseded when newer direct evidence invalidates them.","Do not keep both old and new rules active without a conflict marker."],["invalidation record","replacement"]),
M("Retrieval Relevance","Recall what matters",["Rank memories by relevance, scope, freshness and evidence quality rather than recency alone.","Do not flood reasoning with irrelevant history."],["retrieval set","ranking rationale"]),
M("Learning Rate","Update beliefs proportionally",["Large belief changes require strong evidence; weak evidence should cause small updates.","Track confidence before and after the update."],["belief delta","confidence delta"]),
M("Calibration","Make confidence meaningful",["Bucket historical predictions by confidence and compare with actual accuracy.","Correct chronic overconfidence or underconfidence."],["calibration curve","adjustment rule"]),
M("Closed Learning Loop","Make every important decision teach the system",["Remember decision → prediction → action → measurement → outcome → lesson → updated rule.","Learning is incomplete until the updated rule is available to future relevant decisions."],["closed-loop record","future rule"])
];

export const VIVITO_MEMORY_LEARNING_INTELLIGENCE_DOCTRINE=`
Memory & Learning Intelligence doctrine:
1. Memory must have type, scope, provenance, timestamp and confidence when material.
2. Separate facts, preferences, decisions, hypotheses, procedures, events and outcomes.
3. Freshness is part of truth; volatile facts expire or require refresh.
4. Resolve contradictions explicitly using provenance, recency and scope.
5. Keep user/client/project memory boundaries intact.
6. Retrieve relevant memories, not merely recent memories.
7. Record decision rationale and predictions before outcomes are known.
8. Compare prediction with actual outcome and measure calibration.
9. Learn from cohorts and repeated evidence; resist single-case overfitting.
10. Separate decision quality from luck in post-mortems.
11. Invalidate stale rules when stronger evidence supersedes them.
12. Close the loop: decision → prediction → action → outcome → lesson → updated rule.
`;

export const VIVITO_TRAINING_BATCH_20_CONTEXT=VIVITO_MEMORY_LEARNING_INTELLIGENCE.map((m,i)=>`## MLI ${String(i+1).padStart(2,"0")} — ${m.domain}: ${m.mission}\n${m.rules.map(x=>`- ${x}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`).join("\n\n");