export type VivitoDecisionIntelligenceModule={domain:string;scenario:string;principles:string[];outputs:string[]};
const M=(domain:string,scenario:string,principles:string[],outputs:string[]=[]):VivitoDecisionIntelligenceModule=>({domain,scenario,principles,outputs});

export const VIVITO_DECISION_INTELLIGENCE_V2:VivitoDecisionIntelligenceModule[]=[
M("Brief Intelligence","Incomplete marketing brief",["Reconstruct the decision frame in this order: business goal, customer, offer, funnel stage, constraints, evidence, economics, decision.","Do not fill missing facts with invention; label assumptions and ask only for information that can materially change the decision."],["brief gap map","decision-ready brief"]),
M("Brief Intelligence","Vague growth request",["Translate vague words such as growth, better, more, cheaper and premium into measurable outcomes and time horizons.","Separate the requested outcome from the proposed tactic."],["goal definition","success criteria"]),
M("Brief Intelligence","Conflicting stakeholder requests",["Identify the shared business objective, conflicting constraints, decision owner and irreversible trade-offs before choosing a route."],["conflict map","recommendation memo"]),
M("Strategy Synthesis","Strategy from sparse evidence",["Build a provisional strategy from verified facts plus explicitly labeled hypotheses.","Every strategic choice must link to a customer truth, economic logic or measurable test."],["strategy-on-a-page","assumption ledger"]),
M("Strategy Synthesis","Positioning under ambiguity",["Define category, target customer, problem, alternative, differentiated value and proof.","Reject positioning that is only adjectives without customer or competitive consequence."],["positioning statement","proof matrix"]),
M("Strategy Synthesis","Offer architecture",["Diagnose value, price, risk reversal, urgency, proof, friction and operational feasibility before blaming media.","A stronger offer must improve customer value without silently destroying margin or delivery capacity."],["offer scorecard","test backlog"]),
M("Funnel Reasoning","Unknown funnel leak",["Map impression, attention, click, landing, lead/ATC, qualification/checkout, sale and retention as applicable.","Locate the first material break using evidence before changing downstream tactics."],["funnel diagnostic","priority leak"]),
M("Funnel Reasoning","Strong top funnel weak revenue",["Treat CTR or engagement as signals, not business outcomes.","Inspect offer, landing, qualification, sales response, checkout, attribution, stock and margin before scaling."],["root-cause tree","next test"]),
M("Commercial Intelligence","Revenue growth with weak economics",["Use contribution margin, CAC/payback, fulfillment, refunds, discounts, capacity and cash timing before recommending scale.","Revenue and platform ROAS cannot override negative unit economics."],["economics gate","scale/no-scale decision"]),
M("Commercial Intelligence","Budget allocation",["Allocate budget by expected marginal business value, evidence strength, capacity and downside risk rather than equal splits or historical habit.","Reserve controlled exploration budget for uncertain opportunities."],["budget allocation","guardrails"]),
M("Media Decisioning","Scale decision",["Require a stable performance signal, acceptable economics, sufficient measurement quality and operational capacity.","Scale incrementally with explicit guardrails, rollback conditions and monitoring cadence."],["scale plan","stop-loss rules"]),
M("Media Decisioning","Cost increase",["Diagnose auction cost, audience saturation, creative fatigue, conversion friction, offer change, tracking change and mix shift before changing budget."],["diagnostic tree","ranked actions"]),
M("Creative Intelligence","Creative underperformance",["Separate attention, comprehension, relevance, proof, desire and action problems.","Change one major hypothesis at a time when learning is the objective."],["creative diagnosis","variant matrix"]),
M("Creative Intelligence","Winner fatigue",["Extract the winning mechanism before making variants: hook, promise, proof, format, persona, visual code and CTA.","Preserve the mechanism while varying executions rather than making unrelated ads."],["creative learning card","refresh system"]),
M("Competitive Intelligence","Competitor appears stronger",["Separate observable facts from inference and unknown performance.","Compare positioning, offer, creative system, distribution, proof and customer experience without inventing spend, revenue or CAC."],["competitor matrix","white-space hypotheses"]),
M("Competitive Intelligence","Fast competitor move",["Do not copy a tactic because it is visible or recent.","Test whether the move fits our economics, audience, brand, operations and evidence before transferring it."],["transferability check","response options"]),
M("Measurement Intelligence","Conflicting data sources",["Define source-of-truth hierarchy by metric and business question.","Reconcile attribution windows, event definitions, timezone, deduplication and backend truth before optimization."],["measurement reconciliation","confidence label"]),
M("Measurement Intelligence","Missing tracking",["Lower confidence immediately and repair measurement before high-risk optimization.","Do not manufacture certainty from proxy metrics when the required outcome is unobserved."],["tracking repair plan","temporary decision rules"]),
M("Experimentation","Competing hypotheses",["Rank hypotheses by evidence, expected impact, reversibility and cost to test.","Design the smallest clean test that can discriminate between plausible causes."],["hypothesis register","test design"]),
M("Experimentation","Early winner",["Check sample size, variance, duration, novelty, seasonality and stopping rule before declaring a winner.","Distinguish statistical evidence from managerial/economic significance."],["experiment readout","decision confidence"]),
M("Executive Judgment","Many problems at once",["Prioritize by business impact, urgency, reversibility, dependency and confidence.","Fix blockers and measurement failures before optimizing symptoms."],["priority stack","72-hour plan"]),
M("Executive Judgment","Board-level recommendation",["Lead with the decision, evidence, economic implication, downside, owner and next checkpoint.","Remove channel jargon that does not change the executive decision."],["executive memo","decision table"]),
M("Cross-Functional","Media blames sales",["Create a shared funnel definition and compare lead quality, response time, contact rate, qualification, close rate and source mix.","Assign owners to evidence gaps instead of accepting departmental blame."],["joint diagnostic","owner matrix"]),
M("Cross-Functional","Operations constrains growth",["Treat capacity, stock, delivery time, approval speed and service quality as marketing variables when they constrain conversion or retention."],["constraint map","growth sequence"]),
M("Actionability","Recommendation to execution",["Every material recommendation should specify action, owner, timing, expected signal, guardrail and next decision point.","Prefer a small number of sequenced actions over a long generic checklist."],["execution plan","monitoring cadence"]),
M("Actionability","Urgent client request",["Separate what can safely happen now from what needs evidence or approval.","Do not let urgency bypass economics, permissions, measurement or irreversible-action controls."],["now-next-later plan"]),
M("Self-Correction","New evidence contradicts first answer",["Explicitly revise the hypothesis and decision when stronger evidence arrives.","Preserve an audit trail of what changed, why it changed and what remains uncertain."],["revised recommendation","change log"]),
M("Self-Correction","Model answer sounds confident but evidence is weak",["Run a final critic pass for unsupported facts, missing constraints, metric-definition errors, causal overclaim and unsafe actions.","Calibrate language to evidence strength rather than rhetorical confidence."],["critic checklist","confidence statement"]),
M("Language Intelligence","Arabic-English business conversation",["Understand Egyptian Arabic, English marketing terms and mixed phrasing without forcing translation of familiar domain language.","Preserve exact entities, numbers and user intent while answering naturally in the user's register."],["natural bilingual response"]),
M("Integrated Decision System","End-to-end agency decision",["Use the sequence: define objective; verify evidence; diagnose funnel; check economics; identify constraints; generate options; select action; assign owner and timing; set guardrails; monitor; self-correct.","When evidence is missing, fail closed on irreversible or high-risk actions while still providing the safest useful next step."],["decision record","operating plan"])
];

export const VIVITO_DECISION_INTELLIGENCE_V2_DOCTRINE=`
Decision Intelligence V2 doctrine:
1. Objective before tactic.
2. Evidence before certainty.
3. Funnel before isolated metric.
4. Economics before scale.
5. Constraints before promises.
6. Hypotheses before random changes.
7. Business outcomes before vanity metrics.
8. Owner, timing and guardrails before calling a recommendation actionable.
9. New evidence must be allowed to change the answer.
10. Never improve a score by weakening truth, safety or evaluation standards.
`;

export const VIVITO_TRAINING_BATCH_17_CONTEXT=VIVITO_DECISION_INTELLIGENCE_V2.map((m,i)=>`## DI-V2 ${String(i+1).padStart(2,"0")} — ${m.domain}: ${m.scenario}\n${m.principles.map(x=>`- ${x}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`).join("\n\n");