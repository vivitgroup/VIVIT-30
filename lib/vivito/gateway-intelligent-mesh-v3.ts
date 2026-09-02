import type {VivitoMeshTask} from "./model-mesh-v1";

type JsonRecord=Record<string,unknown>;
type Strategy="balanced"|"reasoning"|"fast"|"cost"|"resilient";
type RouteHealth={successes:number;failures:number;cooldownUntil:number;lastLatencyMs?:number;lastModelId?:string};
type ModelSpec={model:string;quality:number;cost:number;latency:number;tasks:VivitoMeshTask[];providerOrder?:string[]};
type GatewayRoute={id:string;model:string;strategy:Strategy;quality:number;cost:number;latency:number;tasks:VivitoMeshTask[];providerOrder?:string[];score?:number};

type GenerateOptions={task?:VivitoMeshTask;maxTokens?:number;timeoutMs?:number};
const AI_GATEWAY_URL="https://ai-gateway.vercel.sh/v1/chat/completions";
const ROUTE_COOLDOWN_MS=60_000;
const QUOTA_COOLDOWN_MS=15*60_000;
const routeHealth=new Map<string,RouteHealth>();
const asRecord=(value:unknown):JsonRecord=>value&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};
const asArray=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

const MODELS:ModelSpec[]=[
  {model:"inclusionai/ling-3.0-flash-fin",quality:84,cost:0,latency:8,tasks:["general","reasoning","research","finance","creative","coding","arabic"]},
  {model:"inclusionai/ling-3.0-flash-fin-free",quality:84,cost:0,latency:8,tasks:["general","reasoning","research","finance","creative","coding","arabic"]},
  {model:"google/gemini-3.6-flash",quality:91,cost:34,latency:18,tasks:["general","research","creative","coding","arabic"],providerOrder:["vertex","google"]},
  {model:"amazon/nova-2-lite",quality:80,cost:18,latency:20,tasks:["general","creative","research"]},
  {model:"mistral/mistral-medium-3.5",quality:88,cost:39,latency:28,tasks:["general","reasoning","creative","arabic"]},
  {model:"deepseek/deepseek-v3.2-thinking",quality:94,cost:31,latency:45,tasks:["reasoning","finance","research","coding"]},
  {model:"meta/muse-spark-1.2",quality:78,cost:16,latency:19,tasks:["general","creative"]},
  {model:"moonshotai/kimi-k2.6",quality:93,cost:43,latency:39,tasks:["general","reasoning","research","creative","coding","arabic"]},
  {model:"zai/glm-5.2",quality:90,cost:28,latency:34,tasks:["general","reasoning","research","coding","arabic"]},
  {model:"alibaba/qwen3-max-thinking",quality:92,cost:33,latency:38,tasks:["reasoning","research","finance","coding","arabic"]},
];

// Production defaults to models that the live Vercel catalog marks Free for
// both input and output. Keep the wider route registry for explicitly funded
// deployments, but never send a paid model from the no-billing path.
const FREE_GATEWAY_MODELS=[
  "inclusionai/ling-3.0-flash-fin",
  "inclusionai/ling-3.0-flash-fin-free",
] as const;

const STRATEGIES:Strategy[]=["balanced","reasoning","fast","cost","resilient"];
export const VIVITO_GATEWAY_ROUTES:GatewayRoute[]=MODELS.flatMap(spec=>STRATEGIES.map(strategy=>({
  id:`${spec.model}:${strategy}`,
  model:spec.model,
  strategy,
  quality:spec.quality,
  cost:spec.cost,
  latency:spec.latency,
  tasks:spec.tasks,
  providerOrder:strategy==="resilient"?spec.providerOrder:strategy==="fast"?spec.providerOrder?.slice().reverse():spec.providerOrder,
})));

function healthFor(routeId:string,now=Date.now()){
  const state=routeHealth.get(routeId)||{successes:0,failures:0,cooldownUntil:0};
  return {...state,cooldownRemainingMs:Math.max(0,state.cooldownUntil-now)};
}
function strategyBonus(strategy:Strategy,task:VivitoMeshTask){
  if(strategy==="reasoning"&&["reasoning","research","finance","coding"].includes(task))return 18;
  if(strategy==="fast"&&["general","creative","arabic"].includes(task))return 15;
  if(strategy==="cost"&&["general","creative"].includes(task))return 10;
  if(strategy==="resilient")return 8;
  return 6;
}
function scoreRoute(route:GatewayRoute,task:VivitoMeshTask,now=Date.now()){
  const h=healthFor(route.id,now);const taskFit=route.tasks.includes(task)?20:-14;
  const quality=route.quality*.58;const cost=(100-route.cost)*.18;const latency=(100-route.latency)*.16;
  const observedLatencyPenalty=h.lastLatencyMs?Math.min(14,h.lastLatencyMs/3000):0;
  const failurePenalty=Math.min(24,h.failures*4);const successBonus=Math.min(8,h.successes*1.2);
  const cooldownPenalty=h.cooldownRemainingMs>0?-120:0;
  return Math.round((quality+cost+latency+taskFit+strategyBonus(route.strategy,task)+successBonus-failurePenalty-observedLatencyPenalty+cooldownPenalty)*100)/100;
}

export function rankGatewayRoutes(task:VivitoMeshTask="general",now=Date.now()){
  return VIVITO_GATEWAY_ROUTES.map(route=>({...route,score:scoreRoute(route,task,now),health:healthFor(route.id,now)})).sort((a,b)=>b.score-a.score);
}

export function gatewayModelOrder(task:VivitoMeshTask="general",limit=10){
  const ranked=rankGatewayRoutes(task),seen=new Set<string>(),models:string[]=[];
  for(const route of ranked){if(route.health.cooldownRemainingMs>0||seen.has(route.model))continue;seen.add(route.model);models.push(route.model);if(models.length>=clamp(limit,1,10))break}
  if(models.length<Math.min(limit,10)){for(const spec of MODELS){if(seen.has(spec.model))continue;seen.add(spec.model);models.push(spec.model);if(models.length>=clamp(limit,1,10))break}}
  return models;
}
function bestRouteForModel(model:string,task:VivitoMeshTask){return rankGatewayRoutes(task).find(route=>route.model===model)}
function gatewayTimeout(options:GenerateOptions){const requested=Number(options.timeoutMs??process.env.VIVITO_PROVIDER_TIMEOUT_MS??25000);return clamp(Number.isFinite(requested)?Math.round(requested):25000,3000,45000)}
function safeMessage(value:unknown){return String(value||"").replace(/[\r\n\t]+/g," ").slice(0,180)}
function markFailure(routeId:string,status:number,message:string){const h=healthFor(routeId),text=message.toLowerCase();const quota=status===429&&/quota|billing|daily|limit/.test(text);const retryable=status===429||status>=500||/timeout|overload|unavailable|temporar/.test(text);routeHealth.set(routeId,{successes:h.successes,failures:h.failures+1,cooldownUntil:Date.now()+(quota?QUOTA_COOLDOWN_MS:retryable?ROUTE_COOLDOWN_MS:0),lastLatencyMs:h.lastLatencyMs,lastModelId:h.lastModelId})}
function markSuccess(routeId:string,latencyMs:number,modelId:string){const h=healthFor(routeId);routeHealth.set(routeId,{successes:h.successes+1,failures:Math.max(0,h.failures-1),cooldownUntil:0,lastLatencyMs:latencyMs,lastModelId:modelId})}

export async function generateViaGatewayIntelligentMesh(prompt:string,system:string,token:string,options:GenerateOptions={}){
  if(!token)throw new Error("gateway-not-configured");
  const task=options.task||"general",models=Array.from({length:10},(_,index)=>FREE_GATEWAY_MODELS[index%FREE_GATEWAY_MODELS.length]),primary=models[0];if(!primary)throw new Error("gateway-route-pool-empty");
  const route=bestRouteForModel(primary,task);const started=Date.now();
  const gatewayOptions:JsonRecord={models};if(route?.providerOrder?.length)gatewayOptions.order=route.providerOrder;
  const body:JsonRecord={model:primary,models,messages:[{role:"system",content:system},{role:"user",content:prompt}],stream:false,max_tokens:options.maxTokens||3200,providerOptions:{gateway:gatewayOptions}};
  const response=await fetch(AI_GATEWAY_URL,{method:"POST",signal:AbortSignal.timeout(gatewayTimeout(options)),headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json","ai-reporting-tags":"product:vivito,mode:erp-assistant,resilience:intelligent-50-route"},body:JSON.stringify(body)});
  const data=asRecord(await response.json().catch(()=>({}))),apiError=asRecord(data.error);
  if(!response.ok){const message=safeMessage(apiError.message||`gateway-${response.status}`);if(route)markFailure(route.id,response.status,message);const error=new Error(message) as Error&{status?:number};error.status=response.status;throw error}
  const choice=asRecord(asArray(data.choices)[0]),message=asRecord(choice.message),raw=message.content;
  const text=(typeof raw==="string"?raw:asArray(raw).map(asRecord).map(part=>String(part.text||"")).join("\n")).trim();if(!text){if(route)markFailure(route.id,0,"empty-response");throw new Error("gateway-empty-response")}
  const modelId=String(data.model||primary),actualRoute=bestRouteForModel(modelId,task)||route;if(actualRoute)markSuccess(actualRoute.id,Date.now()-started,modelId);
  return{text,modelId,routeId:actualRoute?.id||`${modelId}:gateway`,modelsAttempted:models.length,routeCount:VIVITO_GATEWAY_ROUTES.length};
}

export function gatewayMeshSummary(task:VivitoMeshTask="general"){
  const ranked=rankGatewayRoutes(task);return{routes:VIVITO_GATEWAY_ROUTES.length,models:MODELS.length,strategies:STRATEGIES.length,topRoutes:ranked.slice(0,10).map(r=>({id:r.id,score:r.score,health:r.health})),health:Object.fromEntries([...routeHealth.entries()].map(([id,state])=>[id,{...state,cooldownRemainingMs:Math.max(0,state.cooldownUntil-Date.now())}]))};
}

export function resetGatewayMeshHealth(){routeHealth.clear()}
