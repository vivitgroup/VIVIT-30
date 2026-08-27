export type VivitoPdfBlock={type:"title"|"subtitle"|"body"|"bullet"|"metric"|"callout";text:string};
export type VivitoPdfPage={title:string;eyebrow?:string;blocks:VivitoPdfBlock[];footer?:string};
export type VivitoPdfSpec={title:string;subtitle?:string;author?:string;pages:VivitoPdfPage[];theme?:{accent?:[number,number,number];dark?:boolean}};

export type VivitoContentPlanRow={date:string;platform:string;pillar:string;format:string;objective:string;topic:string;hook:string;captionDirection:string;cta:string;kpi:string;owner?:string;status?:string};
export type VivitoContentPlan={brand:string;period:string;objectives:string[];audiences:string[];pillars:{name:string;role:string;share:number}[];rows:VivitoContentPlanRow[]};

export type VivitoSheet={name:string;columns:string[];rows:(string|number|boolean|null)[][]};
export type VivitoWorkbook={title:string;sheets:VivitoSheet[]};

export type VivitoReelScript={title:string;objective:string;audience:string;durationSeconds:number;hook:string;beats:{time:string;visual:string;voiceover:string;onScreenText?:string;shot?:string;edit?:string}[];cta:string;caption?:string;productionNotes?:string[]};

export const VIVITO_ARTIFACT_DOCTRINE=`
VIVITO ARTIFACT INTELLIGENCE
PDF: build a decision narrative before layout. Every page has one dominant message, assertion title, evidence and implication. Never dump chat prose into pages. Use a consistent grid, typography hierarchy, whitespace, sources and appendix. Render, then inspect the actual PDF before claiming quality.
IMAGE UNDERSTANDING: describe only visible evidence; separate observation from inference. Read composition, hierarchy, palette, typography, product integrity, lighting, perspective, whitespace, brand cues and likely use-case. Never invent hidden text, logos or product details. When OCR/legibility is uncertain, say so.
WEB RESEARCH: search when facts are current, competitive, regulatory, pricing, market-size, trend or platform-dependent. Prefer first-party/official sources, then primary research, reputable industry sources and only then commentary. Capture title, URL, date, geography, metric definition and limitations. Triangulate material claims.
DESIGN: start from communication goal and hierarchy, not decoration. Define grid, focal point, typography, color roles, image treatment and information density. Preserve supplied product/logo geometry unless explicitly asked to alter it. One hero idea beats many equal boxes.
CONTENT STRATEGY: derive objectives -> audience -> insight -> positioning/message -> pillars -> formats -> cadence -> funnel role -> CTA -> KPI -> production workflow. Every content item must map to a pillar and business/marketing objective.
CONTENT PLAN: use a calendar table with date, platform, pillar, format, objective, topic, hook, caption direction, CTA, KPI, owner and status. Balance pillars by planned share; avoid repeating the same hook or format.
SPREADSHEETS: design the model before filling cells. Separate inputs, calculations, outputs and notes. Use explicit units/date periods, stable column names, validation-ready values, totals and formulas when the spreadsheet engine supports them. Never mix incompatible metrics in one column.
REELS: write for retention. Hook in first 1-2 seconds, establish relevance immediately, use visual change/tension/proof, keep one core message, build beats by time, and end with a clear CTA. Script visual, VO, on-screen text, shot and edit—not dialogue only. Avoid long branded intros.
`;

export function contentPlanToWorkbook(plan:VivitoContentPlan):VivitoWorkbook{return{title:`${plan.brand} — ${plan.period} Content Plan`,sheets:[{name:"Content Plan",columns:["Date","Platform","Pillar","Format","Objective","Topic","Hook","Caption Direction","CTA","KPI","Owner","Status"],rows:plan.rows.map(r=>[r.date,r.platform,r.pillar,r.format,r.objective,r.topic,r.hook,r.captionDirection,r.cta,r.kpi,r.owner||"",r.status||"PLANNED"])},{name:"Strategy",columns:["Type","Name","Role / Detail","Share"],rows:[...plan.objectives.map(x=>["Objective",x,"",""]),...plan.audiences.map(x=>["Audience",x,"",""]),...plan.pillars.map(x=>["Pillar",x.name,x.role,x.share])]}]}}

function csvCell(v:unknown){const s=String(v??"");return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
export function workbookToCsvBundle(w:VivitoWorkbook){return w.sheets.map(s=>({name:s.name,csv:[s.columns.map(csvCell).join(","),...s.rows.map(r=>r.map(csvCell).join(","))].join("\r\n")}))}
