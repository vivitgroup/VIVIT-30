import {repairVivitoActionPlan} from "./action-plan-repair-v3";

type DirectoryEntry={name?:unknown};
const clean=(v:unknown)=>String(v??"").trim().replace(/^["“”'`]+|["“”'`.,،;]+$/g,"").replace(/\s+/g," ");
const esc=(v:string)=>v.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function requestFromPrompt(prompt:string){const hit=prompt.match(/USER REQUEST:\s*([\s\S]*?)(?:\n\n(?:AUTHORIZED|ERP LIVE CONTEXT|TRUSTED|ATTACHMENTS|DIRECTORY)|$)/i);return clean(hit?.[1]||prompt)}
function directoryNames(prompt:string,heading:string){const re=new RegExp(`${esc(heading)}:\\s*([\\s\\S]*?)(?:\\n\\n[A-Z][A-Z ]+:|$)`,`i`),raw=re.exec(prompt)?.[1]?.trim();if(!raw)return[];try{const parsed=JSON.parse(raw) as unknown;if(!Array.isArray(parsed))return[];return parsed.map((x:unknown)=>typeof x==="string"?x:String((x as DirectoryEntry)?.name||"")).map(clean).filter(Boolean)}catch{return[]}}
function exactMention(input:string,names:string[]){const lower=input.toLowerCase();return [...names].sort((a,b)=>b.length-a.length).find(n=>lower.includes(n.toLowerCase()))||""}
function jsonPlan(op:string,args:Record<string,unknown>,summary:string){return JSON.stringify({op,summary,args,risk:"medium",requiresConfirmation:true,missingFields:[]})}
function explicitTaskFallback(prompt:string,system:string,raw:string){if(!/VIVITO Action Planner/i.test(system))return raw;let parsed:unknown;try{parsed=JSON.parse(raw)}catch{}if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)&&String((parsed as {op?:unknown}).op||"")!=="none")return raw;
 const input=requestFromPrompt(prompt),clients=directoryNames(prompt,"AUTHORIZED ACTIVE CLIENT DIRECTORY"),clientName=exactMention(input,clients);if(!clientName)return raw;
 const priority=(input.match(/(?:priority(?:\s+to)?|الأولوية|الاولوية|بأولوية)\s*(?::|=|-|to|هي)?\s*(LOW|MEDIUM|HIGH|URGENT)\b/i)?.[1]||input.match(/\bwith\s+(LOW|MEDIUM|HIGH|URGENT)\s+priority\b/i)?.[1]||"").toUpperCase();
 const arUpdate=input.match(/^(?:عدّل|عدل|غيّر|غير)\s+(.+?)\s+(?:للعميل|لعميل)(?=\s|[،,.;]|$)/i),enUpdate=input.match(/^(?:update|edit|change)\s+(.+?)\s+for\s+(?:the\s+)?client\b/i),taskTitle=clean(arUpdate?.[1]||enUpdate?.[1]||"");
 if(taskTitle&&priority)return jsonPlan("update_task",{taskTitle,clientName,priority},/^[\u0600-\u06ff]/.test(input)?`تعديل أولوية ${taskTitle}`:`Update ${taskTitle} priority`);
 return raw}
function normalizeOptionalPlans(raw:string){try{const plan=JSON.parse(raw) as {op?:unknown;missingFields?:unknown[]};if(String(plan.op||"")==="remind_me")return JSON.stringify({...plan,missingFields:[]});return raw}catch{return raw}}
export function repairOrFallbackVivitoActionPlan(prompt:string,system:string,raw:string){const repaired=repairVivitoActionPlan(prompt,system,raw),fallback=explicitTaskFallback(prompt,system,repaired);return normalizeOptionalPlans(fallback)}
