export type MarketingParityModule={batch:number;domain:string;name:string;principle:string;checks:string[];outputs:string[]};
const M=(batch:number,domain:string,name:string,principle:string,checks:string[],outputs:string[]):MarketingParityModule=>({batch,domain,name,principle,checks,outputs});

export const VIVITO_MARKETING_PARITY_MODULES:MarketingParityModule[]=[
// Batch 32 — Marketing Causal Intelligence
M(32,"Marketing Causal Intelligence","Causal Question Framing","Turn performance questions into explicit causal hypotheses instead of descriptive correlations.",["What changed, what could have caused it, and what evidence would falsify each cause?"],["causal hypothesis set"]),
M(32,"Marketing Causal Intelligence","Confounder Scan","Check seasonality, promotions, stock, pricing, tracking, sales capacity and channel mix before attributing movement to media.",["What else changed at the same time?"],["confounder register"]),
M(32,"Marketing Causal Intelligence","Funnel Causal Chain","Map exposure to click to landing behavior to lead quality to sales to margin before choosing an intervention.",["Where does the causal chain first break?"],["funnel causal map"]),
M(32,"Marketing Causal Intelligence","Incrementality Discipline","Platform attribution is evidence, not proof of incrementality; distinguish credited conversions from caused conversions.",["Would these conversions likely have happened without the intervention?"],["incrementality assessment"]),
M(32,"Marketing Causal Intelligence","Lag and Carryover","Model delayed conversion, creative wear-in, retention and offline sales effects before judging short windows.",["What effect should appear now versus later?"],["lag model"]),
M(32,"Marketing Causal Intelligence","Counterfactual Reasoning","State the most plausible no-action baseline and compare observed performance against it.",["What is the defensible counterfactual?"],["counterfactual baseline"]),
M(32,"Marketing Causal Intelligence","Selection Bias","Check whether targeting, lead routing or CRM filtering changes who is observed.",["Are we comparing equivalent populations?"],["selection-bias check"]),
M(32,"Marketing Causal Intelligence","Attribution Reconciliation","Reconcile ad-platform, analytics, CRM and finance outcomes by metric definition, window and identity rules.",["Why do systems disagree?"],["measurement reconciliation"]),
M(32,"Marketing Causal Intelligence","Causal Priority","Rank causes by evidence strength, business impact and ease of testing, not by familiarity.",["Which cause deserves the next test?"],["causal priority matrix"]),
M(32,"Marketing Causal Intelligence","Root Cause Closure","Do not stop at symptoms such as high CPL; identify the controllable upstream mechanism.",["What mechanism generated the symptom?"],["root-cause statement"]),
M(32,"Marketing Causal Intelligence","Natural Experiment Thinking","Use geographic, temporal, cohort or operational discontinuities when randomized testing is unavailable.",["Is there a credible comparison group already present?"],["natural-experiment plan"]),
M(32,"Marketing Causal Intelligence","Causal Decision Rule","Every recommendation states causal claim, evidence, uncertainty, test and reversal condition.",["What result would make us change our mind?"],["causal decision memo"]),

// Batch 33 — Consumer Psychology & JTBD
M(33,"Consumer Psychology & JTBD","Jobs-to-be-Done","Understand the progress a customer is trying to make, not just demographics.",["What functional, emotional and social job is being hired?"],["JTBD map"]),
M(33,"Consumer Psychology & JTBD","Trigger Context","Identify the event or tension that makes the customer enter the market now.",["What changed that made action urgent?"],["trigger map"]),
M(33,"Consumer Psychology & JTBD","Anxiety and Risk","Map perceived financial, social, functional and switching risks before writing persuasion.",["What could make a rational buyer hesitate?"],["risk map"]),
M(33,"Consumer Psychology & JTBD","Desired Identity","Separate product utility from identity, belonging and status motives without stereotyping.",["Who does the buyer want to become or signal?"],["identity hypothesis"]),
M(33,"Consumer Psychology & JTBD","Objection Architecture","Classify objections into value, trust, timing, fit, price and proof.",["Which objection blocks the next step?"],["objection tree"]),
M(33,"Consumer Psychology & JTBD","Friction Audit","Find cognitive, procedural, trust and effort friction across the journey.",["What makes the next action harder than necessary?"],["friction audit"]),
M(33,"Consumer Psychology & JTBD","Proof Matching","Match proof type to objection: demonstration, testimonial, data, guarantee, authority or trial.",["What proof reduces this specific uncertainty?"],["proof plan"]),
M(33,"Consumer Psychology & JTBD","Choice Architecture","Simplify decisions ethically through defaults, comparisons and sequencing without deceptive dark patterns.",["How can the choice become easier without manipulation?"],["choice architecture"]),
M(33,"Consumer Psychology & JTBD","Price Perception","Understand reference price, fairness, framing and total value rather than discount reflexes.",["What reference point shapes price perception?"],["price perception map"]),
M(33,"Consumer Psychology & JTBD","Trust Formation","Model credibility from consistency, specificity, transparency, proof and reversibility.",["What trust signal is missing?"],["trust plan"]),
M(33,"Consumer Psychology & JTBD","Behavioral Segmentation","Segment by context, readiness, job and barrier rather than unsupported personality labels.",["Which behavioral state changes the message?"],["behavioral segments"]),
M(33,"Consumer Psychology & JTBD","Ethical Persuasion Guardrail","Never use fabricated scarcity, fake social proof, hidden fees or exploitative vulnerability targeting.",["Would this still be acceptable if fully disclosed?"],["ethical persuasion review"]),

// Batch 34 — Positioning, Offer & Messaging
M(34,"Positioning Offer Messaging","ICP Precision","Define best-fit customer by problem severity, ability to buy, use case and economics.",["Who gets disproportionate value and why?"],["ICP definition"]),
M(34,"Positioning Offer Messaging","Competitive Frame","State the category or alternative the buyer compares against before claiming differentiation.",["Compared with what?"],["competitive frame"]),
M(34,"Positioning Offer Messaging","Differentiated Value","Translate capabilities into customer-visible outcomes competitors cannot easily match.",["Why choose us instead of the next-best alternative?"],["differentiation statement"]),
M(34,"Positioning Offer Messaging","Value Proposition","Connect target, problem, outcome, mechanism and proof in one clear proposition.",["Is the value proposition specific and believable?"],["value proposition"]),
M(34,"Positioning Offer Messaging","Offer Architecture","Combine core product, bonuses, terms, risk reversal, urgency and qualification coherently.",["Does each offer component increase value or reduce risk?"],["offer architecture"]),
M(34,"Positioning Offer Messaging","Message Hierarchy","Order promise, proof, mechanism, objections and CTA so the customer can understand quickly.",["What must be understood first?"],["message hierarchy"]),
M(34,"Positioning Offer Messaging","Campaign Angles","Generate distinct strategic angles from customer tensions rather than cosmetic copy variants.",["What different reason to care does each angle express?"],["angle matrix"]),
M(34,"Positioning Offer Messaging","Proof Ledger","Every strong claim maps to an evidence source or is labeled as hypothesis.",["What proves this claim?"],["proof ledger"]),
M(34,"Positioning Offer Messaging","Category Entry Points","Map situations in which the brand should come to mind and build messages around them.",["When should buyers think of us?"],["entry-point map"]),
M(34,"Positioning Offer Messaging","Objection-to-Message Mapping","Each key objection gets a specific message and proof response.",["Which message resolves which objection?"],["objection-message map"]),
M(34,"Positioning Offer Messaging","Offer Economics","Validate discount, guarantee and bonus economics before recommending them.",["Can the business afford the promise?"],["offer economics check"]),
M(34,"Positioning Offer Messaging","Positioning Consistency","Check that media, landing page, sales script and onboarding tell the same strategic story.",["Where does positioning break across touchpoints?"],["consistency audit"]),

// Batch 35 — Advanced Media Buying & Auction Science
M(35,"Advanced Media Buying","Auction Mechanics","Reason from auction competitiveness, expected action rate, relevance and bid strategy rather than superstition.",["Which auction variable is plausibly constraining delivery?"],["auction diagnosis"]),
M(35,"Advanced Media Buying","Learning Stability","Protect enough conversion signal for algorithms to learn while avoiding rigid myths about fixed thresholds.",["Is the campaign receiving stable decision-quality signal?"],["learning assessment"]),
M(35,"Advanced Media Buying","Marginal Efficiency","Scale based on marginal CPA, marginal ROAS and contribution, not average historical efficiency alone.",["What happened to the next unit of spend?"],["marginal efficiency curve"]),
M(35,"Advanced Media Buying","Budget Elasticity","Estimate how outcome changes as spend changes and identify saturation points.",["How sensitive is performance to added budget?"],["budget elasticity estimate"]),
M(35,"Advanced Media Buying","Creative Saturation","Use frequency, reach, CTR, conversion rate and creative cohort evidence together.",["Is fatigue actually creative, audience, offer or measurement?"],["fatigue diagnosis"]),
M(35,"Advanced Media Buying","Audience Expansion","Evaluate broad, lookalike, intent and retargeting by incremental reach and economics.",["Is this audience adding buyers or reallocating credit?"],["audience expansion plan"]),
M(35,"Advanced Media Buying","Channel Portfolio","Allocate across Meta, Google, TikTok, Snapchat, LinkedIn and others by role in journey and marginal return.",["What unique job does each channel perform?"],["channel portfolio"]),
M(35,"Advanced Media Buying","Pacing Control","Use spend pacing against target trajectory, remaining budget and expected conversion lag.",["Are we over- or under-spending relative to expected outcomes?"],["pacing plan"]),
M(35,"Advanced Media Buying","Scale Hold Cut Test","Every campaign receives one explicit action with reason, amount, risk and review date.",["Scale, hold, cut or test? Why now?"],["media action card"]),
M(35,"Advanced Media Buying","Attribution Window Logic","Interpret platform metrics in context of conversion delay and reporting settings.",["Would a different window materially change the decision?"],["window assessment"]),
M(35,"Advanced Media Buying","Budget Reallocation","Move budget only when expected marginal value exceeds switching and learning costs.",["What is the opportunity cost of moving this budget?"],["reallocation memo"]),
M(35,"Advanced Media Buying","Media Risk Controls","Define stop-loss, anomaly alerts and rollback conditions before aggressive scaling.",["What downside limit protects the client?"],["media guardrails"]),

// Batch 36 — Experimentation & Incrementality
M(36,"Marketing Experimentation","Testable Hypothesis","Convert ideas into falsifiable hypotheses with primary metric and expected direction.",["What exact result would support or reject the hypothesis?"],["test hypothesis"]),
M(36,"Marketing Experimentation","Primary Metric Discipline","Choose one decision metric and predefine guardrail metrics to avoid metric shopping.",["Which metric decides the test?"],["metric charter"]),
M(36,"Marketing Experimentation","Randomization Logic","Prefer random assignment when feasible and document unit of randomization.",["What exactly is randomized?"],["randomization plan"]),
M(36,"Marketing Experimentation","Sample Sufficiency","Consider baseline rate, minimum detectable effect, variance and business cost before ending tests early.",["Is the test informative enough to act on?"],["sample sufficiency review"]),
M(36,"Marketing Experimentation","Holdout Design","Use geo, audience, customer or time holdouts to estimate incremental lift where appropriate.",["What untreated comparison can estimate lift?"],["holdout design"]),
M(36,"Marketing Experimentation","Novelty Effects","Separate short-lived novelty from durable improvement.",["Would this effect likely persist?"],["novelty check"]),
M(36,"Marketing Experimentation","Multiple Testing","Avoid declaring wins from many simultaneous comparisons without adjusting confidence.",["How many hypotheses were tested?"],["multiple-test review"]),
M(36,"Marketing Experimentation","Experiment Integrity","Check contamination, overlapping campaigns, sales intervention, stock and tracking changes.",["Was the test environment stable enough?"],["integrity audit"]),
M(36,"Marketing Experimentation","Business Significance","Statistical signal is not enough; quantify revenue, margin and operational significance.",["Is the effect large enough to matter?"],["business significance memo"]),
M(36,"Marketing Experimentation","Post-Test Inference","State what the experiment supports, what it does not prove and next test.",["What did we actually learn?"],["learning memo"]),
M(36,"Marketing Experimentation","Incrementality Ladder","Escalate evidence from observational to quasi-experimental to randomized when stakes justify it.",["What evidence level does this decision require?"],["evidence ladder"]),
M(36,"Marketing Experimentation","Experiment Registry","Store hypothesis, setup, result, decision and follow-up to prevent repeated failed tests.",["Have we tested this before?"],["experiment record"]),

// Batch 37 — Creative Director Intelligence
M(37,"Creative Director Intelligence","Creative Strategy","Start from audience tension, promise, proof and desired action before visual execution.",["What strategic job must this asset perform?"],["creative strategy"]),
M(37,"Creative Director Intelligence","Hook Engineering","Generate hooks across problem, curiosity, contrast, proof, demonstration and identity patterns.",["Does the first second earn attention from the right person?"],["hook matrix"]),
M(37,"Creative Director Intelligence","Visual Hierarchy","Control focal point, information order, whitespace, typography and contrast.",["Can the viewer understand the priority instantly?"],["hierarchy audit"]),
M(37,"Creative Director Intelligence","Brand Distinctiveness","Use recognizable assets without sacrificing clarity or performance.",["Would the asset still be identifiable without the logo?"],["distinctive asset review"]),
M(37,"Creative Director Intelligence","Message-Market Fit","Judge whether the message reflects a real customer tension and buying context.",["Does this message match a meaningful market truth?"],["message-market fit review"]),
M(37,"Creative Director Intelligence","Proof in Creative","Integrate demonstrations, testimonials, data or mechanisms into the creative itself.",["Where is the proof?"],["proof execution"]),
M(37,"Creative Director Intelligence","Format Native Design","Adapt pacing, framing and information density to Reels, TikTok, static, carousel, YouTube and landing contexts.",["Does this feel native to the placement?"],["format adaptation"]),
M(37,"Creative Director Intelligence","Creative Fatigue Cohorts","Track concept, hook, format and execution families instead of judging only individual ads.",["Which creative family is saturating?"],["creative cohort map"]),
M(37,"Creative Director Intelligence","Concept Diversification","Generate structurally different concepts, not just alternate headlines or colors.",["Would these concepts fail for different reasons?"],["concept portfolio"]),
M(37,"Creative Director Intelligence","Performance-Creative Loop","Use media results to update creative hypotheses without overfitting to noisy short windows.",["What did performance teach us about the concept?"],["creative learning loop"]),
M(37,"Creative Director Intelligence","Creative QA","Check fidelity, claims, readability, safe zones, CTA, brand and platform compliance.",["Is the asset ready to ship?"],["creative QA card"]),
M(37,"Creative Director Intelligence","Art Direction Brief","Translate strategy into scene, composition, talent, environment, lighting, styling and production notes.",["Can a creative team execute this without guessing?"],["art direction brief"]),

// Batch 38 — Market Research & Competitive Research Agent
M(38,"Market Research Agent","Research Question Design","Define decisions the research must inform before collecting data.",["What decision changes based on this research?"],["research brief"]),
M(38,"Market Research Agent","Source Hierarchy","Prioritize first-party, official, primary and current sources over summaries and unsupported claims.",["What is the strongest available source?"],["source hierarchy"]),
M(38,"Market Research Agent","Competitor Set","Separate direct, indirect, substitute and aspirational competitors.",["Who competes for the same customer job or budget?"],["competitor map"]),
M(38,"Market Research Agent","Offer Intelligence","Compare price, packaging, guarantees, proof, promotions and qualification.",["How are competitors reducing risk or increasing perceived value?"],["offer comparison"]),
M(38,"Market Research Agent","Message Mining","Extract recurring promises, pains, proof themes, category language and whitespace.",["What is everyone saying, and what is underused?"],["message landscape"]),
M(38,"Market Research Agent","Review Mining","Cluster customer reviews by desired outcome, complaint, objection, trigger and language.",["What customer language appears repeatedly?"],["review insight clusters"]),
M(38,"Market Research Agent","Trend Validation","Distinguish sustained trend, platform artifact, seasonal spike and anecdote using multiple signals.",["Is this trend durable and relevant?"],["trend confidence report"]),
M(38,"Market Research Agent","Market Sizing Discipline","Separate TAM, SAM and SOM and show assumptions rather than inventing precision.",["Which assumptions drive the estimate?"],["market sizing model"]),
M(38,"Market Research Agent","Share of Voice","Use comparable, clearly defined proxies when actual market share is unavailable.",["What does this proxy measure and not measure?"],["share-of-voice assessment"]),
M(38,"Market Research Agent","Research Citation Ledger","Every external factual claim carries source, date and confidence.",["Can this claim be traced?"],["citation ledger"]),
M(38,"Market Research Agent","Research Freshness","Flag stale sources when market conditions or platform rules can change quickly.",["Is this evidence current enough for the decision?"],["freshness audit"]),
M(38,"Market Research Agent","Insight-to-Action","Convert findings into implications, opportunities, risks and tests.",["So what should change because of this finding?"],["research action memo"]),

// Batch 39 — CRM, Lifecycle & Retention
M(39,"CRM Lifecycle Retention","Lifecycle Map","Model acquisition, activation, conversion, onboarding, repeat, expansion, referral and churn.",["Where is value created or lost after acquisition?"],["lifecycle map"]),
M(39,"CRM Lifecycle Retention","Lead Quality","Measure qualified rate, contact rate, opportunity rate and revenue per lead rather than CPL alone.",["Are cheaper leads economically better?"],["lead quality scorecard"]),
M(39,"CRM Lifecycle Retention","Speed-to-Lead","Treat response time and contact process as conversion variables.",["How quickly are high-intent leads contacted?"],["speed-to-lead audit"]),
M(39,"CRM Lifecycle Retention","Sales Handoff","Define ownership, SLA, required fields and feedback loop between marketing and sales.",["Where does accountability break at handoff?"],["handoff protocol"]),
M(39,"CRM Lifecycle Retention","Activation","Identify the earliest behavior correlated with durable customer value.",["What is the true activation event?"],["activation metric"]),
M(39,"CRM Lifecycle Retention","Cohort Retention","Compare retention by acquisition source, offer, segment and start period.",["Which cohorts retain and why?"],["retention cohort analysis"]),
M(39,"CRM Lifecycle Retention","Churn Diagnosis","Separate product, service, price, fit, expectation and operational causes.",["Why did valuable customers leave?"],["churn cause map"]),
M(39,"CRM Lifecycle Retention","Lifecycle Messaging","Trigger communication by customer state and behavior, not calendar spam.",["What message is useful at this lifecycle state?"],["lifecycle messaging plan"]),
M(39,"CRM Lifecycle Retention","Expansion Logic","Identify cross-sell and upsell only when they increase customer value and fit.",["What adjacent problem can we solve credibly?"],["expansion opportunity map"]),
M(39,"CRM Lifecycle Retention","LTV Quality","Use contribution-based, cohort-aware LTV assumptions with uncertainty ranges.",["What economics support this LTV?"],["LTV model"]),
M(39,"CRM Lifecycle Retention","Win-Back","Prioritize lapsed customers by reason, value and likelihood instead of broad discounts.",["Who is worth winning back and with what reason?"],["win-back plan"]),
M(39,"CRM Lifecycle Retention","Closed-Loop Learning","Feed sales and retention outcomes back into targeting, offer and creative decisions.",["What downstream outcome should update acquisition strategy?"],["closed-loop learning"]),

// Batch 40 — Marketing World Model & Forecasting
M(40,"Marketing World Model","State Representation","Maintain a current state for market, customer, competitors, offer, media, creative, sales, operations and economics.",["What is true now, and how certain are we?"],["marketing state model"]),
M(40,"Marketing World Model","Change Detection","Detect meaningful shifts in cost, demand, competitor behavior, creative response and conversion quality.",["What changed beyond normal variance?"],["change log"]),
M(40,"Marketing World Model","Driver Graph","Link external and internal drivers to funnel and business outcomes.",["Which variables propagate through the system?"],["driver graph"]),
M(40,"Marketing World Model","Scenario Forecast","Produce base, upside, downside and stress scenarios with explicit assumptions.",["Which assumptions separate scenarios?"],["scenario forecast"]),
M(40,"Marketing World Model","Forecast Calibration","Track prior forecasts against outcomes and recalibrate confidence.",["Were previous forecasts systematically optimistic or pessimistic?"],["calibration report"]),
M(40,"Marketing World Model","Leading Indicators","Identify early signals such as search demand, CTR quality, pipeline velocity, repeat rate or inventory risk.",["Which signal moves before the business outcome?"],["leading indicator set"]),
M(40,"Marketing World Model","Capacity Constraints","Include sales, fulfillment, inventory and service capacity in growth forecasts.",["Can operations absorb the projected demand?"],["capacity-adjusted forecast"]),
M(40,"Marketing World Model","Competitive Response","Model likely competitor reactions to pricing, promotions, positioning and channel moves.",["How might competitors respond if we act?"],["competitive response scenario"]),
M(40,"Marketing World Model","Economic Sensitivity","Stress CAC, conversion, margin, price and retention assumptions.",["Which assumption creates the largest swing in profit?"],["sensitivity analysis"]),
M(40,"Marketing World Model","Decision Thresholds","Tie actions to observed thresholds rather than one deterministic forecast.",["What signal triggers scale, hold or rollback?"],["decision thresholds"]),
M(40,"Marketing World Model","Forecast Freshness","Invalidate forecasts when material assumptions change.",["Which assumption has expired?"],["forecast freshness status"]),
M(40,"Marketing World Model","World Model Update","After every meaningful outcome, update state, drivers and confidence without rewriting history.",["What did the outcome teach the model?"],["world model update"]),

// Batch 41 — Autonomous CMO / Agency Brain
M(41,"Autonomous CMO Agency Brain","Executive Objective","Translate vague requests into business objective, constraint, time horizon and success metric.",["What business outcome are we actually optimizing?"],["executive objective"]),
M(41,"Autonomous CMO Agency Brain","Agency Diagnostic Sweep","Inspect market, offer, customer, funnel, media, creative, CRM, sales, operations and economics before prescribing.",["Which domain is the current binding constraint?"],["diagnostic sweep"]),
M(41,"Autonomous CMO Agency Brain","Research Planner","Decide what internal data, external research or tool calls are required before a high-stakes answer.",["What information has the highest expected value?"],["research plan"]),
M(41,"Autonomous CMO Agency Brain","Hypothesis Portfolio","Maintain competing explanations with confidence and evidence rather than one premature story.",["What are the top plausible explanations?"],["hypothesis portfolio"]),
M(41,"Autonomous CMO Agency Brain","Cross-Functional Council","Reconcile CEO, finance, growth, creative, sales, operations and customer perspectives into one recommendation.",["Which trade-offs matter across functions?"],["council synthesis"]),
M(41,"Autonomous CMO Agency Brain","Strategic Options","Generate multiple viable paths with expected value, downside, reversibility and resource requirement.",["What are the real alternatives?"],["strategic option set"]),
M(41,"Autonomous CMO Agency Brain","Decision Memo","Choose one recommendation and state why, confidence, assumptions, risks and evidence that would reverse it.",["Why this option now?"],["decision memo"]),
M(41,"Autonomous CMO Agency Brain","Execution Plan","Convert strategy into owners, deadlines, dependencies, deliverables, budget and success metrics.",["Who does what by when?"],["execution plan"]),
M(41,"Autonomous CMO Agency Brain","Operator Safety","High-risk money, production, security or external commitments require appropriate approval and verification.",["What requires human approval before execution?"],["approval map"]),
M(41,"Autonomous CMO Agency Brain","Monitoring Loop","Define leading indicators, review cadence, stop-loss and rollback before execution.",["How will we know quickly if the plan is wrong?"],["monitoring plan"]),
M(41,"Autonomous CMO Agency Brain","Learning Loop","Compare predicted versus actual result, classify error and update knowledge without benchmark gaming.",["What did reality invalidate?"],["learning update"]),
M(41,"Autonomous CMO Agency Brain","Stakeholder Communication","Translate the same decision into CEO, client, media buyer, creative, sales and finance language without changing facts.",["What does this stakeholder need to know and act on?"],["stakeholder brief"])
];

export const VIVITO_MARKETING_PARITY_DOCTRINE=`
VIVITO Marketing Parity Doctrine — Batches 32-41
1. Marketing diagnosis starts with business outcome, causal mechanisms and evidence, not channel superstition.
2. Every performance problem is traced across market, offer, audience, funnel, media, creative, CRM, sales, operations and economics.
3. Platform attribution is not treated as automatic incrementality; reconcile source definitions and counterfactuals.
4. Customer understanding uses JTBD, behavioral state, objections, risk, trust and context without demographic stereotyping.
5. Positioning connects ICP, category frame, differentiation, value proposition, offer, proof and message hierarchy.
6. Media decisions use marginal efficiency, budget elasticity, contribution economics, pacing and explicit scale/hold/cut/test rules.
7. Experiments use falsifiable hypotheses, primary metrics, integrity checks, business significance and learning records.
8. Creative work begins from strategy and message-market fit, then executes hooks, hierarchy, proof, brand and native format.
9. Research maintains source hierarchy, freshness, citation ledger, confidence and clear separation of fact from inference.
10. CRM closes the loop from acquisition to qualified lead, sales, retention, LTV and churn instead of optimizing CPL in isolation.
11. The marketing world model tracks current state, driver relationships, scenarios, leading indicators and forecast calibration.
12. The Autonomous CMO layer plans research, maintains competing hypotheses, convenes cross-functional perspectives, makes one decision, executes safely, monitors and learns.
13. Unknowns remain unknown. VIVITO never invents live data, competitor metrics, financial values, customer facts or experimental results.
14. Recommendations must be actionable: decision, rationale, evidence, confidence, owner, deadline, KPI, guardrails and reversal condition.
15. High-risk external writes, material spend changes, irreversible commitments and security-sensitive actions remain approval-gated.
`;

export const VIVITO_MARKETING_PARITY_CONTEXT=[
  VIVITO_MARKETING_PARITY_DOCTRINE,
  ...Array.from({length:10},(_,i)=>i+32).map(batch=>{
    const modules=VIVITO_MARKETING_PARITY_MODULES.filter(m=>m.batch===batch);
    const domain=modules[0]?.domain||`Batch ${batch}`;
    return `# MARKETING INTELLIGENCE — BATCH ${batch}: ${domain}\n`+modules.map((m,j)=>`## ${batch}.${String(j+1).padStart(2,"0")} — ${m.name}\nPrinciple: ${m.principle}\nChecks:\n${m.checks.map(q=>`- ${q}`).join("\n")}\nOutputs: ${m.outputs.join(", ")}`).join("\n\n");
  })
].join("\n\n");
