export type VivitoDeliverableLesson={domain:string;principles:string[];workflow:string[];qualityBar:string[];sources:string[]};

export const VIVITO_TRAINING_BATCH_09:VivitoDeliverableLesson[]=[
{
 domain:"Deliverable Architecture",
 principles:["Start from the decision the client or executive must make","Separate research, diagnosis, strategy, plan and execution","Build the storyline before designing slides","Every slide must earn its place in the narrative"],
 workflow:["Define audience and decision","Define deliverable type and scope","Build research plan","Create slide outline","Write slide assertions","Select evidence and visuals","Design","QA","Export"],
 qualityBar:["No filler slides","No duplicated insights","One main takeaway per slide","Executive summary can stand alone"],
 sources:["VIVITO design doctrine","MBA/DBA operating doctrine"]
},
{
 domain:"Marketing Research",
 principles:["Research begins with a decision question, not a Google search","Use a source hierarchy: official/primary > audited/first-party > reputable research > expert commentary > community signals","Triangulate important claims","State geography, period, population and methodology","Distinguish observation, inference and recommendation"],
 workflow:["Define research question","Set scope and market definition","Build hypothesis tree","Desk research","Primary research if needed","Competitor research","Customer research","Size/opportunity analysis","Synthesis","Limitations","Recommendations"],
 qualityBar:["No unsourced market size","No invented competitor data","No fake survey respondents","Every major conclusion has evidence or is labelled hypothesis"],
 sources:["ICC/ESOMAR International Code 2025","Pew Research Center survey methodology","DBA research methods"]
},
{
 domain:"Desk Research & Source Quality",
 principles:["Prefer the most recent relevant source but do not trade authority for recency blindly","Check publication date and underlying data period separately","Use original sources instead of articles quoting them when possible","Record conflicts between sources instead of averaging them blindly"],
 workflow:["Collect sources","Classify authority","Capture date/market/sample","Extract factual claims","Cross-check","Mark uncertainty","Create citation ledger"],
 qualityBar:["Traceable citations","No circular sourcing","No source laundering","Conflicts explained"],
 sources:["DBA critical appraisal","VIVITO evidence hierarchy"]
},
{
 domain:"Primary Research — Surveys",
 principles:["Questions must be clear, neutral and single-concept","Avoid leading and double-barrelled questions","Question order can bias answers","Pretest new questionnaires","Use sampling limits honestly"],
 workflow:["Define constructs","Choose population/sample","Draft questionnaire","Pretest","Field","Clean","Weight if justified","Analyze","Report wording and limitations"],
 qualityBar:["No fake representativeness","Exact wording retained for important measures","Sample size and method disclosed","Confidence/uncertainty stated appropriately"],
 sources:["Pew Research Center — Writing Survey Questions","ICC/ESOMAR Code 2025"]
},
{
 domain:"Primary Research — Interviews & Focus Groups",
 principles:["Use qualitative research for motivations, language, mechanisms and unmet needs","Do not convert a handful of interviews into population percentages","Seek disconfirming evidence and edge cases","Separate participant words from analyst interpretation"],
 workflow:["Recruit relevant participants","Prepare discussion guide","Conduct","Code themes","Compare cases","Extract verbatims carefully","Triangulate with behavioral/quantitative evidence"],
 qualityBar:["No fabricated quotes","No prevalence claims from qualitative samples","Clear participant profile and limitations"],
 sources:["DBA qualitative methods","ICC/ESOMAR Code 2025"]
},
{
 domain:"Market Sizing",
 principles:["Define the market before sizing it","Use top-down and bottom-up where possible","TAM is not automatically reachable revenue","SAM and SOM require constraints such as geography, segment, channel and capacity"],
 workflow:["Define unit","Choose top-down sources","Build bottom-up drivers","Reconcile","Create TAM/SAM/SOM","Sensitivity scenarios"],
 qualityBar:["Assumptions visible","No false precision","Scenario ranges preferred when inputs are uncertain"],
 sources:["MBA strategy/finance synthesis","DBA uncertainty discipline"]
},
{
 domain:"Competitor Research",
 principles:["Compare relevant competitors by customer job and value proposition, not just Instagram aesthetics","Separate direct, indirect and substitute competitors","Track offer, pricing, positioning, proof, channels, distribution, product/service model and customer experience","Do not infer financial performance from social activity"],
 workflow:["Define competitor set","Create comparison dimensions","Collect public evidence","Score only observable attributes","Map positioning","Identify white spaces","Validate strategic relevance"],
 qualityBar:["Evidence links retained","No invented sales/share","No generic competitor table without implications"],
 sources:["MBA strategy","Marketing management"]
},
{
 domain:"PESTEL",
 principles:["PESTEL is an external-environment scan, not six paragraphs of definitions","Each factor must connect to business impact","Rank by impact, likelihood and time horizon","Separate current fact from future scenario"],
 workflow:["Political","Economic","Social","Technological","Environmental","Legal","Score impact/likelihood","Translate to opportunities/threats","Link to strategic actions"],
 qualityBar:["Relevant factors only","Evidence per material factor","Priority visible","No generic boilerplate"],
 sources:["MBA strategy/macroeconomics"]
},
{
 domain:"SWOT & TOWS",
 principles:["Strengths/weaknesses must be internal and evidenced","Opportunities/threats must be external","A SWOT list is not a strategy","Use TOWS to convert evidence into choices"],
 workflow:["Collect internal evidence","Collect external evidence","Prioritize SWOT","Build SO/ST/WO/WT options","Rank by impact/feasibility","Select actions"],
 qualityBar:["No vague strengths like good quality without proof","No duplicated item across quadrants","Every priority links to an action"],
 sources:["MBA strategy"]
},
{
 domain:"STP & Customer Strategy",
 principles:["Segment on meaningful differences in need, economics or behavior","Target based on attractiveness and ability to win","Positioning is a choice in the customer's mind relative to alternatives","Personas are not fictional biographies"],
 workflow:["Segment","Size/score segments","Choose targets","Define job/need","Map alternatives","Write positioning","Validate message-market fit"],
 qualityBar:["Segments are actionable","Target rationale quantified where possible","Positioning is specific and differentiated"],
 sources:["HBS/Wharton marketing curriculum","MBA Marketing Management"]
},
{
 domain:"Marketing Plan",
 principles:["Start from business objectives","Convert to measurable marketing objectives","Use STP before channels","Integrate brand, performance, lifecycle and customer experience","Define owners, budget and measurement"],
 workflow:["Situation analysis","Objectives","Audience","Positioning","Marketing mix/7Ps when relevant","Journey/funnel","Channel roles","Content/campaign plan","Budget","KPIs","Calendar","Risks"],
 qualityBar:["Objectives are measurable","Channels have distinct jobs","Budget follows strategy","Plan includes execution cadence"],
 sources:["MBA marketing curriculum","VIVITO marketing blueprint"]
},
{
 domain:"Media Buying Plan",
 principles:["Paid media serves business economics","Define the primary result per campaign type","Forecasts are scenarios, not promises","Budget allocation follows marginal opportunity and funnel needs","Tracking must be validated before aggressive optimization"],
 workflow:["Business economics","Historical baseline","Objectives","Audience","Platform roles","Campaign architecture","Creative testing","Budget split","Forecast scenarios","Optimization rules","Measurement","Reporting"],
 qualityBar:["No blended CPR across incompatible results","Assumptions shown","Base/upside/downside forecast","Stop-loss and scale rules included"],
 sources:["VIVITO media intelligence","Google/Meta/TikTok/LinkedIn official guidance"]
},
{
 domain:"Strategic Storytelling",
 principles:["Use answer-first communication for executives","A storyline should move from context to tension to insight to choice to action","Slide titles should state conclusions rather than topics where evidence allows","Appendix holds depth; core deck holds decisions"],
 workflow:["Write one-sentence thesis","Create 5-7 chapter storyline","Write assertion titles","Attach evidence","Create transitions","Build executive summary last"],
 qualityBar:["Deck can be understood from titles alone","No title such as SWOT Analysis when a conclusion is available","Recommendations logically follow evidence"],
 sources:["MBA executive communication","VIVITO design doctrine"]
},
{
 domain:"Slide Design System",
 principles:["Design for hierarchy and comprehension, not decoration","Use a repeatable grid and spacing system","Use one dominant visual per slide","Use brand colors selectively","Keep source footnotes readable but secondary","Never stretch logos or distort images"],
 workflow:["Set canvas","Set grid/margins","Define typography scale","Define palette","Define chart/table style","Define image treatment","Create slide archetypes","Apply consistently"],
 qualityBar:["Pixel-consistent alignment","Readable at presentation distance","Strong whitespace","No crowded cards","No random icon styles"],
 sources:["Graphic design hierarchy principles","VIVITO design doctrine"]
},
{
 domain:"Charts & Data Visualization",
 principles:["Choose chart by analytical question","Bar for comparison, line for time, scatter for relationship, waterfall for bridge, funnel for staged conversion when appropriate","Highlight the insight and mute context","Do not use 3D charts","Do not manipulate axes deceptively"],
 workflow:["Define question","Choose chart","Clean data","Annotate key point","Add source/period/unit","Check scale"],
 qualityBar:["Chart title states insight","Units visible","No redundant legend","Decision-relevant series emphasized"],
 sources:["Business analytics","VIVITO design doctrine"]
},
{
 domain:"Tables, Matrices & Framework Slides",
 principles:["Edit raw tables into decision tools","Sort/rank where possible","Use heatmaps/icons sparingly to reveal patterns","Frameworks must carry evidence and implications","Do not fill a 2x2 because a framework demands four boxes"],
 workflow:["Choose dimensions","Reduce columns","Rank","Highlight","Add implication","Link to action"],
 qualityBar:["Can be read quickly","No spreadsheet dump","No decorative frameworks without decision value"],
 sources:["MBA communication","VIVITO design doctrine"]
},
{
 domain:"Visual Direction & Art",
 principles:["Choose a visual concept that matches brand/category and strategic story","Use real brand/product/customer imagery when available","Avoid generic AI-looking stock compositions","Create visual rhythm across the deck: hero, data, framework, image-led, roadmap","Use image generation only where it adds meaning and clearly does not pretend to be factual evidence"],
 workflow:["Collect brand assets","Set moodboard direction","Define image rules","Map slide archetypes","Create/curate visuals","Check consistency"],
 qualityBar:["Premium and brand-specific","No visual repetition","No fake documentary imagery used as research evidence","No illegible text over imagery"],
 sources:["VIVITO creative intelligence","Graphic design principles"]
},
{
 domain:"PDF & Presentation Export QA",
 principles:["The file is not finished when content is generated","PDF must preserve page boundaries and typography","Presentation must preserve editable text and charts where supported","Every export requires visual QA"],
 workflow:["Render all pages/slides","Check clipping","Check missing fonts/assets","Check source footnotes","Check links","Check image resolution","Check page order","Check file metadata/name","Final proofread"],
 qualityBar:["Zero clipped text","Zero overflow","No missing assets","No broken links","Consistent page numbers","Professional filename"] ,
 sources:["VIVITO deliverable design doctrine"]
},
{
 domain:"Citation & Evidence Ledger",
 principles:["Every factual market claim should be traceable","Keep source URL/title/publisher/date/data-period/geography","Use primary sources where available","Do not fabricate citations when browsing is unavailable"],
 workflow:["Capture source","Attach claim IDs","Map claims to slides","Add footnotes","Create source appendix","Flag stale/weak evidence"],
 qualityBar:["No orphan claims","No citation that does not support the sentence","Material limitations disclosed"],
 sources:["ICC/ESOMAR Code 2025","DBA critical appraisal"]
},
{
 domain:"Final Strategic QA",
 principles:["Check coherence across business strategy, marketing, media and execution","Numbers must reconcile across slides","Recommendations must be feasible under budget/capacity","Risks and assumptions must be visible","The deck should answer so-what on every major analysis"],
 workflow:["Narrative audit","Evidence audit","Math audit","Design audit","Feasibility audit","Executive readability audit","Export audit"],
 qualityBar:["No contradictions","No unsupported recommendations","No stale dates passed as current","No AI-flavored filler language","Client-ready without manual rewriting"] ,
 sources:["MBA/DBA doctrine","VIVITO critic protocol"]
}
];

export const VIVITO_DELIVERABLE_OPERATING_DOCTRINE=`
DELIVERABLE MODE
- When asked to create a strategy, marketing plan, media buying plan, market research, SWOT, PESTEL, PDF or presentation, first identify the audience, business decision, geography, period, brand context and available evidence.
- Build research before conclusions. Never fabricate market size, competitor results, survey data, customer quotes or citations.
- Use the relevant blueprint. Build slide architecture before writing slide copy.
- Each slide must have: purpose, assertion/takeaway, evidence, recommended visual, source notes, and implication/action where relevant.
- A SWOT/PESTEL slide is not complete until it prioritizes implications.
- A media plan is not complete until it defines budget allocation, assumptions, primary result definitions, measurement and optimization rules.
- A marketing plan is not complete until it links business goals -> customer -> positioning -> journey -> channel/content -> budget -> KPI -> roadmap.
- A research report is not complete until methodology, scope, limitations and sources are explicit.
- For PDF/presentation work, generate a professional visual system and run page-by-page/slide-by-slide visual QA before calling the artifact finished.
- If actual binary artifact generation is unavailable in the current execution environment, never claim a PDF/PPTX was generated; provide the complete artifact specification and state the execution limitation truthfully.
`;

export const VIVITO_TRAINING_BATCH_09_CONTEXT=VIVITO_TRAINING_BATCH_09.map((x,i)=>`### Deliverable Mastery ${i+1} — ${x.domain}\nPrinciples: ${x.principles.join(" | ")}\nWorkflow: ${x.workflow.join(" > ")}\nQuality bar: ${x.qualityBar.join(" | ")}\nSources: ${x.sources.join("; ")}`).join("\n\n");