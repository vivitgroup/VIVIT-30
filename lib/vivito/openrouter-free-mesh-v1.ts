import type {VivitoMeshTask} from "./model-mesh-v1";

type JsonRecord=Record<string,unknown>;
type FreeModel={id:string;created:number;contextLength:number;parameters:string[];reasoning:boolean};
type Cache={expiresAt:number;models:FreeModel[]};
type Options={task?:VivitoMeshTask;maxTokens?:number;temperature?:number;timeoutMs?:number;modelId?:string};
const MODELS_URL="https://openrouter.ai/api/v1/models";
const CHAT_URL="https://openrouter.ai/api/v1/chat/completions";
const CACHE_MS=15*60_000;
const health=new Map<string,{successes:number;failures:number;cooldownUntil:number;lastLatencyMs?:number}>();
let cache:Cache|null=null;
const asRecord=(v:unknown):JsonRecord=>v&&typeof v==="object"&&!Array.isArray(v)?v as JsonRecord:{};
const asArray=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const stringArray=(v:unknown)=>asArray(v).map(String).filter(Boolean);
const isZero=(v:unknown)=>{const raw=String(v??"").trim();return raw!==""&&Number(raw)===0};
const bounded=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function openRouterFreeConfigured(){return Boolean(String(process.env.OPENROUTER_API_KEY||"").trim())}
function parseModel(value:unknown):FreeModel|null{
  const item=asRecord(value),id=String(item.id||"").trim(),pricing=asRecord(item.pricing),architecture=asRecord(item.architecture),inputs=stringArray(architecture.input_modalities),outputs=stringArray(architecture.output_modalities),parameters=stringArray(item.supported_parameters);
  if(!id.endsWith(":free")||!isZero(pricing.prompt)||!isZero(pricing.completion)||!inputs.includes("text")||!outputs.includes("text"))return null;
  return {id,created:Number(item.created||0),contextLength:Number(item.context_length||0),parameters,reasoning:Boolean(asRecord(item.reasoning).mandatory||asRecord(item.reasoning).default_enabled)};
}
export async function discoverOpenRouterFreeModels(force=false){
  const now=Date.now();if(!force&&cache&&cache.expiresAt>now)return cache.models;
  const response=await fetch(MODELS_URL,{headers:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error(`openrouter-catalog-${response.status}`);
  const root=asRecord(await response.json()),models=asArray(root.data).map(parseModel).filter((m):m is FreeModel=>m!==null);
  const unique=[...new Map(models.map(m=>[m.id,m])).values()].sort((a,b)=>b.created-a.created||a.id.localeCompare(b.id));if(!unique.length)throw new Error("openrouter-no-free-models");
  cache={expiresAt:now+15*60_000,models:unique};return unique;
}
function modelScore(model:FreeModel,task:VivitoMeshTask){
  const h=health.get(model.id)||{successes:0,failures:0,cooldownUntil:0};let score=Math.min(12,model.contextLength/100000)+Math.min(8,h.successes*1.5)-Math.min(30,h.failures*5);
  if(h.cooldownUntil>Date.now())score-=120;if(model.reasoning&&["reasoning","research","finance","coding"].includes(task))score+=18;if(model.parameters.includes("tools"))score+=8;if(model.parameters.includes("structured_outputs"))score+=5;return score;
}
export async function openRouterFreeModelOrder(task:VivitoMeshTask="general",limit=24,modelId?:string){
  const models=await discoverOpenRouterFreeModels();const ids=new Set(models.map(m=>m.id));if(modelId){if(!ids.has(modelId))throw new Error("openrouter-model-not-verified-free");return [modelId]}
  return models.map(model=>({model,score:modelScore(model,task)})).sort((a,b)=>b.score-a.score).slice(0,bounded(limit,1,24)).map(x=>x.model.id);
}
function markFailure(id:string,status:number){const old=health.get(id)||{successes:0,failures:0,cooldownUntil:0};health.set(id,{...old,failures:old.failures+1,cooldownUntil:Date.now()+(status===429?15*60_000:status>=500?60_000:0)})}
function markSuccess(id:string,latencyMs:number){const old=health.get(id)||{successes:0,failures:0,cooldownUntil:0};health.set(id,{successes:old.successes+1,failures:Math.max(0,old.failures-1),cooldownUntil:0,lastLatencyMs:latencyMs})}
export async function generateViaOpenRouterFreeMesh(prompt:string,system:string,options:Options={}){
  const key=String(process.env.OPENROUTER_API_KEY||"").trim();if(!key)throw new Error("openrouter-not-configured");const task=options.task||"general",models=await openRouterFreeModelOrder(task,24,options.modelId),errors:string[]=[];
  for(const model of models){const started=Date.now();try{
    const response=await fetch(CHAT_URL,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","HTTP-Referer":String(process.env.NEXT_PUBLIC_APP_URL||"https://vivit-erp-theta.vercel.app"),"X-Title":"VIVITO Operating Agent"},body:JSON.stringify({model,messages:[{role:"system",content:system},{role:"user",content:prompt}],max_tokens:options.maxTokens||3200,temperature:options.temperature??0.18}),cache:"no-store",signal:AbortSignal.timeout(bounded(Number(options.timeoutMs||25000),3000,45000))});
    const data=asRecord(await response.json().catch(()=>({})));if(!response.ok){markFailure(model,response.status);errors.push(`${model}:HTTP_${response.status}`);if(options.modelId)break;continue}
    const choice=asRecord(asArray(data.choices)[0]),message=asRecord(choice.message),text=String(message.content||"").trim();if(!text){markFailure(model,0);errors.push(`${model}:EMPTY`);continue}
    const returned=String(data.model||model);if(returned!==model)throw new Error("openrouter-returned-unexpected-model");markSuccess(model,Date.now()-started);return {text,modelId:model,provider:"openrouter-free",errors,modelsAttempted:errors.length+1,eligibleFreeModels:(await discoverOpenRouterFreeModels()).length};
  }catch(error:unknown){markFailure(model,0);errors.push(`${model}:${error instanceof Error?error.message:"FAILED"}`)}}
  throw new Error(`openrouter-free-pool-failed:${errors.slice(-8).join("|")}`);
}
export async function openRouterFreeSummary(){const models=await discoverOpenRouterFreeModels();return {configured:openRouterFreeConfigured(),models:models.length,modelIds:models.map(m=>m.id),health:Object.fromEntries(health)}}
export function resetOpenRouterFreeHealth(){health.clear();cache=null}
