export type ChiefOfStaffModule={name:string;principle:string;checks:string[];outputs:string[]};
const M=(name:string,principle:string,checks:string[],outputs:string[]):ChiefOfStaffModule=>({name,principle,checks,outputs});
export const VIVITO_CHIEF_OF_STAFF_MODULES:ChiefOfStaffModule[]=[
M("North Star Translation","Translate strategy into a small set of enterprise priorities and measurable outcomes.",["What matters most this quarter?"],["priority stack"]),
M("Decision Agenda","Distinguish decisions, information updates, discussions and delegations.",["What decision is actually needed?"],["decision agenda"]),
M("Executive Briefing","Compress complexity into context, decision, options, recommendation, risk and ask.",["What does the executive need to decide now?"],["one-page brief"]),
M("Priority Arbitration","Resolve competing urgent requests using strategic value, risk, reversibility and opportunity cost.",["What should not be done?"],["priority decision"]),
M("Operating Cadence","Create daily, weekly, monthly and quarterly review loops tied to decisions.",["What should be reviewed at each cadence?"],["operating rhythm"]),
M("KPI Architecture","Separate outcome, driver, health and guardrail metrics.",["Which KPI predicts rather than only reports?"],["KPI tree"]),
M("Variance Management","Escalate material variance with cause, owner, recovery plan and deadline.",["Is variance noise or structural?"],["variance action"]),
M("Meeting Design","Every meeting needs a purpose, owner, pre-read, decisions and follow-up.",["Could this be async?"],["meeting design"]),
M("Pre-Read Discipline","Move information transfer before meetings so meeting time is for judgment.",["What must be known before the room?"],["pre-read"]),
M("Decision Rights","Clarify who recommends, decides, executes, must be consulted and informed.",["Who owns the call?"],["decision-rights map"]),
M("Delegation Quality","Delegate outcomes, constraints and checkpoints rather than only tasks.",["What autonomy is appropriate?"],["delegation brief"]),
M("Escalation Design","Escalate based on thresholds, not personality or anxiety.",["What condition requires executive attention?"],["escalation trigger"]),
M("Cross-Functional Alignment","Surface conflicting incentives across finance, growth, sales, creative and operations.",["Where are teams optimizing locally?"],["alignment map"]),
M("Resource Reallocation","Move people, budget and attention when marginal value changes.",["Where is the next unit of resource most valuable?"],["reallocation plan"]),
M("Execution Dependencies","Map blockers, critical path and sequencing before promising dates.",["What must happen first?"],["dependency map"]),
M("Owner Clarity","Every important action has one accountable owner even when many contribute.",["Who is the single owner?"],["owner assignment"]),
M("Deadline Integrity","Deadlines must reflect capacity, dependencies and risk, not wishful thinking.",["What makes this date credible?"],["credible date"]),
M("Risk Register","Track strategic, financial, operational, legal, people and reputational risks with triggers.",["What could materially derail the plan?"],["risk register"]),
M("Pre-Mortem","Imagine failure before launch and design prevention around likely causes.",["Why did this fail in the imagined future?"],["preventive actions"]),
M("Crisis Command","In incidents: stabilize, establish facts, assign command, communicate, recover and learn.",["What must be contained first?"],["incident command plan"]),
M("Board Thinking","Separate operating detail from board-level trajectory, capital, risk and strategic choices.",["What matters at governance level?"],["board summary"]),
M("Capital Narrative","Connect resource requests to expected return, timing, downside and strategic option value.",["Why this capital now?"],["investment case"]),
M("Talent Density","Evaluate role fit, capacity, leverage and critical capability gaps without simplistic rankings.",["Which capability is bottlenecking outcomes?"],["talent-gap map"]),
M("Hiring Case","New headcount requires workload evidence, leverage case and alternatives considered.",["Can process or tooling solve this first?"],["hiring decision"]),
M("Stakeholder Mapping","Track influence, incentives, objections and communication needs for major initiatives.",["Who can block or accelerate this?"],["stakeholder plan"]),
M("Executive Communication","Adapt depth and framing to CEO, board, client, operator or specialist without changing truth.",["What does this audience need to act?"],["audience-specific brief"]),
M("Follow-Through System","Decisions are incomplete until actions, owners, dates and verification are logged.",["How will completion be verified?"],["action ledger"]),
M("Strategy-to-Execution Traceability","Every major task should trace to a strategic objective or explicit operational necessity.",["Why are we doing this?"],["strategy link"]),
M("Stop-Doing Discipline","Periodically remove meetings, projects, metrics and work that no longer justify their cost.",["What can be stopped now?"],["stop-doing list"]),
M("CEO Operating Synthesis","Integrate strategy, economics, people, execution, risk and learning into one coherent recommendation.",["What is the decision, why now, who owns it, and what changes our mind?"],["executive recommendation"])
];
export const VIVITO_CHIEF_OF_STAFF_CEO_INTELLIGENCE_DOCTRINE=`
Chief-of-Staff / CEO Operating Intelligence doctrine:
1. Strategy becomes real only when translated into priorities, owners, resources, dates and measurable outcomes.
2. Protect executive attention: separate decisions from updates and move information transfer into pre-reads.
3. Every material decision needs one accountable owner, explicit decision rights and verification.
4. Prioritize by enterprise value, risk, reversibility and opportunity cost—not urgency theater.
5. Link KPIs to outcomes, drivers, health and guardrails; investigate material variance before reacting.
6. Map dependencies and capacity before promising dates or allocating resources.
7. Escalate by objective thresholds and maintain a live risk register.
8. In crises: stabilize, establish facts, assign command, communicate, recover, then learn.
9. Reallocate capital, people and attention as marginal value changes.
10. Adapt communication to stakeholders without changing underlying truth.
11. Maintain strategy-to-execution traceability and a disciplined stop-doing list.
12. The executive output is a coherent recommendation with rationale, owner, timing, risks, triggers and what evidence would reverse the decision.
`;
export const VIVITO_TRAINING_BATCH_30_CONTEXT=[VIVITO_CHIEF_OF_STAFF_CEO_INTELLIGENCE_DOCTRINE,...VIVITO_CHIEF_OF_STAFF_MODULES.map((m,i)=>`## EXEC-OPS ${String(i+1).padStart(2,"0")} — ${m.name}\nPrinciple: ${m.principle}\nChecks:\n${m.checks.map(q=>`- ${q}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`)].join("\n\n");