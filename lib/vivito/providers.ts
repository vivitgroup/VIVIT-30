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
  const providers:VivitoProviderName[]=[];if(gatewayConfigured())providers.push("gateway");if(openRouterFreeConfigured())providers.push("openrouter-free");if(groqFreeConfigured())providers.push("groq-free");
  if(!vivitoFreeOnlyMode()){if(process.env.GEMINI_API_KEY)providers.push("gemini");if(vivitoMeshSummary().configured>0)providers.push("mesh");if(process.env.ANTHROPIC_API_KEY)providers.push("claude")}
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
function money(value:unknown){return Math.round(Number(value||0)).toLocaleString("en-US")}
function localAdvisorText(prompt:string){
 const question=requestFromPrompt(prompt),arabic=/[\u0600-\u06ff]/.test(question),q=question.toLowerCase(),ctx=liveContextFromPrompt(prompt);
 if(/^(?:hi|hello|hey|اهلا|أهلا|هاي|هلا|السلام عليكم|سلام|صباح الخير|مساء الخير)[!؟? .]*$/i.test(question))return arabic?"أهلاً 👋 قولّي عايز نشتغل على إيه؟":"Hi 👋 What do you want to work on?";
 if(isCapabilityQuestion(question)){
  if(/عميل|client/.test(q))return arabic?"أيوه، أقدر أضيف عميل جديد حسب صلاحيتك. ابعت اسم الشركة أولًا، وبعدها أقدر أجهز البيانات المطلوبة وأعرض أمر الإنشاء للمراجعة قبل التنفيذ.":"Yes. I can add a new client within your role. Send the company name first, then I can prepare the required fields and present the create action for review.";
  if(/فاتور|invoice/.test(q))return arabic?"أيوه، أقدر أجهز فاتورة حسب صلاحيتك. ابعت اسم العميل، المبلغ، وتاريخ الاستحقاق أو تفاصيل البند، وبعدها أجهزها للمراجعة قبل التنفيذ.":"Yes. I can prepare an invoice within your role. Send the client, amount, and due date or line-item details, then I can prepare it for review before execution.";
  return arabic?"أيوه، أقدر أتعامل مع الطلب ده لو هو ضمن صلاحيات دورك. اكتب المطلوب بالتفاصيل وأنا أحدد البيانات الناقصة قبل أي تنفيذ.":"Yes, if the operation is within your role. Send the details and I will identify any missing fields before execution.";
 }
 const clients=asArray(ctx.clients).map(asRecord),campaigns=asArray(ctx.campaigns).map(asRecord),tasks=asArray(ctx.topTasks).map(asRecord),sales=asArray(ctx.salesPipeline).map(asRecord),finance=asRecord(ctx.finance),operations=asRecord(ctx.operations);
 const namedClient=clients.find(c=>{const name=String(c.company_name||"").toLowerCase();return name&&q.includes(name)})||null;
 if(/حمل|كمبين|campaign|media|ميديا/.test(q)){
  const relevant=namedClient?campaigns.filter(c=>String(c.company_name||"").toLowerCase()===String(namedClient.company_name||"").toLowerCase()):campaigns;
  if(!relevant.length)return arabic?"مفيش حملات متاحة في نطاق صلاحيتك للسؤال ده حاليًا.":"No campaigns are available in your authorized scope for this request.";
  const active=relevant.filter(c=>String(c.status||"").toUpperCase()==="ACTIVE").length,totalSpend=relevant.reduce((s,c)=>s+Number(c.spend||0),0),totalResults=relevant.reduce((s,c)=>s+Number(c.results||0),0),zeroResult=relevant.filter(c=>Number(c.spend||0)>0&&Number(c.results||0)<=0).length,top=[...relevant].sort((a,b)=>Number(b.spend||0)-Number(a.spend||0)).slice(0,5);
  const label=namedClient?String(namedClient.company_name||""):arabic?"الحملات المتاحة":"authorized campaigns";
  const rows=top.map(c=>`${String(c.campaign||"Campaign")}: ${String(c.status||"-")} · ${money(c.spend)} EGP · ${money(c.results)} ${String(c.resultDefinition||"results")}`).join("\n");
  return arabic?`${label}: عندك ${relevant.length} حملة، منهم ${active} Active. الإنفاق MTD ${money(totalSpend)} EGP والنتائج ${money(totalResults)}. ${zeroResult?`في ${zeroResult} حملة صرفت بدون نتيجة.`:"مفيش حملة بصرف ونتيجة صفر ضمن البيانات الحالية."}\n\nأعلى الحملات:\n${rows}`:`${label}: ${relevant.length} campaigns, ${active} active. MTD spend is ${money(totalSpend)} EGP with ${money(totalResults)} results. ${zeroResult?`${zeroResult} campaign(s) have spend with zero results.`:"No spend-with-zero-result campaign is present in the current data."}\n\nTop campaigns:\n${rows}`;
 }
 if(/مهم|task|overdue|متأخر/.test(q)){
  const overdue=Number(operations.overdueTasks||0),active=Number(operations.activeTasks||tasks.length),review=Number(operations.reviewTasks||0),top=tasks.slice(0,5).map(t=>`${String(t.title||"Task")} · ${String(t.company_name||"")} · ${String(t.status||"")}`).join("\n");
  return arabic?`المهام الحالية: ${active} نشطة، ${overdue} متأخرة، و${review} في المراجعة.${top?`\n\nأقرب مهام:\n${top}`:""}`:`Current tasks: ${active} active, ${overdue} overdue, and ${review} in review.${top?`\n\nClosest tasks:\n${top}`:""}`;
 }
 if(/فاتور|تحصيل|finance|مالي|outstanding|billing/.test(q)){
  const outstanding=Number(finance.amountOutstanding||0),due=Number(finance.amountDue||0),paid=Number(finance.amountPaid||0);
  return arabic?`المالية حسب صلاحيتك: إجمالي المستحق ${money(due)} EGP، المدفوع ${money(paid)} EGP، والمتبقي للتحصيل ${money(outstanding)} EGP.`:`Finance in your authorized scope: ${money(due)} EGP due, ${money(paid)} EGP paid, and ${money(outstanding)} EGP outstanding.`;
 }
 if(/sales|مبيعات|lead|ليد/.test(q)){
  const summary=asRecord(ctx.sales),count=Number(summary.leadCount||sales.length),weighted=Number(summary.weightedPipeline||0),overdue=Number(summary.overdueFollowUps||0);
  return arabic?`المبيعات: ${count} Lead في نطاقك، Weighted Pipeline بقيمة ${money(weighted)} EGP، و${overdue} متابعة متأخرة.`:`Sales: ${count} leads in scope, ${money(weighted)} EGP weighted pipeline, and ${overdue} overdue follow-ups.`;
 }
 if(namedClient){
  const name=String(namedClient.company_name||"العميل"),clientTasks=tasks.filter(t=>String(t.company_name||"").toLowerCase()===name.toLowerCase()),clientCampaigns=campaigns.filter(c=>String(c.company_name||"").toLowerCase()===name.toLowerCase());
  return arabic?`فاهم إن سؤالك عن ${name}. عندي له ${clientTasks.length} مهمة نشطة و${clientCampaigns.length} حملة ضمن صلاحيتك، لكن نماذج الـAI الخارجية غير متاحة في المحاولة دي عشان أجاوب على صياغة السؤال الحر بدون ما أخمّن. جرّب تاني بعد لحظة؛ مش هحوّل سؤالك لملخص ERP عام.`:`I understand your question is about ${name}. I can see ${clientTasks.length} active tasks and ${clientCampaigns.length} campaigns in your authorized scope, but the external AI models were unavailable for this attempt, so I will not guess or replace your question with a generic ERP summary. Please retry in a moment.`;
 }
 return arabic?`وصلني طلبك: «${question}». نماذج الـAI الخارجية غير متاحة في المحاولة دي، ومش هبدّل سؤالك بملخص ERP عام أو إجابة جاهزة. جرّب تاني بعد لحظة.`:`I received your request: “${question}”. The external AI models were unavailable for this attempt, so I will not replace your question with a generic ERP summary or canned answer. Please retry in a moment.`;
}
function localActionFallback(prompt:string,system:string,attempted:VivitoProviderName[],errors:string[],started:number){if(!/VIVITO Action Planner/i.test(system)||isCapabilityQuestion(requestFromPrompt(prompt)))return null;const local=generateLocalActionPlanV2(prompt,system);if(!local)return null;const next=[...attempted,"local" as const],text=repairOrFallbackVivitoActionPlan(prompt,system,local.text);console.warn("VIVITO structured local action fallback",{attempted:next,errors:errors.slice(-6),localModel:local.modelId});return{text,provider:"local" as const,attempted:next,errors,latencyMs:Date.now()-started,modelId:local.modelId}}
function transparentAdvisorFailure(prompt:string,attempted:VivitoProviderName[],errors:string[],started:number):VivitoGeneration{
  const text=localAdvisorText(prompt);
  console.warn("VIVITO live ERP deterministic fallback",{attempted,errors:errors.slice(-6),secure:true});
  return{text,provider:"local",attempted:[...attempted,"local"],errors,latencyMs:Date.now()-started,modelId:"vivito-live-erp-v5"};
}
function overrideProvider(options:GenerateOptions):ExternalProvider|undefined{if(!options.modelId)return undefined;if(options.modelProvider)return options.modelProvider;if(GROQ_FREE_MODEL_IDS.includes(options.modelId as (typeof GROQ_FREE_MODEL_IDS)[number]))return"groq-free";return options.modelId.endsWith(":free")?"openrouter-free":"gateway"}

export async function generateVivito(prompt:string,system:string,options:GenerateOptions={}):Promise<VivitoGeneration>{
  const started=Date.now(),configured=configuredVivitoProviders(),attempted:VivitoProviderName[]=[],errors:string[]=[],forced=overrideProvider(options);
  if(forced&&!configured.includes(forced))throw new Error("requested-model-provider-not-configured");
  if(!configured.length){errors.push(vivitoFreeOnlyMode()?"external:free-provider-not-configured":"external:provider-not-configured");const local=localActionFallback(prompt,system,attempted,errors,started);if(local)return local;if(isGeneralAdvisorSystem(system))return transparentAdvisorFailure(prompt,attempted,errors,started);throw new Error("provider-not-configured")}
  const defaultOrder:VivitoProviderName[]=vivitoFreeOnlyMode()?["gateway","openrouter-free","groq-free"]:["gateway","openrouter-free","groq-free","gemini","mesh","claude"];
  const requested=forced?[forced]:(options.preferred||defaultOrder),preferred=requested.filter(p=>p!=="local"&&configured.includes(p)),baseOrder=forced?preferred:[...preferred,...configured.filter(p=>!preferred.includes(p))];
  const order=[...baseOrder.filter(p=>vivitoProviderCooldownRemaining(p)===0),...baseOrder.filter(p=>vivitoProviderCooldownRemaining(p)>0)];
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