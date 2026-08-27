import {classifyVivitoProviderFailure,clearVivitoProviderCooldown,markVivitoProviderCooldown,vivitoProviderCooldownRemaining} from "./quota-resilience";

export type VivitoProviderName="gemini"|"claude";
export type VivitoGeneration={text:string;provider:VivitoProviderName;attempted:VivitoProviderName[];errors:string[];latencyMs:number};

type GenerateOptions={temperature?:number;maxTokens?:number;preferred?:VivitoProviderName[];timeoutMs?:number};

const ANTHROPIC_URL="https://api.anthropic.com/v1/messages";
const MIN_TIMEOUT_MS=2000;
const DEFAULT_TIMEOUT_MS=25000;
const MAX_TIMEOUT_MS=45000;
const DEFAULT_GEMINI_FREE_MODEL_CHAIN=["gemini-3.5-flash-lite","gemini-3.6-flash","gemini-3.7-flash","gemini-3.5-flash","gemini-3.1-flash-lite"] as const;

function boundedTimeout(options:GenerateOptions){const requested=Number(options.timeoutMs??process.env.VIVITO_PROVIDER_TIMEOUT_MS??DEFAULT_TIMEOUT_MS);if(!Number.isFinite(requested))return DEFAULT_TIMEOUT_MS;return Math.max(MIN_TIMEOUT_MS,Math.min(MAX_TIMEOUT_MS,Math.round(requested)))}
function requestSignal(options:GenerateOptions){return AbortSignal.timeout(boundedTimeout(options))}
async function safeJson(r:Response){return r.json().catch(()=>({}))}

async function callClaude(prompt:string,system:string,options:GenerateOptions){
  if(!process.env.ANTHROPIC_API_KEY)throw new Error("claude-not-configured");
  const r=await fetch(ANTHROPIC_URL,{method:"POST",signal:requestSignal(options),headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL||"claude-sonnet-4-20250514",max_tokens:options.maxTokens||3200,temperature:options.temperature??0.18,system,messages:[{role:"user",content:prompt}]})});
  const d=await safeJson(r);if(!r.ok){const e:any=new Error(d?.error?.message||`claude-${r.status}`);e.status=r.status;throw e}const text=String(d?.content?.[0]?.text||"").trim();if(!text)throw new Error("claude-empty-response");return text;
}

function geminiModelChain(){const explicit=String(process.env.GEMINI_MODEL||"").trim();const configured=String(process.env.GEMINI_FREE_MODEL_CHAIN||"").split(",").map(x=>x.trim()).filter(Boolean);const chain=explicit?[explicit,...configured,...DEFAULT_GEMINI_FREE_MODEL_CHAIN]:[...configured,...DEFAULT_GEMINI_FREE_MODEL_CHAIN];return [...new Set(chain)].filter(model=>model&&model!=="gemini-2.0-flash"&&!model.startsWith("gemini-2.5-"))}
function geminiGenerationConfig(model:string,options:GenerateOptions){const generationConfig:any={maxOutputTokens:options.maxTokens||3200};if(model.includes("flash-lite"))generationConfig.thinkingConfig={thinkingLevel:"minimal"};else if(/^gemini-3\./.test(model))generationConfig.thinkingConfig={thinkingLevel:"low"};else generationConfig.temperature=options.temperature??0.18;return generationConfig}
function geminiError(model:string,d:any,status:number){const message=String(d?.error?.message||`gemini-${status}`).replace(/[\r\n\t]+/g," ").slice(0,220);return `${model}:${message}`}

async function callGemini(prompt:string,system:string,options:GenerateOptions){
  if(!process.env.GEMINI_API_KEY)throw new Error("gemini-not-configured");const errors:string[]=[];let lastStatus=0;
  for(const model of geminiModelChain()){
    try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{method:"POST",signal:requestSignal(options),headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:geminiGenerationConfig(model,options)})});const d=await safeJson(r);lastStatus=r.status;if(!r.ok){errors.push(geminiError(model,d,r.status));continue}const text=String(d?.candidates?.[0]?.content?.parts?.filter((p:any)=>!p.thought).map((p:any)=>p.text).join("\n")||"").trim();if(!text){errors.push(`${model}:empty-response`);continue}return text}catch(error){const raw=String((error as any)?.name==="TimeoutError"?"timeout":(error as any)?.message||error).replace(/[\r\n\t]+/g," ").slice(0,180);errors.push(`${model}:${raw}`)}}
  const e:any=new Error(`gemini-model-chain-failed:${errors.join(" | ")}`);e.status=lastStatus;throw e;
}

export function configuredVivitoProviders():VivitoProviderName[]{const providers:VivitoProviderName[]=[];if(process.env.GEMINI_API_KEY)providers.push("gemini");if(process.env.ANTHROPIC_API_KEY)providers.push("claude");return providers}
function safeError(provider:VivitoProviderName,error:unknown){const failure=classifyVivitoProviderFailure(error,(error as any)?.status);return `${provider}:${failure.safeCode}`}

export async function generateVivito(prompt:string,system:string,options:GenerateOptions={}):Promise<VivitoGeneration>{
  const configured=configuredVivitoProviders();if(!configured.length)throw new Error("provider-not-configured");
  const preferred=(options.preferred||["gemini","claude"]).filter(p=>configured.includes(p));const baseOrder=[...preferred,...configured.filter(p=>!preferred.includes(p))];
  const order=[...baseOrder.filter(p=>vivitoProviderCooldownRemaining(p)===0),...baseOrder.filter(p=>vivitoProviderCooldownRemaining(p)>0)];
  const attempted:VivitoProviderName[]=[];const errors:string[]=[];const started=Date.now();
  for(const provider of order){
    if(vivitoProviderCooldownRemaining(provider)>0&&order.some(p=>p!==provider&&vivitoProviderCooldownRemaining(p)===0)){errors.push(`${provider}:provider-cooldown-active`);continue}
    attempted.push(provider);
    try{const text=provider==="gemini"?await callGemini(prompt,system,options):await callClaude(prompt,system,options);clearVivitoProviderCooldown(provider);return{text,provider,attempted,errors,latencyMs:Date.now()-started}}
    catch(error){const failure=classifyVivitoProviderFailure(error,(error as any)?.status);markVivitoProviderCooldown(provider,failure);errors.push(safeError(provider,error))}
  }
  throw new Error(`all-providers-failed:${errors.join(" | ")}`);
}
