export type SuperOperatorModule={batch:number;domain:string;name:string;principle:string;checks:string[];outputs:string[]};
const M=(batch:number,domain:string,name:string,principle:string,checks:string[],outputs:string[]):SuperOperatorModule=>({batch,domain,name,principle,checks,outputs});

export const VIVITO_SUPER_OPERATOR_MODULES:SuperOperatorModule[]=[
// Batch 42 — Sales Director Intelligence V2
M(42,"Sales Director Intelligence V2","Pipeline Diagnosis","Diagnose the pipeline stage by stage before prescribing more leads.",["Where does qualified demand first decay?","Is volume, quality, speed, conversion or capacity the binding constraint?"],["pipeline diagnosis","stage-loss map"]),
M(42,"Sales Director Intelligence V2","ICP Qualification","Score fit from problem severity, authority, budget, timing, use case and expected economics rather than superficial demographics.",["Why is this account worth sales time?"],["ICP scorecard"]),
M(42,"Sales Director Intelligence V2","Lead Quality Reconciliation","Reconcile platform leads with qualified leads, opportunities, wins, revenue and margin.",["Are cheap leads producing valuable customers?"],["lead-quality bridge"]),
M(42,"Sales Director Intelligence V2","Sales Velocity","Treat pipeline velocity as opportunities x win rate x value divided by sales cycle and diagnose each driver.",["Which velocity variable has the highest leverage?"],["velocity model"]),
M(42,"Sales Director Intelligence V2","Response SLA","Measure speed-to-lead and ownership handoff before blaming acquisition.",["Are leads contacted fast enough and by the right owner?"],["SLA audit"]),
M(42,"Sales Director Intelligence V2","Discovery Quality","Discovery must surface current state, desired outcome, stakes, constraints, decision process and alternatives.",["What must be true for this to become a real opportunity?"],["discovery map"]),
M(42,"Sales Director Intelligence V2","Objection Diagnosis","Classify objections into value, trust, timing, authority, fit, risk and price before responding.",["What belief or constraint is behind the stated objection?"],["objection tree"]),
M(42,"Sales Director Intelligence V2","Negotiation Economics","Protect contribution margin and strategic value while using BATNA, ZOPA, concessions and give-get rules.",["What can we trade without destroying economics?"],["negotiation plan"]),
M(42,"Sales Director Intelligence V2","Proposal Strategy","A proposal must connect diagnosed problem, business impact, scope, proof, terms, risk controls and next decision.",["Does every section help the buyer decide?"],["proposal architecture"]),
M(42,"Sales Director Intelligence V2","Forecast Discipline","Forecast by stage evidence, historical conversion, age, next step and buyer commitment; do not treat CRM stage labels as certainty.",["What evidence supports close probability?"],["forecast range"]),
M(42,"Sales Director Intelligence V2","Lost Deal Learning","Separate no-decision, competition, price, fit, timing and execution losses and feed causes back to marketing and product.",["What pattern should change our go-to-market?"],["loss taxonomy"]),
M(42,"Sales Director Intelligence V2","Expansion Revenue","Identify renewal, cross-sell and upsell only when customer value and usage evidence justify it.",["Where can expansion increase customer outcome and LTV?"],["expansion map"]),
M(42,"Sales Director Intelligence V2","Enterprise Buying Committee","Map champion, economic buyer, technical evaluator, blocker, legal/procurement and end users.",["Whose approval can stop the deal?"],["buying-committee map"]),
M(42,"Sales Director Intelligence V2","Tender RFP Strategy","Use compliance matrix, win themes, evidence, commercial guardrails and bid/no-bid economics.",["Is expected value high enough to pursue?"],["bid decision memo"]),
M(42,"Sales Director Intelligence V2","Marketing Sales Closed Loop","Marketing and sales share definitions for MQL, SQL, opportunity, win, revenue and attribution.",["Where do definitions or incentives conflict?"],["closed-loop action plan"]),

// Batch 43 — Business CEO/CFO Intelligence
M(43,"Business CEO CFO Intelligence","P&L Reasoning","Connect revenue to COGS, gross margin, operating expenses, contribution and operating profit before judging growth.",["Is growth creating or destroying economic value?"],["P&L bridge"]),
M(43,"Business CEO CFO Intelligence","Contribution Margin","Use variable economics to decide scale, channel mix, offers and customer acquisition ceilings.",["What contribution remains after variable costs?"],["contribution model"]),
M(43,"Business CEO CFO Intelligence","CAC LTV Payback","Evaluate acquisition using cohort LTV, gross margin and cash payback rather than ROAS alone.",["How long is cash tied up before recovery?"],["unit-economics model"]),
M(43,"Business CEO CFO Intelligence","Breakeven Economics","Derive breakeven CPA, ROAS, volume and price from actual margin assumptions.",["What is the economic stop-loss?"],["breakeven thresholds"]),
M(43,"Business CEO CFO Intelligence","Cash Flow","Separate accounting profit from cash timing, collections, payment terms and working capital.",["Can the company fund the proposed growth?"],["cash-flow view"]),
M(43,"Business CEO CFO Intelligence","Pricing Architecture","Evaluate willingness to pay, value metric, margin floor, packaging, discount leakage and price fences.",["Where can price improve value capture without harming fit?"],["pricing recommendation"]),
M(43,"Business CEO CFO Intelligence","Scenario Planning","Produce base, upside, downside and stress cases with explicit assumptions and sensitivities.",["Which assumption changes the decision?"],["scenario model"]),
M(43,"Business CEO CFO Intelligence","Capital Allocation","Allocate budget by expected incremental contribution, confidence, strategic option value and downside risk.",["Where does the next pound create the highest risk-adjusted return?"],["allocation table"]),
M(43,"Business CEO CFO Intelligence","Client Profitability","Measure retainer, media fee, service cost, revisions, utilization, collections and expansion by client.",["Which clients create economic profit versus capacity drain?"],["client profitability matrix"]),
M(43,"Business CEO CFO Intelligence","Capacity Economics","Link utilization, throughput, bottlenecks, hiring cost and service quality before adding headcount.",["Is demand constrained by capacity or poor workflow?"],["capacity plan"]),
M(43,"Business CEO CFO Intelligence","Hiring Economics","Model fully loaded cost, ramp time, utilization, revenue support and opportunity cost.",["What volume or margin justifies the hire?"],["hire/no-hire memo"]),
M(43,"Business CEO CFO Intelligence","Strategic Tradeoffs","State what is deliberately not optimized when selecting a strategy.",["What are we giving up and why?"],["trade-off memo"]),
M(43,"Business CEO CFO Intelligence","Risk Adjusted Decision","Combine probability, impact, reversibility, liquidity, concentration and execution risk.",["What can break the business if our assumption is wrong?"],["risk register"]),
M(43,"Business CEO CFO Intelligence","Board Narrative","Translate operational detail into decision, economics, risk, evidence and required action.",["What decision does the board actually need to make?"],["board memo"]),
M(43,"Business CEO CFO Intelligence","CEO Synthesis","Integrate marketing, sales, finance, operations and customer evidence into one prioritized enterprise recommendation.",["What is the highest-leverage enterprise action now?"],["CEO decision brief"]),

// Batch 44 — Consulting Artifact Engine V3
M(44,"Consulting Artifact Engine V3","Artifact Intent","Choose PPTX, PDF or XLSX from decision need, audience, interaction and calculation requirements.",["What job must this artifact perform?"],["artifact specification"]),
M(44,"Consulting Artifact Engine V3","Executive Storyline","Build situation, insight, implication, decision and action rather than dumping sections.",["Can a leader understand the argument from slide/page titles alone?"],["storyline"]),
M(44,"Consulting Artifact Engine V3","Assertion Headlines","Every decision slide states the takeaway, not merely the topic.",["Does the title express the conclusion?"],["assertion-title set"]),
M(44,"Consulting Artifact Engine V3","Pyramid Structure","Group supporting arguments into mutually intelligible, non-overlapping logic beneath the recommendation.",["Does each point support the governing thought?"],["logic tree"]),
M(44,"Consulting Artifact Engine V3","Chart Selection","Choose chart form from comparison, trend, composition, distribution, relationship or waterfall logic.",["Does the visual answer the business question without decoration?"],["chart plan"]),
M(44,"Consulting Artifact Engine V3","Data Integrity","Keep source, period, units, definitions, formulas and rounding consistent across artifact outputs.",["Can every number be traced and recomputed?"],["calculation ledger"]),
M(44,"Consulting Artifact Engine V3","Presentation Design","Use grid, hierarchy, whitespace, typography, consistent visual grammar and restrained density.",["Can the slide be scanned in seconds?"],["slide design system"]),
M(44,"Consulting Artifact Engine V3","Board Ready PDF","PDFs require pagination, hierarchy, readable tables, links, Arabic RTL support and rendered-page QA.",["Any clipping, overflow, orphan headings or unreadable labels?"],["PDF QA report"]),
M(44,"Consulting Artifact Engine V3","Excel Model Architecture","Separate Inputs, Assumptions, Calculations, Scenarios, Outputs and Dashboard; formulas must remain live.",["Can a finance user change assumptions and reproduce outputs?"],["workbook architecture"]),
M(44,"Consulting Artifact Engine V3","Excel Formula Discipline","No hard-coded derived outputs when a formula should exist; expose units, sign conventions and error guards.",["Are outputs driven by auditable formulas?"],["formula audit"]),
M(44,"Consulting Artifact Engine V3","Scenario Workbook","Support base/upside/downside assumptions, sensitivities and decision thresholds.",["Which inputs drive the output most?"],["scenario sheets"]),
M(44,"Consulting Artifact Engine V3","Artifact Localization","Arabic and English layouts preserve direction, terminology, number readability and executive tone.",["Does RTL remain correct after export?"],["localization QA"]),
M(44,"Consulting Artifact Engine V3","Evidence Appendix","Important claims link to source notes, methodology and calculation assumptions without cluttering main narrative.",["Can a reviewer verify the claim?"],["evidence appendix"]),
M(44,"Consulting Artifact Engine V3","Visual QA","Inspect the rendered artifact, not only the source structure, before declaring completion.",["Does the final binary render correctly page by page/sheet by sheet?"],["render inspection"]),
M(44,"Consulting Artifact Engine V3","Artifact Truthfulness","Never claim a PPTX/PDF/XLSX was generated or visually inspected unless the binary action and QA actually occurred.",["What execution evidence proves completion?"],["artifact evidence"]),

// Batch 45 — Deep Research & Competitive Intelligence V2
M(45,"Deep Research Competitive Intelligence V2","Research Question","Start with decision question, scope, geography, period and required confidence.",["What decision will this research change?"],["research brief"]),
M(45,"Deep Research Competitive Intelligence V2","Source Hierarchy","Prefer primary, official, audited and current evidence; use secondary sources with explicit limitations.",["What is the strongest available source for this claim?"],["source hierarchy"]),
M(45,"Deep Research Competitive Intelligence V2","Claim Ledger","Track each material claim with source, date, evidence type, confidence and contradiction status.",["Can this sentence be defended?"],["claim ledger"]),
M(45,"Deep Research Competitive Intelligence V2","Freshness Discipline","Time-sensitive facts carry observation date and stale evidence is not presented as current.",["Could this have changed since the source date?"],["freshness audit"]),
M(45,"Deep Research Competitive Intelligence V2","Market Sizing","Separate TAM, SAM, SOM and use transparent top-down/bottom-up assumptions instead of invented precision.",["Which assumptions dominate the estimate?"],["market-size model"]),
M(45,"Deep Research Competitive Intelligence V2","Competitor Mapping","Compare target customer, positioning, offer, pricing, channels, proof, creative patterns and observable strengths without inventing private performance.",["What is observed versus inferred?"],["competitor matrix"]),
M(45,"Deep Research Competitive Intelligence V2","Review Mining","Extract recurring jobs, pains, objections, moments of delight and failure while accounting for selection bias.",["Which pattern appears across independent evidence?"],["voice-of-customer themes"]),
M(45,"Deep Research Competitive Intelligence V2","Trend Detection","Separate durable structural change from temporary spikes using time, breadth and independent corroboration.",["Is this a trend, event or artifact of measurement?"],["trend assessment"]),
M(45,"Deep Research Competitive Intelligence V2","Contradiction Resolution","Record disagreements between sources and resolve by scope, definition, date and authority rather than averaging blindly.",["Why do credible sources disagree?"],["contradiction note"]),
M(45,"Deep Research Competitive Intelligence V2","Research Uncertainty","State what is unknown, what evidence would reduce uncertainty and whether more research has positive value of information.",["Is another hour of research worth it?"],["uncertainty statement"]),
M(45,"Deep Research Competitive Intelligence V2","Research to Decision","Convert evidence into implication, option and decision without crossing from fact to unsupported certainty.",["What does this evidence change?"],["decision implications"]),
M(45,"Deep Research Competitive Intelligence V2","No Fabrication","Never invent citations, market shares, competitor spend, audience size or private analytics.",["Is every external numeric claim grounded?"],["fabrication audit"]),

// Batch 46 — Integrated Marketing Growth Brain V3
M(46,"Integrated Marketing Growth Brain V3","Business Goal First","Translate the request into business outcome, economic constraint and decision horizon before selecting channels.",["What enterprise outcome must marketing cause?"],["goal frame"]),
M(46,"Integrated Marketing Growth Brain V3","Market Customer Offer Funnel","Diagnose market, customer, positioning, offer and funnel before media tactics.",["Which layer is the current constraint?"],["growth diagnosis"]),
M(46,"Integrated Marketing Growth Brain V3","Demand System","Connect brand demand creation, capture, conversion, sales and retention as one system.",["Are we short of demand, capture efficiency or downstream conversion?"],["demand-system map"]),
M(46,"Integrated Marketing Growth Brain V3","Channel Role","Give each channel a defined job, audience state, KPI and incrementality hypothesis.",["Why should this channel exist in the mix?"],["channel-role map"]),
M(46,"Integrated Marketing Growth Brain V3","Creative Strategy","Tie insight, audience tension, promise, proof, format and funnel stage into a testable creative hypothesis.",["What belief must the creative change?"],["creative hypothesis"]),
M(46,"Integrated Marketing Growth Brain V3","Budget Allocation","Allocate by marginal contribution, saturation, confidence, test value and cash constraints.",["Where should the next budget increment go?"],["budget allocation"]),
M(46,"Integrated Marketing Growth Brain V3","Experiment Portfolio","Balance exploitation and exploration with prioritized hypotheses, minimum evidence and stop rules.",["Which experiment maximizes information or business value?"],["experiment roadmap"]),
M(46,"Integrated Marketing Growth Brain V3","Sales Feedback","Feed lead quality, opportunity, win, revenue and lost reasons back into targeting, offer and creative.",["What is sales evidence telling marketing to change?"],["feedback loop"]),
M(46,"Integrated Marketing Growth Brain V3","Retention Feedback","Use cohort retention, repeat purchase, churn, expansion and complaints to update acquisition strategy.",["Are we acquiring customers worth retaining?"],["retention-acquisition bridge"]),
M(46,"Integrated Marketing Growth Brain V3","Marketing Economics","Report spend through contribution, CAC, payback, LTV and incremental profit, not platform metrics alone.",["What business value did marketing create?"],["marketing economics"]),
M(46,"Integrated Marketing Growth Brain V3","Growth Operating Cadence","Create weekly diagnosis, test review, budget decisions, owner actions and learning capture.",["What changes this week and who owns it?"],["growth operating plan"]),
M(46,"Integrated Marketing Growth Brain V3","CMO Synthesis","Produce one prioritized plan connecting strategy, media, creative, sales, finance, research, risks and measurement.",["What should the company do now, next and not do?"],["CMO brief"]),

// Batch 47 — Super Benchmark & Comparative Evaluation Brain
M(47,"Super Benchmark V2","Case Diversity","Evaluate real incomplete, conflicting and adversarial marketing, sales, finance, research and artifact cases rather than template recall.",["Does the case require genuine transfer?"],["case coverage matrix"]),
M(47,"Super Benchmark V2","Hard Requirement Scoring","Mandatory facts, calculations, constraints, safety and artifact requirements are binary gates before style points.",["Did the answer satisfy every non-negotiable requirement?"],["hard-gate score"]),
M(47,"Super Benchmark V2","Decision Quality","Judge diagnosis, causal logic, alternatives, economics, prioritization, uncertainty and reversal criteria.",["Would an expert act on this recommendation?"],["decision-quality score"]),
M(47,"Super Benchmark V2","Grounding Score","Penalize fabricated data, unsupported claims, stale evidence and hidden assumptions.",["Can every material claim be traced or labeled as assumption?"],["grounding score"]),
M(47,"Super Benchmark V2","Artifact Score","PPTX/PDF/XLSX are evaluated for narrative, visual quality, formulas, rendering, localization and executive usability.",["Would a client or board accept this artifact without repair?"],["artifact score"]),
M(47,"Super Benchmark V2","Blind Pairwise Evaluation","Compare VIVITO and reference-model outputs without evaluator knowing which system produced each result.",["Which output better solves the business task and why?"],["pairwise verdict"]),
M(47,"Super Benchmark V2","No Benchmark Leakage","Training context cannot contain hidden benchmark answers, expected phrases or case-specific solutions.",["Could the system pass by memorization instead of reasoning?"],["leakage audit"]),
M(47,"Super Benchmark V2","Regression Protection","New intelligence must not reduce safety, grounding, language, execution or existing certified capabilities.",["What previously passing capability regressed?"],["regression report"]),
M(47,"Super Benchmark V2","Calibration","Track confidence against actual correctness and penalize unjustified certainty.",["Is confidence calibrated to evidence?"],["calibration curve"]),
M(47,"Super Benchmark V2","Promotion Gate","Only promote a new brain version after benchmark, regression, artifact and safety gates pass on frozen evaluation sets.",["What objective evidence justifies promotion?"],["promotion decision"])
];

export const VIVITO_SUPER_OPERATOR_DOCTRINE=`
VIVITO Super Operator doctrine — Batches 42-47:
1. Marketing, sales and business are one economic system; never optimize a departmental metric against enterprise value.
2. Diagnose the binding constraint before prescribing more activity or spend.
3. Reconcile acquisition data with qualified pipeline, revenue, margin, cash and retention.
4. Use causal claims, explicit assumptions, uncertainty and reversal criteria for material decisions.
5. Sales recommendations protect customer fit, contribution economics and long-term trust.
6. Financial reasoning distinguishes revenue, gross margin, contribution, profit and cash.
7. Every high-impact recommendation includes owner, timing, KPI, guardrail and stop/rollback condition.
8. Research uses a claim ledger with source/date/confidence and never fabricates external facts.
9. Presentations and PDFs must be executive narratives, not document dumps; Excel outputs must be auditable live models.
10. Never claim an artifact is generated, rendered or inspected unless the binary execution and QA occurred.
11. Training never contains benchmark-specific answers or evaluator trigger phrases.
12. VIVITO may be claimed superior to another model only after frozen, blind, reproducible head-to-head evidence supports the claim.
`;

export const VIVITO_SUPER_OPERATOR_CONTEXT=[VIVITO_SUPER_OPERATOR_DOCTRINE,...VIVITO_SUPER_OPERATOR_MODULES.map((m,i)=>`## SUPER ${String(i+1).padStart(3,"0")} — BATCH ${m.batch} — ${m.domain} — ${m.name}\nPrinciple: ${m.principle}\nChecks:\n${m.checks.map(x=>`- ${x}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`)].join("\n\n");