export type VivitoDeckBlueprint={
  id:string;
  title:string;
  purpose:string;
  recommendedSlides:number;
  sections:string[];
  mustInclude:string[];
};

export const VIVITO_DELIVERABLE_BLUEPRINTS:VivitoDeckBlueprint[]=[
{
 id:"strategy",title:"Business / Brand Strategy Deck",purpose:"Turn research and diagnosis into a defendable strategic choice and execution roadmap.",recommendedSlides:18,
 sections:["Cover","Executive Summary","Business Context","Problem Definition","Market Landscape","Customer Segments","Competitor Map","SWOT","PESTEL","Strategic Diagnosis","Strategic Choices","Positioning / Value Proposition","Growth Priorities","Operating Model Implications","90-Day Roadmap","12-Month Roadmap","KPIs","Risks & Assumptions","Sources / Appendix"],
 mustInclude:["clear decision","evidence","trade-offs","what not to do","owners","KPIs","sources"]
},
{
 id:"marketing-plan",title:"Integrated Marketing Plan",purpose:"Translate business goals into customer strategy, channel strategy, content, campaigns, budget and measurement.",recommendedSlides:22,
 sections:["Cover","Executive Summary","Business Objectives","Marketing Objectives","Situation Analysis","Market / Category","Audience Segmentation","Personas / Jobs","Customer Journey","SWOT","PESTEL","Competitors","STP","Value Proposition","Brand / Message Architecture","Channel Roles","Content Pillars","Campaign Architecture","Funnel Plan","Budget Allocation","Measurement Framework","Timeline","Risks","Sources"],
 mustInclude:["SMART objectives","STP","customer journey","7Ps or relevant mix","funnel logic","budget","KPIs","timeline"]
},
{
 id:"media-buying",title:"Media Buying Plan",purpose:"Build a financially grounded paid-media plan linked to business outcomes rather than vanity metrics.",recommendedSlides:18,
 sections:["Cover","Objectives","Business Economics","Historical Performance","Audience / Geo","Funnel Architecture","Platform Roles","Campaign Architecture","Meta Plan","Google Plan","TikTok / LinkedIn / Other","Creative Testing Matrix","Budget by Channel","Budget by Funnel Stage","Forecast Scenarios","Optimization Rules","Measurement & Tracking","Reporting Cadence","Risks & Stop-Loss","Sources"],
 mustInclude:["primary result definitions","budget split","forecast assumptions","CPA/CPL/ROAS targets","creative testing","tracking validation","stop-loss rules"]
},
{
 id:"market-research",title:"Full Marketing Research Report",purpose:"Produce evidence-based market, customer, competitor and category insight that supports a business decision.",recommendedSlides:25,
 sections:["Cover","Research Question","Decision Context","Methodology","Source Hierarchy","Market Definition","Market Size / Growth","Macro Environment","PESTEL","Category Trends","Customer Segments","Needs / Jobs","Survey / Interview Findings","Behavioral Insights","Competitor Landscape","Positioning Map","Pricing / Offer Benchmarks","Channel Landscape","Digital Share of Voice","SWOT","Key Insights","Implications","Strategic Opportunities","Recommendations","Limitations","Sources / Appendix"],
 mustInclude:["methodology","source dates","sample / scope","triangulation","limitations","facts vs inference","citations"]
},
{
 id:"swot-pestel",title:"SWOT + PESTEL Strategic Assessment",purpose:"Convert internal and external evidence into prioritized strategic implications, not generic lists.",recommendedSlides:12,
 sections:["Cover","Executive Summary","Business Context","PESTEL Overview","Political / Legal","Economic","Social","Technology","Environmental","Internal Strengths / Weaknesses","External Opportunities / Threats","TOWS Priorities","Risks","Actions","Sources"],
 mustInclude:["evidence per factor","impact","likelihood","time horizon","TOWS conversion","prioritized actions"]
}
];

export const VIVITO_DELIVERABLE_DESIGN_DOCTRINE=`
VIVITO DELIVERABLE DESIGN DOCTRINE
1. Every deck is a decision narrative, not a document dump. Each slide answers one question and has one clear takeaway.
2. Use assertion-style slide titles where possible: the title states the conclusion, and the body proves it.
3. Prefer visual evidence over paragraphs: charts, matrices, maps, timelines, funnels, scorecards, comparison tables and annotated diagrams.
4. One dominant visual hierarchy per slide. Avoid equal-weight boxes everywhere.
5. Use whitespace deliberately. Do not fill every area. Premium design usually has fewer, stronger elements.
6. Build a coherent visual system: consistent grid, margins, type scale, icon style, image treatment, chart style and spacing.
7. Use brand colors as accents, not as background on every slide. Preserve contrast and accessibility.
8. Minimum hierarchy: eyebrow/context, strong title, evidence, takeaway/implication. Footnotes and sources stay visually secondary.
9. Charts must show a reason to exist. Highlight the decision-relevant series; remove decorative gridlines and redundant legends.
10. Tables must be edited, ranked and visually prioritized. Do not paste raw spreadsheets.
11. SWOT and PESTEL must show implications and priority; never output generic dictionary definitions.
12. Every research-based slide distinguishes FACT, INFERENCE and RECOMMENDATION when ambiguity matters.
13. Every numerical claim must carry period, geography, unit and source when available.
14. Use a Sources / Methodology appendix for traceability; never fabricate a citation.
15. For executive audiences, lead with answer first, then evidence. For workshop decks, allow more diagnostic detail.
16. PDF export must preserve page boundaries, readable text, source footnotes and no clipped elements.
17. Presentation export must preserve editability of text/charts where possible and avoid image-only slides unless intentionally visual.
18. Final QA checks every slide for overflow, alignment, contrast, spelling, duplicated insights, unsupported claims and broken narrative flow.
`;

export function getVivitoDeckBlueprint(id:string){return VIVITO_DELIVERABLE_BLUEPRINTS.find(x=>x.id===id)||null}
export const VIVITO_DELIVERABLE_BLUEPRINTS_CONTEXT=VIVITO_DELIVERABLE_BLUEPRINTS.map(x=>`## ${x.title}\nPurpose: ${x.purpose}\nRecommended slides: ${x.recommendedSlides}\nSections: ${x.sections.join(" > ")}\nMust include: ${x.mustInclude.join(", ")}`).join("\n\n");