import {classifyVivitoProviderFailure,clearVivitoProviderCooldown,markVivitoProviderCooldown,vivitoProviderCooldownRemaining} from "./quota-resilience";
import {generateViaVivitoMesh,vivitoMeshSummary,type VivitoMeshTask} from "./model-mesh-v1";
import {generateViaGatewayIntelligentMesh} from "./gateway-intelligent-mesh-v3";
import {generateViaOpenRouterFreeMesh,openRouterFreeConfigured} from "./openrouter-free-mesh-v1";
import {generateViaGroqFreeMesh,groqFreeConfigured,GROQ_FREE_MODEL_IDS} from "./groq-free-mesh-v1";
import {generateLocalActionPlanV2} from "./local-action-planner-v2";
import {repairOrFallbackVivitoActionPlan} from "./action-plan-fallback-v1";

export type VivitoProviderName="gateway"|"openrouter-free"|"groq-free"|"gemini"|"claude"|"mesh"|"local";
export type VivitoGeneration={text:string;provider:VivitoProviderName;attempted:VivitoProviderName[];errors:string[];latencyMs:number;modelId?:string};
type ExternalProvider=Exclude<VivitoProviderName,"local">;
type GenerateOptions={temperature?:number;maxTokens?:number;preferred?:VivitoProviderName[];timeoutMs?:number;task?:VivitoMeshTask;modelId?:string;modelProvider?:"gateway"|"openrouter-free"|"groq-free"};
type JsonRecord=Record<string,unknown>;
type ProviderHttpError=Error&{status?:number};
type GatewayCredential={token:string;source:"api-key"|"oidc"};
type ConversationTurn={role:"user"|"assistant";content:string};

const asRecord=(value:unknown):JsonRecord=>value&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};
const asArray=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const errorStatus=(error:unknown)=>{if(!error||typeof error!=="object"||!("status" in error))return undefined;const status=Number((error as {status?:unknown}).status);return Number.isFinite(status)?status:undefined};
const providerError=(message:string,status:number):ProviderHttpError=>{const error=new Error(message) as ProviderHttpError;error.status=status;return error};
const ANTHROPIC_URL="https://api.anthropic.com/v1/messages";
const MIN_TIMEOUT_MS=2000,DEFAULT_TIMEOUT_MS=25000,MAX_TIMEOUT_MS=45000;
const DEFAULT_GEMINI_FREE_MODEL_CHAIN=["gemini-3.5-flash-lite","gemini-3.6-flash","gemini-3.7-flash","gemini-3.5-flash","gemini-3.1-flash-lite"] as const;

function boundedTimeout(options:GenerateOptions){const requested=Number(options.timeoutMs??process.env.VIVITO_PROVIDER_TIMEOUT_MS??DEFAULT_TIMEOUT_MS);if(!Number.isFinite(requested))return DEFAULT_TIMEOUT_MS;return Math.max(MIN_TIMEOUT_MS,Math.min(MAX_TIMEOUT_MS,Math.round(requested)))}
function requestSignal(options:GenerateOptions){return AbortSignal.timeout(boundedTimeout(options))}
async function safeJson(r:Response):Promise<unknown>{return r.json().catch(()=>({}))}
function enabled(value:unknown){return /^(1|true|yes|on)$/i.test(String(value||"").trim())}
function normalizeGatewayCredential(value:unknown){let token=String(value||"").trim();if((token.startsWith('"')&&token.endsWith('"'))||(token.startsWith("'")&&token.endsWith("'")))token=token.slice(1,-1).trim();return token.replace(/^Bearer\s+/i,"").trim()}
function gatewayCredentials():GatewayCredential[]{const ordered:GatewayCredential[]=[{token:normalizeGatewayCredential(process.env.VERCEL_OIDC_TOKEN),source:"oidc"},{token:normalizeGatewayCredential(process.env.AI_GATEWAY_API_KEY),source:"api-key"}],seen=new Set<string>();return ordered.filter(item=>{if(!item.token||seen.has(item.token))return false;seen.add(item.token);return true})}
function gatewayConfigured(){return gatewayCredentials().length>0}
export function vivitoFreeOnlyMode(){return !enabled(process.env.VIVITO_ALLOW_PAID_PROVIDERS)}

async function callGateway(prompt:string,system:string,options:GenerateOptions){const credentials=gatewayCredentials();if(!credentials.length)throw new Error("gateway-not-configured");let lastError:unknown;for(let index=0;index<credentials.length;index++){const credential=credentials[index];try{const result=await generateViaGatewayIntelligentMesh(prompt,system,credential.token,options);if(index>0)console.warn("VIVITO gateway auth recovered via fallback credential",{credentialIndex:index,credentialSource:credential.source});return{text:result.text,modelId:result.modelId}}catch(error:unknown){lastError=error;const status=errorStatus(error),failure=classifyVivitoProviderFailure(error,status),canRetryAuth=failure.health==="AUTH_FAILURE"&&index<credentials.length-1;if(canRetryAuth)continue;throw error}}throw lastError instanceof Error?lastError:new Error("gateway-auth-failed")}
async function callClaude(prompt:string,system:string,options:GenerateOptions){if(!process.env.ANTHROPIC_API_KEY)throw new Error("claude-not-configured");const r=await fetch(ANTHROPIC_URL,{method:"POST",signal:requestSignal(options),headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL||"claude-sonnet-4-20250514",max_tokens:options.maxTokens||3200,temperature:options.temperature??0.18,system,messages:[{role:"user",content:prompt}]})});const d=asRecord(await safeJson(r)),apiError=asRecord(d.error);if(!r.ok)throw providerError(String(apiError.message||`claude-${r.status}`),r.status);const content=asArray(d.content),first=asRecord(content[0]),text=String(first.text||"").trim();if(!text)throw new Error("claude-empty-response");return text}
function geminiModelChain(){const explicit=String(process.env.GEMINI_MODEL||"").trim(),configured=String(process.env.GEMINI_FREE_MODEL_CHAIN||"").split(",").map(x=>x.trim()).filter(Boolean),chain=explicit?[explicit,...configured,...DEFAULT_GEMINI_FREE_MODEL_CHAIN]:[...configured,...DEFAULT_GEMINI_FREE_MODEL_CHAIN];return [...new Set(chain)].filter(model=>model&&model!=="gemini-2.0-flash"&&!model.startsWith("gemini-2.5-"))}
function geminiGenerationConfig(model:string,options:GenerateOptions){const generationConfig:JsonRecord={maxOutputTokens:options.maxTokens||3200};if(model.includes("flash-lite"))generationConfig.thinkingConfig={thinkingLevel:"minimal"};else if(/^gemini-3\./.test(model))generationConfig.thinkingConfig={thinkingLevel:"low"};else generationConfig.temperature=options.temperature??0.18;return generationConfig}
function geminiError(model:string,d:unknown,status:number){const root=asRecord(d),apiError=asRecord(root.error),message=String(apiError.message||`gemini-${status}`).replace(/[\r\n\t]+/g," ").slice(0,220);return `${model}:${message}`}
async function callGemini(prompt:string,system:string,options:GenerateOptions){if(!process.env.GEMINI_API_KEY)throw new Error("gemini-not-configured");const errors:string[]=[];let lastStatus=0;for(const model of geminiModelChain()){try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{method:"POST",signal:requestSignal(options),headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:geminiGenerationConfig(model,options)})});const d=await safeJson(r);lastStatus=r.status;if(!r.ok){errors.push(geminiError(model,d,r.status));continue}const root=asRecord(d),candidate=asRecord(asArray(root.candidates)[0]),content=asRecord(candidate.content),parts=asArray(content.parts).map(asRecord),text=parts.filter(part=>!part.thought).map(part=>String(part.text||"")).join("\n").trim();if(!text){errors.push(`${model}:empty-response`);continue}return text}catch(error:unknown){const name=error&&typeof error==="object"&&"name" in error?String((error as {name?:unknown}).name):"",raw=String(name==="TimeoutError"?"timeout":error instanceof Error?error.message:error).replace(/[\r\n\t]+/g," ").slice(0,180);errors.push(`${model}:${raw}`)}}throw providerError(`gemini-model-chain-failed:${errors.join(" | ")}`,lastStatus)}

export function configuredVivitoProviders():VivitoProviderName[]{
 const providers:VivitoProviderName[]=[];
 if(gatewayConfigured())providers.push("gateway");
 if(openRouterFreeConfigured())providers.push("openrouter-free");
 if(groqFreeConfigured())providers.push("groq-free");
 if(!vivitoFreeOnlyMode()){
  if(process.env.GEMINI_API_KEY)providers.push("gemini");
  if(vivitoMeshSummary().configured>0)providers.push("mesh");
  if(process.env.ANTHROPIC_API_KEY)providers.push("claude");
 }
 return providers;
}

function safeError(provider:VivitoProviderName,error:unknown){const failure=classifyVivitoProviderFailure(error,errorStatus(error));return `${provider}:${failure.safeCode}`}
function requestFromPrompt(prompt:string){const hit=prompt.match(/(?:QUESTION|USER REQUEST):\s*([\s\S]*?)(?:\n\n(?:ERP LIVE CONTEXT|AUTHORIZED|TRUSTED|ATTACHMENTS|DIRECTORY)|$)/i);return String(hit?.[1]||prompt).trim().slice(0,1600)}
function isGeneralAdvisorSystem(system:string){const head=String(system||"").slice(0,320);return /You are VIVITO — VIVIT Operating Intelligence/i.test(head)&&!/VIVITO Action Planner|VIVITO Operating Orchestrator|Artifact|Memory Planner|Competitive|independent VIVITO critic|VIVITO RED TEAM/i.test(head)}
function isUserFacingAdvisorSystem(system:string){return isGeneralAdvisorSystem(system)||/independent VIVITO critic/i.test(String(system||""))}
function looksLikeInternalContext(text:string){const value=String(text||"");const marker=/(?:ERP LIVE CONTEXT|OPERATIONAL MEMORY RULES|AUTHORIZED ACTIVE CLIENT DIRECTORY|AUTHORIZED STAFF DIRECTORY|AUTHORIZED GROUP CONTEXT|SYSTEM PROMPT|Current context:|current context:)/i.test(value);const schema=(/"clientNames"\s*:/.test(value)&&/"topTasks"\s*:/.test(value))||(/"operationalMemory"\s*:/.test(value)&&/"clients"\s*:/.test(value))||(/\{\s*"role"\s*:/.test(value)&&/"clientCount"\s*:/.test(value)&&/"company_name"\s*:/.test(value));return marker||schema}
function secureOutputFallback(prompt:string){const question=requestFromPrompt(prompt),arabic=/[\u0600-\u06ff]/.test(question);return arabic?"حجبت VIVITO استجابة احتوت على سياق ERP داخلي أو حقول نظام خام. بياناتك ما زالت متاحة داخليًا حسب صلاحياتك ولن يتم عرضها كـJSON. أعد الطلب بصياغة مباشرة وسأرجع لك بالنتيجة فقط.":"VIVITO blocked a response that contained internal ERP context or raw system fields. Your authorized data remains available internally and will not be exposed as JSON. Retry the request and VIVITO will return only the user-facing result."}
function guardUserFacingOutput(prompt:string,system:string,text:string){const normalized=String(text||"").trim();if(!isUserFacingAdvisorSystem(system)||!looksLikeInternalContext(normalized))return normalized;console.warn("VIVITO provider-boundary output guard blocked internal context leakage");return secureOutputFallback(prompt)}
function isCapabilityQuestion(question:string){const q=String(question||"").trim();return /^(?:هل\s+)?(?:تعرف|تقدر|يمكنك|can\s+you|are\s+you\s+able\s+to)\b/i.test(q)&&/[؟?]?$/.test(q)}
function liveContextFromPrompt(prompt:string):JsonRecord{const marker="ERP LIVE CONTEXT:";const at=prompt.lastIndexOf(marker);if(at<0)return{};const raw=prompt.slice(at+marker.length).trim();try{return asRecord(JSON.parse(raw))}catch{return{}}}
function conversationHistoryFromPrompt(prompt:string):ConversationTurn[]{
 const marker="TRUSTED UI CONVERSATION HISTORY";const at=prompt.indexOf(marker);if(at<0)return[];
 const start=prompt.indexOf("[",at),end=prompt.indexOf("\n\nERP LIVE CONTEXT:",start);if(start<0||end<0)return[];
 try{return asArray(JSON.parse(prompt.slice(start,end))).flatMap(value=>{const row=asRecord(value),role=row.role==="user"||row.role==="assistant"?row.role:null,content=String(row.content||"").trim();return role&&content?[{role,content}]:[]}).slice(-10)}catch{return[]}
}
function money(value:unknown){return Math.round(Number(value||0)).toLocaleString("en-US")}
function percent(value:number){return `${value>=0?"+":""}${Math.round(value)}%`}
function pctChange(current:number,previous:number){if(previous<=0)return current>0?100:0;return((current-previous)/previous)*100}
function clientName(row:JsonRecord){return String(row.company_name||"").trim()}
function activeClientFromContext(question:string,history:ConversationTurn[],clients:JsonRecord[]){
 const current=question.toLowerCase();const direct=clients.find(c=>{const name=clientName(c).toLowerCase();return name&&current.includes(name)});if(direct)return direct;
 const recent=[...history].reverse();for(const turn of recent){const text=turn.content.toLowerCase();const found=clients.find(c=>{const name=clientName(c).toLowerCase();return name&&text.includes(name)});if(found)return found}return null;
}
function campaignMetrics(rows:JsonRecord[]){
 const sum=(key:string)=>rows.reduce((total,row)=>total+Number(row[key]||0),0);
 const spend=sum("spend"),results=sum("results"),revenue=sum("revenue"),purchases=sum("purchases"),previousSpend=sum("previousSpend"),previousResults=sum("previousResults"),previousRevenue=sum("previousRevenue"),previousPurchases=sum("previousPurchases");
 return{spend,results,revenue,purchases,previousSpend,previousResults,previousRevenue,previousPurchases,roas:spend?revenue/spend:0,previousRoas:previousSpend?previousRevenue/previousSpend:0,cpr:results?spend/results:0,previousCpr:previousResults?previousSpend/previousResults:0};
}
function campaignDiagnosis(rows:JsonRecord[],arabic:boolean){
 const m=campaignMetrics(rows),zeroResult=rows.filter(c=>Number(c.spend||0)>0&&Number(c.results||0)<=0).length,spendDelta=pctChange(m.spend,m.previousSpend),resultDelta=pctChange(m.results,m.previousResults),roasDelta=pctChange(m.roas,m.previousRoas),cprDelta=pctChange(m.cpr,m.previousCpr);
 const issues:string[]=[];
 if(zeroResult)issues.push(arabic?`${zeroResult} حملة صرفت بدون نتائج مسجلة`:`${zeroResult} campaign(s) spent with zero recorded results`);
 if(m.previousResults>0&&resultDelta<-10)issues.push(arabic?`النتائج نازلة ${Math.abs(Math.round(resultDelta))}% مقابل الفترة السابقة`:`results are down ${Math.abs(Math.round(resultDelta))}% vs the previous comparable period`);
 if(m.previousCpr>0&&cprDelta>15)issues.push(arabic?`تكلفة النتيجة زادت ${Math.round(cprDelta)}%`:`cost per result increased ${Math.round(cprDelta)}%`);
 if(m.previousRoas>0&&roasDelta<-10)issues.push(arabic?`ROAS نازل ${Math.abs(Math.round(roasDelta))}%`:`ROAS is down ${Math.abs(Math.round(roasDelta))}%`);
 if(!issues.length)issues.push(arabic?"مفيش انهيار واضح في الأرقام الحالية؛ محتاجين نراجع توزيع الصرف والكرياتيف والتتبع قبل أي تغيير كبير":"there is no obvious collapse in the current totals; review spend allocation, creatives, and tracking before making a major change");
 return{m,zeroResult,spendDelta,resultDelta,roasDelta,cprDelta,issues};
}
function localAdvisorText(prompt:string){
 const question=requestFromPrompt(prompt),arabic=/[\u0600-\u06ff]/.test(question),q=question.toLowerCase(),ctx=liveContextFromPrompt(prompt),history=conversationHistoryFromPrompt(prompt);
 if(/^(?:hi|hello|hey|اهلا|أهلا|هاي|هلا|السلام عليكم|سلام|صباح الخير|مساء الخير)[!؟? .]*$/i.test(question))return arabic?"أهلاً 👋 قولّي عايز نشتغل على إيه؟":"Hi 👋 What do you want to work on?";
 if(isCapabilityQuestion(question)){
  if(/عميل|client/.test(q))return arabic?"أيوه، أقدر أضيف عميل جديد حسب صلاحيتك. ابعت اسم الشركة أولًا، وبعدها أجهز البيانات المطلوبة وأعرض أمر الإنشاء للمراجعة قبل التنفيذ.":"Yes. I can add a new client within your role. Send the company name first, then I can prepare the required fields and present the create action for review.";
  if(/فاتور|invoice/.test(q))return arabic?"أيوه، أقدر أجهز فاتورة حسب صلاحيتك. ابعت اسم العميل، المبلغ، وتاريخ الاستحقاق أو تفاصيل البند، وبعدها أجهزها للمراجعة قبل التنفيذ.":"Yes. I can prepare an invoice within your role. Send the client, amount, and due date or line-item details, then I can prepare it for review before execution.";
  return arabic?"أيوه، أقدر أتعامل مع الطلب ده لو هو ضمن صلاحيات دورك. اكتب المطلوب بالتفاصيل وأنا أحدد البيانات الناقصة قبل أي تنفيذ.":"Yes, if the operation is within your role. Send the details and I will identify any missing fields before execution.";
 }
 const clients=asArray(ctx.clients).map(asRecord),campaigns=asArray(ctx.campaigns).map(asRecord),tasks=asArray(ctx.topTasks).map(asRecord),sales=asArray(ctx.salesPipeline).map(asRecord),finance=asRecord(ctx.finance),operations=asRecord(ctx.operations),namedClient=activeClientFromContext(question,history,clients);
 const clientCampaigns=namedClient?campaigns.filter(c=>clientName(c).toLowerCase()===clientName(namedClient).toLowerCase()):[];
 const whyFollowup=/^(?:(?:طب|طيب|و)\s*)?(?:ليه|لماذا|why)\b/i.test(question.trim());
 const nextFollowup=/^(?:(?:طب|طيب|و)\s*)?(?:أ?عمل\s+ايه|أ?عمل\s+إيه|نعمل\s+ايه|نعمل\s+إيه|what\s+(?:do|should)\s+i\s+do|what\s+next)\b/i.test(question.trim());
 if(namedClient&&clientCampaigns.length&&(whyFollowup||nextFollowup)){
  const name=clientName(namedClient),d=campaignDiagnosis(clientCampaigns,arabic);
  if(whyFollowup){return arabic?`بالنسبة لـ ${name}، السبب الأقرب من الداتا الحالية: ${d.issues.join("؛ ")}. الإنفاق ${money(d.m.spend)} EGP (${percent(d.spendDelta)}) والنتائج ${money(d.m.results)} (${percent(d.resultDelta)}).${d.m.previousRoas>0?` ROAS الحالي ${d.m.roas.toFixed(2)} مقابل ${d.m.previousRoas.toFixed(2)} سابقًا.`:""} دي قراءة من بيانات الـERP، مش تخمين.`:`For ${name}, the strongest explanation in the current ERP data is: ${d.issues.join("; ")}. Spend is ${money(d.m.spend)} EGP (${percent(d.spendDelta)}) and results are ${money(d.m.results)} (${percent(d.resultDelta)}).${d.m.previousRoas>0?` Current ROAS is ${d.m.roas.toFixed(2)} vs ${d.m.previousRoas.toFixed(2)} previously.`:""}`}
  return arabic?`بالنسبة لـ ${name}، أعمل 3 حاجات بالترتيب: 1) وقف أو راجع أي حملة صرفت بدون نتيجة (${d.zeroResult}). 2) انقل الميزانية تدريجيًا للحملات الأعلى نتيجة بدل تغيير كل شيء مرة واحدة. 3) راجع Tracking + Creative للحملات اللي تكلفة النتيجة فيها بتسوء. لو تحب، قولّي «اعمل تاسك لأسماء بأول نقطة» وأنا أجهز أمر التنفيذ.`:`For ${name}: 1) pause/review campaigns with spend and zero results (${d.zeroResult}); 2) shift budget gradually toward the strongest result producers; 3) review tracking and creative on campaigns with worsening cost per result. You can then ask VIVITO to create a task from the first action.`;
 }
 if(/حمل|كمبين|campaign|media|ميديا|حلل/.test(q)){
  const relevant=namedClient?clientCampaigns:campaigns;if(!relevant.length)return arabic?"مفيش حملات متاحة في نطاق صلاحيتك للسؤال ده حاليًا.":"No campaigns are available in your authorized scope for this request.";
  const active=relevant.filter(c=>String(c.status||"").toUpperCase()==="ACTIVE").length,d=campaignDiagnosis(relevant,arabic),top=[...relevant].sort((a,b)=>Number(b.spend||0)-Number(a.spend||0)).slice(0,5),label=namedClient?clientName(namedClient):arabic?"الحملات المتاحة":"authorized campaigns",rows=top.map(c=>`${String(c.campaign||"Campaign")}: ${String(c.status||"-")} · ${money(c.spend)} EGP · ${money(c.results)} ${String(c.resultDefinition||"results")}`).join("\n");
  return arabic?`${label}: عندك ${relevant.length} حملة، منهم ${active} Active. الإنفاق MTD ${money(d.m.spend)} EGP (${percent(d.spendDelta)}) والنتائج ${money(d.m.results)} (${percent(d.resultDelta)}).\n\nأهم ملاحظاتي: ${d.issues.join("؛ ")}.\n\nأعلى الحملات:\n${rows}\n\nلو عايز السبب بالتفصيل قولّي «طب ليه؟»، ولو عايز قرار تنفيذي قولّي «طب أعمل إيه؟».`:`${label}: ${relevant.length} campaigns, ${active} active. MTD spend is ${money(d.m.spend)} EGP (${percent(d.spendDelta)}) with ${money(d.m.results)} results (${percent(d.resultDelta)}).\n\nMain observations: ${d.issues.join("; ")}.\n\nTop campaigns:\n${rows}\n\nAsk “why?” for the diagnosis or “what should I do?” for actions.`;
 }
 if(/مهم|task|overdue|متأخر/.test(q)){
  const overdue=Number(operations.overdueTasks||0),active=Number(operations.activeTasks||tasks.length),review=Number(operations.reviewTasks||0),top=tasks.slice(0,5).map(t=>`${String(t.title||"Task")} · ${String(t.company_name||"")} · ${String(t.status||"")}`).join("\n");
  return arabic?`المهام الحالية: ${active} نشطة، ${overdue} متأخرة، و${review} في المراجعة.${top?`\n\nأقرب مهام:\n${top}`:""}`:`Current tasks: ${active} active, ${overdue} overdue, and ${review} in review.${top?`\n\nClosest tasks:\n${top}`:""}`;
 }
 if(/فاتور|تحصيل|finance|مالي|outstanding|billing/.test(q)){
  const outstanding=Number(finance.amountOutstanding||0),due=Number(finance.amountDue||0),paid=Number(finance.amountPaid||0);return arabic?`المالية حسب صلاحيتك: إجمالي المستحق ${money(due)} EGP، المدفوع ${money(paid)} EGP، والمتبقي للتحصيل ${money(outstanding)} EGP.`:`Finance in your authorized scope: ${money(due)} EGP due, ${money(paid)} EGP paid, and ${money(outstanding)} EGP outstanding.`;
 }
 if(/sales|مبيعات|lead|ليد/.test(q)){
  const summary=asRecord(ctx.sales),count=Number(summary.leadCount||sales.length),weighted=Number(summary.weightedPipeline||0),overdue=Number(summary.overdueFollowUps||0);return arabic?`المبيعات: ${count} Lead في نطاقك، Weighted Pipeline بقيمة ${money(weighted)} EGP، و${overdue} متابعة متأخرة.`:`Sales: ${count} leads in scope, ${money(weighted)} EGP weighted pipeline, and ${overdue} overdue follow-ups.`;
 }
 if(namedClient){
  const name=clientName(namedClient)||"العميل",clientTasks=tasks.filter(t=>clientName(t).toLowerCase()===name.toLowerCase());return arabic?`فاهم إننا بنتكلم عن ${name}. عندي له ${clientTasks.length} مهمة نشطة و${clientCampaigns.length} حملة ضمن صلاحيتك. اسألني عن الحملات، المهام، المشاكل أو القرار التالي وأنا هكمل على نفس العميل.`:`I understand we are talking about ${name}. I can see ${clientTasks.length} active tasks and ${clientCampaigns.length} campaigns in your authorized scope. Ask about campaigns, tasks, issues, or the next decision and I will keep the same client context.`;
 }
 return arabic?`وصلني طلبك: «${question}». نماذج الـAI الخارجية غير متاحة في المحاولة دي، لكن VIVITO لسه يقدر يقرأ بيانات الـERP ويجاوب على الحملات والمهام والمالية والمبيعات ضمن صلاحيتك. لو الطلب حر جدًا، جرّبه تاني أو اربطه بعميل/حملة محددة.`:`I received your request: “${question}”. External AI models were unavailable for this attempt, but VIVITO can still answer from authorized ERP data for campaigns, tasks, finance, and sales. For open-ended requests, retry or name the client/campaign.`;
}

function localActionFallback(prompt:string,system:string,attempted:VivitoProviderName[],errors:string[],started:number){if(!/VIVITO Action Planner/i.test(system)||isCapabilityQuestion(requestFromPrompt(prompt)))return null;const local=generateLocalActionPlanV2(prompt,system);if(!local)return null;const next=[...attempted,"local" as const],text=repairOrFallbackVivitoActionPlan(prompt,system,local.text);console.warn("VIVITO structured local action fallback",{attempted:next,errors:errors.slice(-6),localModel:local.modelId});return{text,provider:"local" as const,attempted:next,errors,latencyMs:Date.now()-started,modelId:local.modelId}}
function transparentAdvisorFailure(prompt:string,attempted:VivitoProviderName[],errors:string[],started:number):VivitoGeneration{const text=localAdvisorText(prompt);console.warn("VIVITO live ERP deterministic fallback",{attempted,errors:errors.slice(-6),secure:true});return{text,provider:"local",attempted:[...attempted,"local"],errors,latencyMs:Date.now()-started,modelId:"vivito-live-erp-v6"}}
function overrideProvider(options:GenerateOptions):ExternalProvider|undefined{if(!options.modelId)return undefined;if(options.modelProvider)return options.modelProvider;if(GROQ_FREE_MODEL_IDS.includes(options.modelId as (typeof GROQ_FREE_MODEL_IDS)[number]))return"groq-free";return options.modelId.endsWith(":free")?"openrouter-free":"gateway"}

export async function generateVivito(prompt:string,system:string,options:GenerateOptions={}):Promise<VivitoGeneration>{
 const started=Date.now(),configured=configuredVivitoProviders(),attempted:VivitoProviderName[]=[],errors:string[]=[],forced=overrideProvider(options);
 if(forced&&!configured.includes(forced))throw new Error("requested-model-provider-not-configured");
 if(!configured.length){errors.push(vivitoFreeOnlyMode()?"external:free-provider-not-configured":"external:provider-not-configured");const local=localActionFallback(prompt,system,attempted,errors,started);if(local)return local;if(isGeneralAdvisorSystem(system))return transparentAdvisorFailure(prompt,attempted,errors,started);throw new Error("provider-not-configured")}
 const defaultOrder:VivitoProviderName[]=vivitoFreeOnlyMode()?["gateway","openrouter-free","groq-free"]:["gateway","openrouter-free","groq-free","gemini","mesh","claude"];
 const requested=forced?[forced]:(options.preferred||defaultOrder),preferred=requested.filter(p=>p!=="local"&&configured.includes(p)),baseOrder=forced?preferred:[...preferred,...configured.filter(p=>!preferred.includes(p))],order=[...baseOrder.filter(p=>vivitoProviderCooldownRemaining(p)===0),...baseOrder.filter(p=>vivitoProviderCooldownRemaining(p)>0)];
 for(const provider of order){
  if(provider==="local")continue;if(vivitoProviderCooldownRemaining(provider)>0&&order.some(p=>p!==provider&&p!=="local"&&vivitoProviderCooldownRemaining(p)===0)){errors.push(`${provider}:provider-cooldown-active`);continue}attempted.push(provider);
  try{
   if(provider==="gateway"){const result=await callGateway(prompt,system,options),repaired=repairOrFallbackVivitoActionPlan(prompt,system,result.text),text=guardUserFacingOutput(prompt,system,repaired);clearVivitoProviderCooldown(provider);return{text,provider,attempted,errors,latencyMs:Date.now()-started,modelId:result.modelId}}
   if(provider==="openrouter-free"){const result=await generateViaOpenRouterFreeMesh(prompt,system,options),repaired=repairOrFallbackVivitoActionPlan(prompt,system,result.text),text=guardUserFacingOutput(prompt,system,repaired);clearVivitoProviderCooldown(provider);return{text,provider,attempted,errors:[...errors,...result.errors],latencyMs:Date.now()-started,modelId:result.modelId}}
   if(provider==="groq-free"){const result=await generateViaGroqFreeMesh(prompt,system,options),repaired=repairOrFallbackVivitoActionPlan(prompt,system,result.text),text=guardUserFacingOutput(prompt,system,repaired);clearVivitoProviderCooldown(provider);return{text,provider,attempted,errors:[...errors,...result.errors],latencyMs:Date.now()-started,modelId:result.modelId}}
   if(provider==="mesh"){const result=await generateViaVivitoMesh(prompt,system,options),repaired=repairOrFallbackVivitoActionPlan(prompt,system,result.text),text=guardUserFacingOutput(prompt,system,repaired);clearVivitoProviderCooldown(provider);return{text,provider,attempted,errors:[...errors,...result.errors],latencyMs:Date.now()-started,modelId:result.modelId}}
   const generated=provider==="gemini"?await callGemini(prompt,system,options):await callClaude(prompt,system,options),repaired=repairOrFallbackVivitoActionPlan(prompt,system,generated),text=guardUserFacingOutput(prompt,system,repaired);clearVivitoProviderCooldown(provider);return{text,provider,attempted,errors,latencyMs:Date.now()-started}
  }catch(error:unknown){const failure=classifyVivitoProviderFailure(error,errorStatus(error));markVivitoProviderCooldown(provider,failure);errors.push(safeError(provider,error));if(forced)break}
 }
 const local=localActionFallback(prompt,system,attempted,errors,started);if(local)return local;if(isGeneralAdvisorSystem(system))return transparentAdvisorFailure(prompt,attempted,errors,started);throw new Error(`all-providers-failed:${errors.join(" | ")}`)
}
