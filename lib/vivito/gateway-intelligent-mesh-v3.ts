import type {VivitoMeshTask} from "./model-mesh-v1";

type JsonRecord=Record<string,unknown>;
type RouteHealth={successes:number;failures:number;cooldownUntil:number;lastLatencyMs?:number;lastModelId?:string};
type FreeCatalogModel={id:string;ownedBy:string;tags:string[];released:number;contextWindow:number};
type CatalogCache={expiresAt:number;models:FreeCatalogModel[];source:"live"|"fallback"};
type GenerateOptions={task?:VivitoMeshTask;maxTokens?:number;timeoutMs?:number;modelId?:string};
const AI_GATEWAY_URL="https://ai-gateway.vercel.sh/v1/chat/completions",AI_GATEWAY_MODELS_URL="https://ai-gateway.vercel.sh/v1/models";
const ROUTE_COOLDOWN_MS=60_000,QUOTA_COOLDOWN_MS=15*60_000,CATALOG_CACHE_MS=15*60_000,MAX_ROUTING_MODELS=24,MAX_REQUEST_ATTEMPTS=12;
const routeHealth=new Map<string,RouteHealth>();let catalogCache:CatalogCache|null=null;
const EXPLICIT_FREE_MODEL_FALLBACK=["inclusionai/ling-3.0-tiny-free","inclusionai/ling-3.0-flash-fin-free","poolside/laguna-s-2.1-free"] as const;
const asRecord=(value:unknown):JsonRecord=>value&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};
const asArray=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const safeMessage=(value:unknown)=>String(value||"").replace(/[\r\n\t]+/g," ").slice(0,180);
const zeroPrice=(value:unknown)=>{const raw=String(value??"").trim();return raw!==""&&Number.isFinite(Number(raw))&&Number(raw)===0};
const stringArray=(value:unknown)=>asArray(value).map(String).filter(Boolean);
function healthFor(id:string,now=Date.now()){const state=routeHealth.get(id)||{successes:0,failures:0,cooldownUntil:0};return {...state,cooldownRemainingMs:Math.max(0,state.cooldownUntil-now)}}
function isTextLanguageModel(item:JsonRecord){if(String(item.type||"")!=="language")return false;const modalities=asRecord(item.modalities),input=stringArray(modalities.input),output=stringArray(modalities.output);return input.includes("text")&&output.includes("text")}
function isVerifiedZeroCost(item:JsonRecord){const pricing=asRecord(item.pricing);return zeroPrice(pricing.input)&&zeroPrice(pricing.output)}
function catalogModel(item:JsonRecord):FreeCatalogModel|null{const id=String(item.id||"").trim();if(!id||!isTextLanguageModel(item)||!isVerifiedZeroCost(item))return null;return{id,ownedBy:String(item.owned_by||"unknown"),tags:stringArray(item.tags),released:Number(item.released||0),contextWindow:Number(item.context_window||0)}}
function fallbackCatalog():FreeCatalogModel[]{return EXPLICIT_FREE_MODEL_FALLBACK.map(id=>({id,ownedBy:id.split("/")[0]||"unknown",tags:[],released:0,contextWindow:0}))}
export async function discoverVerifiedFreeGatewayModels(force=false){const now=Date.now();if(!force&&catalogCache&&catalogCache.expiresAt>now)return catalogCache;try{const response=await fetch(AI_GATEWAY_MODELS_URL,{signal:AbortSignal.timeout(5000),headers:{Accept:"application/json"}});if(!response.ok)throw new Error(`catalog-${response.status}`);const root=asRecord(await response.json()),models=asArray(root.data).map(asRecord).map(catalogModel).filter((model):model is FreeCatalogModel=>model!==null),unique=[...new Map(models.map(model=>[model.id,model])).values()].sort((a,b)=>b.released-a.released||a.id.localeCompare(b.id));if(!unique.length)throw new Error("catalog-no-verified-free-language-models");catalogCache={expiresAt:now+CATALOG_CACHE_MS,models:unique,source:"live"};return catalogCache}catch{const models=fallbackCatalog();catalogCache={expiresAt:now+60_000,models,source:"fallback"};return catalogCache}}
function taskScore(model:FreeCatalogModel,task:VivitoMeshTask){const tags=new Set(model.tags);let score=0;if(["reasoning","finance","research","coding"].includes(task)&&tags.has("reasoning"))score+=18;if(task==="coding"&&tags.has("tool-use"))score+=12;if(task==="research"&&tags.has("web-search"))score+=10;if(tags.has("tool-use"))score+=5;score+=Math.min(10,model.contextWindow/100000);score+=Math.min(8,Math.max(0,(model.released-1735689600)/31536000));return score}
function healthScore(modelId:string){const h=healthFor(modelId);return Math.min(10,h.successes*1.5)-Math.min(35,h.failures*6)-(h.cooldownRemainingMs>0?120:0)-(h.lastLatencyMs?Math.min(15,h.lastLatencyMs/2500):0)}
export async function gatewayModelOrder(task:VivitoMeshTask="general",limit=MAX_ROUTING_MODELS,modelId?:string){const catalog=await discoverVerifiedFreeGatewayModels(),ids=new Set(catalog.models.map(model=>model.id));if(modelId){if(!ids.has(modelId))throw new Error("gateway-model-not-verified-free");return[modelId]}return catalog.models.map(model=>({model,score:taskScore(model,task)+healthScore(model.id)})).sort((a,b)=>b.score-a.score).slice(0,clamp(limit,1,MAX_ROUTING_MODELS)).map(item=>item.model.id)}
function gatewayTimeout(options:GenerateOptions){const requested=Number(options.timeoutMs??process.env.VIVITO_PROVIDER_TIMEOUT_MS??25000);return clamp(Number.isFinite(requested)?Math.round(requested):25000,3000,45000)}
function markFailure(modelId:string,status:number,message:string){const h=healthFor(modelId),text=message.toLowerCase(),quota=status===429&&/quota|billing|daily|limit/.test(text),retryable=status===429||status>=500||/timeout|overload|unavailable|temporar|provider.*auth/.test(text);routeHealth.set(modelId,{successes:h.successes,failures:h.failures+1,cooldownUntil:Date.now()+(quota?QUOTA_COOLDOWN_MS:retryable?ROUTE_COOLDOWN_MS:0),lastLatencyMs:h.lastLatencyMs,lastModelId:h.lastModelId})}
function markSuccess(modelId:string,latencyMs:number){const h=healthFor(modelId);routeHealth.set(modelId,{successes:h.successes+1,failures:Math.max(0,h.failures-1),cooldownUntil:0,lastLatencyMs:latencyMs,lastModelId:modelId})}
function responseText(data:JsonRecord){const choice=asRecord(asArray(data.choices)[0]),message=asRecord(choice.message),raw=message.content;return(typeof raw==="string"?raw:asArray(raw).map(asRecord).map(part=>String(part.text||"")).join("\n")).trim()}
function providerAuthFailure(status:number,message:string){return status===401&&/provider[^.]{0,80}auth|provider authentication|provider-auth/i.test(message)}
export async function generateViaGatewayIntelligentMesh(prompt:string,system:string,token:string,options:GenerateOptions={}){
 if(!token)throw new Error("gateway-not-configured");
 const task=options.task||"general",catalog=await discoverVerifiedFreeGatewayModels(),ordered=await gatewayModelOrder(task,MAX_ROUTING_MODELS,options.modelId),models=ordered.filter(id=>healthFor(id).cooldownRemainingMs===0),candidates=(models.length?models:ordered).slice(0,options.modelId?1:MAX_REQUEST_ATTEMPTS),eligible=new Set(catalog.models.map(model=>model.id));
 if(!candidates.length)throw new Error("gateway-free-route-pool-empty");
 const errors:string[]=[];let lastStatus=0;
 for(const modelId of candidates){
  const started=Date.now();
  try{
   const body:JsonRecord={model:modelId,messages:[{role:"system",content:system},{role:"user",content:prompt}],stream:false,max_tokens:options.maxTokens||3200};
   const response=await fetch(AI_GATEWAY_URL,{method:"POST",signal:AbortSignal.timeout(gatewayTimeout(options)),headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json","ai-reporting-tags":"product:vivito,mode:erp-operating-agent,resilience:verified-free-model-retry-v4"},body:JSON.stringify(body)}),data=asRecord(await response.json().catch(()=>({}))),apiError=asRecord(data.error);
   lastStatus=response.status;
   if(!response.ok){const message=safeMessage(apiError.message||`gateway-${response.status}`);markFailure(modelId,response.status,message);errors.push(`${modelId}:${response.status}:${message}`);if(response.status===401&&!providerAuthFailure(response.status,message)){const error=new Error(`gateway-credential-rejected:${message}`) as Error&{status?:number};error.status=response.status;throw error}continue}
   const text=responseText(data);if(!text){markFailure(modelId,0,"empty-response");errors.push(`${modelId}:empty-response`);continue}
   const servedModel=String(data.model||modelId);if(!eligible.has(servedModel)){markFailure(modelId,0,"returned-model-outside-verified-free-pool");errors.push(`${modelId}:returned-model-outside-verified-free-pool`);continue}
   if(options.modelId&&servedModel!==options.modelId){markFailure(modelId,0,"model-override-not-honored");throw new Error("gateway-model-override-not-honored")}
   markSuccess(servedModel,Date.now()-started);return{text,modelId:servedModel,routeId:`${servedModel}:verified-free`,modelsAttempted:errors.length+1,eligibleFreeModels:catalog.models.length,catalogSource:catalog.source,fallbackModels:candidates.filter(id=>id!==modelId)};
  }catch(error:unknown){const status=Number(error&&typeof error==="object"&&"status" in error?(error as {status?:unknown}).status:0);if(status===401&&!providerAuthFailure(status,String(error instanceof Error?error.message:error)))throw error;const message=safeMessage(error instanceof Error?error.message:error);markFailure(modelId,status,message);errors.push(`${modelId}:${status||"network"}:${message}`)}
 }
 const error=new Error(`gateway-verified-free-pool-failed:${errors.slice(-8).join(" | ")}`) as Error&{status?:number};error.status=lastStatus;throw error
}
export async function gatewayMeshSummary(task:VivitoMeshTask="general"){const catalog=await discoverVerifiedFreeGatewayModels(),ordered=await gatewayModelOrder(task);return{routes:ordered.length,models:catalog.models.length,verifiedFreeModels:catalog.models.map(model=>model.id),catalogSource:catalog.source,topModels:ordered.slice(0,10),health:Object.fromEntries([...routeHealth.entries()].map(([id,state])=>[id,{...state,cooldownRemainingMs:Math.max(0,state.cooldownUntil-Date.now())}]))}}
export function resetGatewayMeshHealth(){routeHealth.clear();catalogCache=null}
