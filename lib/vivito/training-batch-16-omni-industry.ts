export type VivitoOmniIndustryModule={domain:string;scenario:string;principles:string[];outputs:string[]};
const M=(domain:string,scenario:string,principles:string[],outputs:string[]=[]):VivitoOmniIndustryModule=>({domain,scenario,principles,outputs});

export const VIVITO_OMNI_INDUSTRY_MASTERY:VivitoOmniIndustryModule[]=[
// Hospitality & F&B
M("Hospitality & F&B","Restaurant growth",["Separate footfall, delivery, dine-in, repeat rate and contribution margin.","Use daypart, catchment, menu mix, ratings, delivery-app economics and capacity before scaling media.","CPL/ROAS alone cannot prove restaurant profitability."],["30-day growth plan","channel budget","KPI tree"]),
M("Hospitality & F&B","Hotel demand",["Use occupancy, ADR, RevPAR, booking window, source market, length of stay and cancellation rate.","Separate direct, OTA, corporate and group demand economics.","Creative should sell stay occasion, location and proof, not generic luxury adjectives."],["hotel media plan","RevPAR dashboard"]),
M("Hospitality & F&B","Menu engineering",["Classify items by popularity and contribution margin.","Promotions should protect kitchen capacity and margin.","Bundle strategy must consider attach rate and cannibalization."],["menu matrix","offer plan"]),
M("Hospitality & F&B","Local demand",["Build geo catchments from travel time, offices, homes, universities, malls and delivery radius.","Use evidence-based local personas, not stereotypes."],["catchment map","local persona set"]),
// Ecommerce & DTC
M("Ecommerce & DTC","Profitable scale",["Scale on contribution margin after COGS, fulfillment, payment fees, returns and discounts.","Track new vs returning customer economics.","Inventory and operational capacity constrain media scale."],["unit economics model","scale rules"]),
M("Ecommerce & DTC","Merchandising",["Use product velocity, stock depth, margin, attach rate and seasonality.","Do not push traffic to unavailable or low-margin SKUs."],["merchandising matrix"]),
M("Ecommerce & DTC","Retention",["Use cohorts, repeat rate, purchase interval, churn risk and contribution LTV.","Email/SMS/WhatsApp lifecycle must be permission-aware and value-led."],["retention map","cohort dashboard"]),
M("Ecommerce & DTC","Promotions",["Model incremental volume required to offset discount depth.","Test bundles, thresholds and gifts against margin and AOV, not only conversion rate."],["promotion scenario model"]),
// B2B / Enterprise
M("B2B & Enterprise","ABM",["Define ICP, buying committee, account triggers and value hypothesis.","Coordinate marketing, SDR, sales and executive outreach.","Measure pipeline, influenced revenue and cycle velocity, not MQL count alone."],["ABM plan","account scoring model"]),
M("B2B & Enterprise","Long sales cycle",["Separate awareness, engaged account, meeting, opportunity, proposal, negotiation and closed-won.","Use CRM stage evidence and aging."],["pipeline dashboard"]),
M("B2B & Enterprise","Enterprise content",["Use proof, case studies, ROI logic, technical credibility and stakeholder-specific messaging.","Do not overclaim implementation outcomes."],["content map","case-study blueprint"]),
M("B2B & Enterprise","LinkedIn",["Optimize toward qualified commercial outcomes when possible.","Match creative to role, seniority, pain and buying stage while respecting platform policy."],["LinkedIn media plan"]),
// Luxury
M("Luxury & Premium","Positioning",["Premium is not a color palette; it is product truth, scarcity, service, symbolic value and consistency.","Avoid discount-led erosion unless strategically justified."],["luxury positioning map"]),
M("Luxury & Premium","Creative system",["Use restraint, craft, materiality, editorial hierarchy and distinctive brand codes.","Proof and provenance matter more than excessive claims."],["visual direction","brand-code checklist"]),
M("Luxury & Premium","High-ticket leads",["Optimize for qualified appointments and close value, not cheap leads.","Human follow-up quality is part of marketing performance."],["high-ticket funnel"]),
M("Luxury & Premium","Affluent research",["Use observable behavior, category participation, geography and first-party evidence without sensitive profiling."],["affluent persona framework"]),
// Automotive
M("Automotive","Dealer funnel",["Track model interest, finance eligibility, test drive, showroom visit, quote, booking and delivery.","Separate new car, used car, aftersales and finance economics."],["dealer funnel","lead scoring"]),
M("Automotive","Aftersales",["Use service interval, retention, workshop capacity and lifetime value.","Local radius and CRM reactivation often outperform broad reach."],["aftersales plan"]),
M("Automotive","PPF/detailing",["Sell proof, process, warranty, material quality and installer trust.","Model car value and owner intent affect persona and creative."],["content pillars","media plan"]),
M("Automotive","Model launch",["Stage teaser, reveal, proof, comparison, test-drive and conversion phases.","Allocate media by inventory, margin and demand signals."],["launch plan"]),
// Education
M("Education","Course enrollment",["Track lead, counseling, application, payment, attendance, completion and referral.","CPL is weak if enrollment quality or completion collapses."],["enrollment funnel"]),
M("Education","Webinar funnel",["Measure registration, show rate, engagement, application and paid conversion.","Use urgency only when factual."],["webinar plan"]),
M("Education","Instructor brand",["Build authority through teaching quality, proof, clarity and outcomes with evidence.","Avoid guaranteed career claims."],["authority content plan"]),
M("Education","Cohort economics",["Model acquisition cost, instructor cost, platform cost, support load, refunds and completion."],["cohort P&L"]),
// Beauty/Cosmetics
M("Beauty & Cosmetics","Product launch",["Sequence problem, ingredient/feature proof, texture/use, UGC, objection handling and offer.","Claims must match substantiation and regulation."],["launch calendar"]),
M("Beauty & Cosmetics","UGC",["Brief creators on hook, demonstration, honest experience and disclosure.","Do not script fabricated personal results."],["UGC brief"]),
M("Beauty & Cosmetics","Repeat purchase",["Use replenishment interval, routine bundling, cohort repeat and contribution LTV."],["retention plan"]),
M("Beauty & Cosmetics","Retail + ecommerce",["Unify sell-in, sell-through, store availability and digital demand signals."],["omnichannel dashboard"]),
// SaaS/Tech
M("SaaS & Tech","PLG",["Track visit, signup, activation, habit, expansion and paid conversion.","Activation must represent delivered value, not arbitrary clicks."],["activation model"]),
M("SaaS & Tech","Enterprise SaaS",["Model ICP, security/procurement stakeholders, pilot, legal, implementation and expansion.","Marketing must connect to pipeline and ARR."],["enterprise funnel"]),
M("SaaS & Tech","Economics",["Use MRR/ARR, gross margin, CAC payback, logo churn, revenue churn, NRR and expansion.","Growth with poor retention can destroy value."],["SaaS KPI dashboard"]),
M("SaaS & Tech","Onboarding",["Diagnose time-to-value, friction, education and lifecycle triggers.","Do not compensate for broken onboarding with more acquisition."],["onboarding journey"]),
// Brand Strategy
M("Brand Strategy","Architecture",["Choose branded house, house of brands or endorsed structure based on customer clarity, economics and strategic fit."],["brand architecture"]),
M("Brand Strategy","Distinctive assets",["Track recognition of colors, shapes, sonic/verbal cues and symbols independently from generic category codes."],["asset audit"]),
M("Brand Strategy","Brand tracking",["Measure awareness, consideration, preference, salience, associations and behavior over time.","Separate brand metrics from short-term sales attribution."],["brand tracker"]),
M("Brand Strategy","Naming",["Evaluate memorability, pronunciation, strategic fit, extensibility, linguistic risk and legal availability before recommendation."],["naming scorecard"]),
// Behavioral Economics
M("Behavioral Economics","Choice architecture",["Reduce unnecessary friction, organize choices and clarify tradeoffs without dark patterns."],["choice audit"]),
M("Behavioral Economics","Framing",["Test equivalent truthful frames; never distort material terms."],["message test"]),
M("Behavioral Economics","Social proof",["Use authentic, attributable proof; avoid fabricated scarcity or testimonials."],["proof library"]),
M("Behavioral Economics","Loss aversion",["Use carefully and ethically; never exploit fear or vulnerable states."],["ethical persuasion checklist"]),
// Pricing Science
M("Pricing Science","Elasticity",["Estimate response to price changes using experiments or historical variation while controlling confounds.","Do not infer elasticity from one promotion."],["elasticity model"]),
M("Pricing Science","Willingness to pay",["Use surveys, conjoint/choice methods, interviews and transaction evidence; acknowledge bias."],["WTP study"]),
M("Pricing Science","Price ladder",["Design good-better-best tiers around value and margin, not arbitrary feature counts."],["price architecture"]),
M("Pricing Science","Revenue management",["Use capacity, perishability, demand timing and segment willingness-to-pay while maintaining fairness and compliance."],["revenue plan"]),
// Advanced Analytics
M("Advanced Analytics","Cohorts",["Cohort by acquisition date/source/product/persona to separate mix shifts from real improvement."],["cohort workbook"]),
M("Advanced Analytics","MMM",["Use sufficient historical variation and control variables; communicate uncertainty and avoid treating modeled contribution as exact truth."],["MMM brief"]),
M("Advanced Analytics","Forecasting",["Use base/upside/downside scenarios, seasonality, confidence ranges and explicit assumptions."],["forecast model"]),
M("Advanced Analytics","Anomaly detection",["Validate tracking, seasonality, promos, outages and mix before declaring causal root cause."],["anomaly report"]),
// Experimentation
M("Experimentation","A/B testing",["Define primary metric, hypothesis, sample, duration and stopping rule before reading results.","Avoid peeking-driven false positives."],["test plan"]),
M("Experimentation","Holdouts",["Use control groups when feasible to estimate incrementality beyond attribution."],["holdout design"]),
M("Experimentation","Geo experiments",["Match markets on baseline behavior and account for spillover, seasonality and local shocks."],["geo test design"]),
M("Experimentation","Managerial significance",["A statistically detectable effect may still be economically irrelevant; quantify value and implementation cost."],["decision memo"]),
// SEO/AEO/AI Search
M("SEO, AEO & AI Search","Technical SEO",["Audit crawlability, indexation, rendering, canonicals, structured data, performance and internal linking before content volume."],["technical audit"]),
M("SEO, AEO & AI Search","Topical authority",["Build useful topic clusters around customer questions and evidence, avoiding thin programmatic duplication."],["content cluster"]),
M("SEO, AEO & AI Search","Local SEO",["Use accurate business data, reviews, local pages, services and location relevance without spam."],["local SEO plan"]),
M("SEO, AEO & AI Search","AI answer visibility",["Create clear, sourceable, structured factual content and monitor how brand/entity information is represented; do not promise ranking in AI answers."],["AEO checklist"]),
// Influencer & Creator
M("Influencer & Creator","Selection",["Score audience fit, content quality, authenticity, geography, brand safety, historical performance and cost."],["creator scorecard"]),
M("Influencer & Creator","Economics",["Compare CPM/CPE/CPA plus content usage value and incremental lift where measurable."],["creator ROI sheet"]),
M("Influencer & Creator","Fraud",["Check suspicious follower growth, engagement distribution, audience geography and repeated low-quality comments."],["fraud checklist"]),
M("Influencer & Creator","Rights",["Define usage period, channels, paid amplification, edits, exclusivity and disclosure obligations before launch."],["rights brief"]),
// PR & Crisis
M("PR & Crisis","Issue triage",["Separate routine complaint, emerging issue and true crisis by harm, velocity, reach and stakeholder impact."],["crisis matrix"]),
M("PR & Crisis","Holding statement",["Acknowledge verified facts, avoid speculation, define next update and responsible owner."],["holding statement"]),
M("PR & Crisis","Monitoring",["Track volume, velocity, themes, credible sources and stakeholder groups, not sentiment score alone."],["issue dashboard"]),
M("PR & Crisis","Recovery",["Post-crisis plan needs corrective action, proof, stakeholder communication and measurement of trust recovery."],["recovery plan"]),
// CX / Retention
M("Customer Experience & Retention","Churn",["Segment voluntary/involuntary churn and root causes by cohort, product, channel and service experience."],["churn analysis"]),
M("Customer Experience & Retention","NPS/CSAT",["Use as directional experience signals, connect to behavior, complaints and retention; avoid treating one survey score as truth."],["CX dashboard"]),
M("Customer Experience & Retention","Service recovery",["Prioritize speed, ownership, fair resolution and learning loop."],["service recovery playbook"]),
M("Customer Experience & Retention","Referral",["Design referral incentives around genuine advocacy, economics and abuse controls."],["referral model"]),
// GCC / International
M("GCC & International","Market entry",["Assess category demand, regulation, language, purchasing power, channels, competition and operational readiness before media launch."],["market-entry scorecard"]),
M("GCC & International","Localization",["Adapt language, offers, cultural cues, service expectations and calendar; translation alone is insufficient."],["localization brief"]),
M("GCC & International","Saudi/UAE",["Use current local data and platform behavior; never generalize one GCC market to another."],["country comparison"]),
M("GCC & International","Cross-border",["Account for currency, logistics, payment methods, duties, returns and customer support in economics."],["cross-border P&L"]),
// RFP/Tenders/Proposals
M("RFP, Tenders & Proposals","RFP analysis",["Extract mandatory requirements, scoring criteria, deadlines, dependencies, compliance items and evidence gaps before writing."],["RFP compliance matrix"]),
M("RFP, Tenders & Proposals","Win strategy",["Map buyer priorities, differentiators, proof, risk reduction and commercial tradeoffs."],["win themes"]),
M("RFP, Tenders & Proposals","Proposal",["Mirror evaluation structure, answer requirements directly, quantify value, state assumptions and avoid unsupported claims."],["proposal outline"]),
M("RFP, Tenders & Proposals","Commercial response",["Model scope, staffing, utilization, margin, contingency and change-control before pricing."],["commercial model"]),
// Marketing Finance
M("Marketing Finance","Budget planning",["Allocate from business objective, marginal return, capacity and risk; last year's percentages are not strategy."],["budget model"]),
M("Marketing Finance","P&L linkage",["Connect spend to gross profit/contribution, not revenue or ROAS alone."],["marketing P&L"]),
M("Marketing Finance","Scenario planning",["Create base/upside/downside with explicit assumptions and leading indicators."],["scenario workbook"]),
M("Marketing Finance","Client profitability",["Include labor, revisions, media operations, tools, pass-through costs and payment risk."],["client profitability sheet"]),
// Leadership / Agency Management
M("Leadership & Agency Management","Capacity planning",["Plan workload by effort, skill, deadline and utilization, not task count."],["capacity model"]),
M("Leadership & Agency Management","Hiring",["Define role outcomes, competency evidence, structured interviews and ramp economics."],["hiring scorecard"]),
M("Leadership & Agency Management","Performance management",["Use clear expectations, observable behavior, outcomes, coaching and documented follow-up."],["review framework"]),
M("Leadership & Agency Management","Agency operating system",["Link sales pipeline, staffing, delivery capacity, client health, utilization, cash and profitability in one operating cadence."],["agency dashboard","weekly operating review"]),
// Integrated synthesis
M("Integrated Executive Synthesis","Cross-industry transfer",["Transfer principles, not tactics. Validate whether category economics, regulation, purchase cycle and channel behavior are comparable before borrowing playbooks."],["transferability check"]),
M("Integrated Executive Synthesis","Evidence hierarchy",["Prefer first-party commercial truth, verified platform data, authoritative external evidence and controlled experiments over anecdotes.","Label fact, inference, assumption and recommendation separately."],["evidence ledger"]),
M("Integrated Executive Synthesis","Decision quality",["State objective, options, expected value, downside, reversibility, confidence and next evidence needed.","Correct prior advice when stronger evidence arrives."],["decision memo"]),
M("Integrated Executive Synthesis","Artifact quality",["Every strategy, PDF, deck or workbook must pass content, evidence, math, visual, narrative and usability QA before being called final."],["final QA checklist"]),
];

export const VIVITO_OMNI_INDUSTRY_DOCTRINE=`
OMNI-INDUSTRY OPERATING DOCTRINE
1. Never confuse channel skill with business strategy.
2. Diagnose category economics, customer decision cycle, regulation, operational capacity and measurement before selecting tactics.
3. Transfer principles across industries only after checking structural similarity.
4. For every plan connect: Business Objective -> Customer/ICP -> Value Proposition -> Funnel -> Channels -> Creative/Content -> Sales/Operations -> Economics -> Measurement -> Learning Loop.
5. Prefer qualified commercial outcomes over vanity metrics.
6. Never optimize a broken funnel merely by buying more traffic.
7. Never fabricate market data, customer behavior, competitor metrics, testimonials, legal eligibility or platform policy.
8. For current platform rules, regulations, prices, market facts or benchmarks, research current authoritative sources before advising.
9. Separate FACT / INFERENCE / ASSUMPTION / RECOMMENDATION and state confidence where uncertainty matters.
10. High-impact decisions require scenario analysis, downside review and an explicit measurement plan.
11. Ethical persuasion only: no dark patterns, fabricated scarcity, fake social proof, discriminatory targeting or exploitative manipulation.
12. Executive outputs must be commercially useful: show economics, priorities, owners, timing, dependencies and measurable next actions.
`;

export const VIVITO_TRAINING_BATCH_16_CONTEXT=[VIVITO_OMNI_INDUSTRY_DOCTRINE,...VIVITO_OMNI_INDUSTRY_MASTERY.map((m,i)=>`## O${String(i+1).padStart(3,"0")} — ${m.domain}\nScenario: ${m.scenario}\nPrinciples:\n${m.principles.map(x=>`- ${x}`).join("\n")}\nOutputs: ${m.outputs.join(", ")||"decision + action plan"}`)].join("\n\n");
