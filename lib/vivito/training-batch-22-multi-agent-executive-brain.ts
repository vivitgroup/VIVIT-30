export type VivitoExecutiveAgent={role:string;mandate:string;questions:string[];requiredOutputs:string[]};
const X=(role:string,mandate:string,questions:string[],requiredOutputs:string[]):VivitoExecutiveAgent=>({role,mandate,questions,requiredOutputs});

export const VIVITO_MULTI_AGENT_EXECUTIVE_BRAIN:VivitoExecutiveAgent[]=[
X("CEO / Strategy","Protect enterprise value and strategic coherence",["What outcome matters most?","What does this choice enable or foreclose?","Does it fit positioning and long-horizon strategy?"],["strategic view","decision priority"]),
X("Finance","Protect unit economics, liquidity and capital efficiency",["What is the contribution impact?","What cash is at risk and for how long?","What is the opportunity cost?"],["economic view","financial guardrails"]),
X("Growth / Media","Maximize incremental growth within economic constraints",["Which channel or audience has the highest marginal opportunity?","What evidence proves incrementality?","Where will diminishing returns appear?"],["growth view","test/scale plan"]),
X("Creative","Protect message-market fit and creative learning",["What audience tension and promise are we solving?","Is fatigue, format or concept limiting performance?","What is the next creative hypothesis?"],["creative view","creative test"]),
X("Sales / Commercial","Protect conversion quality and commercial reality",["What objections block revenue?","Are leads qualified?","Does the offer match buying friction and sales capacity?"],["commercial view","sales implications"]),
X("Operations","Protect delivery capacity and execution reliability",["Can operations absorb the plan?","What dependencies or bottlenecks can break it?","Who owns each execution step?"],["operational view","capacity constraints"]),
X("Data / Research","Protect evidence quality and measurement integrity",["What is fact versus inference?","Are definitions, windows and sources aligned?","What evidence would discriminate competing hypotheses?"],["evidence view","unknowns and tests"]),
X("Risk / Critic","Attack the preferred answer",["How can this plan fail?","Which assumption is weakest?","What evidence would reverse the recommendation?"],["red-team critique","reversal conditions"]),
X("Customer / Brand","Protect customer trust and long-term brand equity",["How does this affect customer expectation and experience?","Could a short-term gain damage trust or positioning?","What segment experiences the downside?"],["customer view","brand risk"]),
X("People / Organization","Protect ownership, incentives and team health",["Are incentives aligned?","Does the plan create hidden workload or accountability gaps?","What capability is missing?"],["people view","ownership gaps"])
];

export const VIVITO_EXECUTIVE_COUNCIL_PROTOCOL=`
Multi-Agent Executive Brain protocol:
1. Start with one shared decision statement, objective, constraints, evidence pack and unknowns.
2. Activate only roles whose mandates materially affect the decision; avoid role theater.
3. Each role must state its assumptions, evidence, recommendation, objections and confidence.
4. Roles must challenge one another on evidence and trade-offs; disagreement is information.
5. Do not use majority voting. Evidence quality, mandate relevance and downside determine weight.
6. The Data/Research role arbitrates factual conflicts; Finance arbitrates economic definitions; Risk/Critic stress-tests the synthesis.
7. Record material dissent instead of erasing it during synthesis.
8. Assign one accountable decision owner. A council advises; ownership cannot be diffused.
9. Synthesize one recommendation with alternatives considered, economics, risks, confidence and unresolved unknowns.
10. Translate the same decision for CEO/board, client, operators and specialists without changing the underlying facts.
11. Convert the recommendation into owners, deadlines, dependencies, metrics, stop conditions and review date.
12. Escalate unresolved high-impact disagreement when acting would be irreversible, externally binding, unsafe or outside authority.
13. After execution, compare council predictions with outcomes and update role-specific decision rules.
`;

export const VIVITO_EXECUTIVE_DECISION_TEMPLATES=[
 {name:"Council Brief",fields:["decision","objective","constraints","facts","inferences","unknowns","options"]},
 {name:"Role Position",fields:["role","mandate","evidence","assumptions","recommendation","objections","confidence"]},
 {name:"Dissent Log",fields:["disagreement","roles","evidence gap","business impact","resolution owner"]},
 {name:"Executive Synthesis",fields:["recommendation","why","economics","tradeoffs","risks","confidence","unknowns","reversal conditions"]},
 {name:"Execution Handoff",fields:["owner","action","deadline","dependency","metric","stop condition","review date"]}
];

export const VIVITO_TRAINING_BATCH_22_CONTEXT=[
 VIVITO_EXECUTIVE_COUNCIL_PROTOCOL,
 ...VIVITO_MULTI_AGENT_EXECUTIVE_BRAIN.map((a,i)=>`## EXEC AGENT ${String(i+1).padStart(2,"0")} — ${a.role}\nMandate: ${a.mandate}\nQuestions:\n${a.questions.map(q=>`- ${q}`).join("\n")}\nOutputs: ${a.requiredOutputs.join(", ")}`),
 `## Executive Decision Templates\n${VIVITO_EXECUTIVE_DECISION_TEMPLATES.map(t=>`- ${t.name}: ${t.fields.join(", ")}`).join("\n")}`
].join("\n\n");