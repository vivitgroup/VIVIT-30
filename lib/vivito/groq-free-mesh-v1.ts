import {classifyVivitoProviderFailure,type VivitoProviderHealth} from "./quota-resilience";
import type {VivitoMeshTask} from "./model-mesh-v1";

export const GROQ_FREE_MODEL_IDS=["openai/gpt-oss-120b","openai/gpt-oss-20b","qwen/qwen3.6-27b","qwen/qwen3.8-27b"] as const;
export type GroqFreeModelId=(typeof GROQ_FREE_MODEL_IDS)[number];
type Options={task?:VivitoMeshTask;maxTokens?:number;temperature?:number;timeoutMs?:number;modelId?:string;apiKey?:string};
type HealthState={health:VivitoProviderHealth;cooldownUntil:number;successes:number;failures:number;lastLatencyMs?:number;lastErrorCode?:string};
type JsonRecord=Record<string,unknown>;
const BASE="https://api.groq.com/openai/v1";
const health=new Map<string,HealthState>();
let catalogCache:{expiresAt:number;models:GroqFreeModelId[]}|null=null;
const asRecord=(v:unknown):JsonRecord=>v&&typeof v==="object"&&!Array.isArray(v)?v as JsonRecord:{};
const token=(explicit?:string)=>String(explicit||process.env.GROQ_API_KEY||"").trim();
const state=(id:string)=>health.get(id)||{health:"HEALTHY" as VivitoProviderHealth,cooldownUntil:0,successes:0,failures:0};
function errorWithStatus(message:string,status:number){const e=new Error(message) as Error&{status?:number};e.status=status;return e}
function markFailure(id:string,error:unknown,status?:number){const failure=classifyVivitoProviderFailure(error,status),current=state(id);health.set(id,{...current,health:failure.health,cooldownUntil:failure.cooldownMs?Date.now()+failure.cooldownMs:0,failures:current.failures+1,lastErrorCode:failure.safeCode});return failure.safeCode}
function markSuccess(id:string,latencyMs:number){const current=state(id);health.set(id,{...current,health:"HEALTHY",cooldownUntil:0,successes:current.successes+1,lastLatencyMs:latencyMs,lastErrorCode:undefined})}
function available(id:string){const h=state(id);return h.health!=="AUTH_FAILURE"&&h.cooldownUntil<=Date.now()}
function boundedTimeout(options:Options){const n=Number(options.timeoutMs||15000);return Math.max(2000,Math.min(45000,Number.isFinite(n)?n:15000))}
export function groqFreeConfigured(){return Boolean(token())}
export function resetGroqFreeHealth(){health.clear();catalogCache=null}
export function groqFreeHealth(){return Object.fromEntries(GROQ_FREE_MODEL_IDS.map(id=>{const h=state(id);return[id,{...h,cooldownRemainingMs:Math.max(0,h.cooldownUntil-Date.now())}]}))}

export async function discoverGroqFreeModels(force=false,apiKey?:string):Promise<GroqFreeModelId[]>{
  const key=token(apiKey);if(!key)throw new Error("groq-free-not-configured");
  if(!force&&catalogCache&&catalogCache.expiresAt>Date.now())return catalogCache.models;
  const r=await fetch(`${BASE}/models`,{headers:{Authorization:`Bearer ${key}`},cache:"no-store",signal:AbortSignal.timeout(8000)});
  const d=asRecord(await r.json().catch(()=>({})));if(!r.ok){const err=asRecord(d.error);throw errorWithStatus(String(err.message||`groq-models-${r.status}`),r.status)}
  const rows=Array.isArray(d.data)?d.data:[],live=new Set(rows.map(x=>String(asRecord(x).id||"")));
  const models=GROQ_FREE_MODEL_IDS.filter(id=>live.has(id));catalogCache={models,expiresAt:Date.now()+60_000};return models;
}

function ordered(models:GroqFreeModelId[],task:VivitoMeshTask="general"){
  const pref=task==="coding"?["qwen/qwen3.8-27b","qwen/qwen3.6-27b","openai/gpt-oss-20b","openai/gpt-oss-120b"]:["openai/gpt-oss-120b","qwen/qwen3.8-27b","qwen/qwen3.6-27b","openai/gpt-oss-20b"];
  return pref.filter((id):id is GroqFreeModelId=>models.includes(id as GroqFreeModelId));
}

export async function generateViaGroqFreeMesh(prompt:string,system:string,options:Options={}){
  const key=token(options.apiKey);if(!key)throw new Error("groq-free-not-configured");const live=await discoverGroqFreeModels(false,key);
  let candidates=ordered(live,options.task);if(options.modelId){if(!GROQ_FREE_MODEL_IDS.includes(options.modelId as GroqFreeModelId))throw new Error("requested-groq-model-not-free-plan-approved");if(!live.includes(options.modelId as GroqFreeModelId))throw new Error("requested-groq-model-not-live");candidates=[options.modelId as GroqFreeModelId]}
  candidates=candidates.filter(available);if(!candidates.length)throw new Error("groq-free-no-healthy-models");const errors:string[]=[];
  for(const modelId of candidates){const started=Date.now();try{const r=await fetch(`${BASE}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(boundedTimeout(options)),body:JSON.stringify({model:modelId,stream:false,temperature:options.temperature??0.18,max_tokens:options.maxTokens||3200,messages:[{role:"system",content:system},{role:"user",content:prompt}]})});const d=asRecord(await r.json().catch(()=>({})));if(!r.ok){const apiError=asRecord(d.error),error=errorWithStatus(String(apiError.message||`groq-${r.status}`),r.status);errors.push(`${modelId}:${markFailure(modelId,error,r.status)}`);if(options.modelId)throw error;continue}const first=asRecord((Array.isArray(d.choices)?d.choices:[])[0]),message=asRecord(first.message),text=String(message.content||"").trim();if(!text){const error=new Error("groq-empty-response");errors.push(`${modelId}:${markFailure(modelId,error)}`);if(options.modelId)throw error;continue}markSuccess(modelId,Date.now()-started);return{text,modelId,errors,eligibleFreeModels:live.length}}catch(error:unknown){if(options.modelId)throw error;const status=error&&typeof error==="object"&&"status" in error?Number((error as {status?:unknown}).status):undefined;errors.push(`${modelId}:${markFailure(modelId,error,status)}`)}}
  throw new Error(`groq-free-all-models-failed:${errors.join("|")}`)
}
