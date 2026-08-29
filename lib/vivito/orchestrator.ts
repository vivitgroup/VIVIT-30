import {allowedVivitoOps,VIVITO_ACTION_CATALOG,type VivitoActionOp,type VivitoActionProposal} from "./action-engine";
import {normalizeVivitoLanguage} from "./language";

export type VivitoActionPlan={summary:string;steps:VivitoActionProposal[];risk:"low"|"medium"|"high"|"destructive";requiresConfirmation:true;missingFields:string[]};
const MULTI_JOIN=/(وبعدين|وبعد كده|وكمان|بعدها|ثم|و اعمل|واعمل|و ضيف|وضيف|و سجل|وسجل|و اربط|واربط|و حط|وحط|و جد[وو]ل|وجد[وو]ل|and then|then|also|and add|and create|and assign|and record|and attach|and schedule)/i;
const ACTION_WORD=/(ضيف|اضف|أضف|اعمل|أنشئ|انشئ|سجل|سجّل|احذف|امسح|أرشف|ارش[فف]|رجع|استرجع|عيّن|عين|اربط|ارفع|حط|دفع|مصروف|فاتور[هة]|عدّل|عدل|غيّر|غير|انقل|حوّل|حول|جدول|انشر|ليد|create|add|assign|update|delete|archive|restore|record|attach|upload|invoice|payment|expense|schedule|lead|move)/ig;
export function likelyVivitoMultiStepIntent(text:string){const n=normalizeVivitoLanguage(text).normalized;return MULTI_JOIN.test(text)||MULTI_JOIN.test(n)||(text.match(ACTION_WORD)||[]).length>=2||(n.match(ACTION_WORD)||[]).length>=2}

export function buildVivitoOrchestratorSystem(role:string){const allowed=allowedVivitoOps(role);return `You are VIVITO Operating Orchestrator. Convert an explicit user request containing TWO OR MORE ERP actions into one safe ordered plan.
Return ONLY JSON with this exact shape:
{"summary":"...","steps":[{"op":"...","summary":"...","args":{},"missingFields":[]}],"requiresConfirmation":true}
Allowed operations for role ${role}: ${allowed.join(", ")}.
LANGUAGE: Understand Arabic, Egyptian slang, Arabic-English mixes, Gen Z shorthand, and Franco/Arabizi. Examples: 3ayez/3awez=عايز, 5aly=خلي, 2fel=اقفل, 3del=عدل, msh=مش, 7ot=حط, emsa7=امسح, w ba3den=وبعدين. Preserve entity names, amounts, dates, IDs, emails and file references exactly. Keep summaries in the user's style.
Use 2 to 8 steps only. If there is only one real operation return {"steps":[]} so the single-action planner can handle it.
Never invent IDs or hidden facts. Use natural client/staff/lead/task names from the request and trusted directories. A later step may refer by the same natural name to an entity created by an earlier step.
Order dependencies correctly: create client before contact/task/file/calendar; create lead before updating/moving it; attach or schedule only after an upload fileId exists in trusted attachment metadata.
Each step must be one allowed operation. Preserve only arguments explicitly requested. Put absent required values into that step's missingFields.
Do not merge a payment, expense, invoice, deletion, archive, scheduled publication, or sales-stage transition into an unrelated step.
Do not compensate or roll back earlier successful ERP writes automatically. The executor stops at the first failure and reports completed steps.
Never include operations outside the user's role permissions. Do not claim execution success.`}

function stripFence(raw:string){const t=raw.trim();return t.startsWith("```")?t.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim():t}
const rank={low:0,medium:1,high:2,destructive:3} as const;
export function parseVivitoActionPlan(raw:string,role:string):VivitoActionPlan|null{try{const p=JSON.parse(stripFence(raw)),source=Array.isArray(p?.steps)?p.steps:[];if(source.length<2||source.length>8)return null;const allowed=new Set(allowedVivitoOps(role)),steps:VivitoActionProposal[]=[];for(const s of source){const op=String(s?.op||"") as VivitoActionOp,meta=VIVITO_ACTION_CATALOG[op];if(!meta||!allowed.has(op))return null;const args=s?.args&&typeof s.args==="object"&&!Array.isArray(s.args)?s.args:{},missingFields=Array.isArray(s?.missingFields)?s.missingFields.map((x:any)=>String(x).slice(0,80)).slice(0,12):[];steps.push({op,summary:String(s?.summary||meta.description).trim().slice(0,500),args,risk:meta.risk,requiresConfirmation:true,missingFields})}const risk=steps.reduce((r,s)=>rank[s.risk]>rank[r]?s.risk:r,"low" as VivitoActionPlan["risk"]),missingFields=[...new Set(steps.flatMap((s,i)=>s.missingFields.map(f=>`step ${i+1}: ${f}`)))];return{summary:String(p.summary||steps.map(s=>s.summary).join(" → ")).trim().slice(0,800),steps,risk,requiresConfirmation:true,missingFields}}catch{return null}}
