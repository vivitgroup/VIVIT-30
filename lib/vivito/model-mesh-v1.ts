export type VivitoMeshTask="general"|"reasoning"|"creative"|"research"|"finance"|"coding"|"arabic";
export type VivitoMeshModel={
  id:string;
  provider:string;
  model:string;
  baseUrl:string;
  apiKeyEnv:string;
  enabled?:boolean;
  quality?:number;
  cost?:number;
  latency?:number;
  tasks?:VivitoMeshTask[];
  maxTokens?:number;
};

export type VivitoMeshHealth="HEALTHY"|"COOLDOWN"|"QUOTA_EXHAUSTED"|"AUTH_FAILURE"|"TEMPORARY_FAILURE"|"UNKNOWN_FAILURE";
export type VivitoMeshCandidate=VivitoMeshModel&{score:number;configured:boolean;health:VivitoMeshHealth;cooldownRemainingMs:number};

type MeshOptions={task?:VivitoMeshTask;maxTokens?:number;temperature?:number;timeoutMs?:number};
type MeshHealthState={health:VivitoMeshHealth;cooldownUntil:number;failures:number;successes:number;lastLatencyMs?:number;lastErrorCode?:string};

const MIN_TIMEOUT_MS=2000;
const DEFAULT_TIMEOUT_MS=25000;
const MAX_TIMEOUT_MS=45000;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS=60_000;
const DEFAULT_QUOTA_COOLDOWN_MS=15*60_000;
const healthLedger=new Map<string,MeshHealthState>();

function clamp(v:number,min:number,max:number){return Math.max(min,Math.min(max,v))}
function env(name:string){return String(process.env[name]||"").trim()}
function stateFor(id:string){return healthLedger.get(id)||{health:"HEALTHY" as VivitoMeshHealth,cooldownUntil:0,failures:0,successes:0}}
function sanitizeErrorCode(code:string){return code.replace(/[^a-z0-9_-]/gi,"-").slice(0,48).toLowerCase()}

export function loadVivitoModelMesh():VivitoMeshModel[]{
  const raw=env("VIVITO_MODEL_MESH_JSON");
  if(!raw)return [];
  try{
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed))return [];
    const seen=new Set<string>();
    return parsed.filter((m:any)=>m&&typeof m.id==="string"&&typeof m.provider==="string"&&typeof m.model==="string"&&typeof m.baseUrl==="string"&&typeof m.apiKeyEnv==="string").map((m:any)=>({
      id:m.id.trim(),provider:m.provider.trim(),model:m.model.trim(),baseUrl:m.baseUrl.replace(/\/+$/,"").trim(),apiKeyEnv:m.apiKeyEnv.trim(),enabled:m.enabled!==false,
      quality:clamp(Number(m.quality??70),0,100),cost:clamp(Number(m.cost??50),0,100),latency:clamp(Number(m.latency??50),0,100),
      tasks:Array.isArray(m.tasks)?m.tasks.filter((t:any)=>["general","reasoning","creative","research","finance","coding","arabic"].includes(String(t))):undefined,
      maxTokens:Number.isFinite(Number(m.maxTokens))?Math.max(1,Number(m.maxTokens)):undefined,
    })).filter((m:VivitoMeshModel)=>Boolean(m.id&&m.provider&&m.model&&m.baseUrl&&m.apiKeyEnv)&&!seen.has(m.id)&&(seen.add(m.id),true));
  }catch{return []}
}

export function vivitoMeshHealth(id:string,now=Date.now()){
  const state=stateFor(id);const remaining=Math.max(0,state.cooldownUntil-now);
  if(!remaining&&state.health==="COOLDOWN")return {...state,health:"HEALTHY" as VivitoMeshHealth,cooldownRemainingMs:0};
  return {...state,cooldownRemainingMs:remaining};
}

function markMeshSuccess(id:string,latencyMs:number){const current=stateFor(id);healthLedger.set(id,{...current,health:"HEALTHY",cooldownUntil:0,successes:current.successes+1,lastLatencyMs:latencyMs,lastErrorCode:undefined})}
function markMeshFailure(id:string,status:number,raw:string,now=Date.now()){
  const current=stateFor(id);const text=raw.toLowerCase();let health:VivitoMeshHealth="UNKNOWN_FAILURE";let cooldownMs=0;let code="provider-failure";
  if(status===401||status===403||/invalid api key|unauthorized|authentication|permission denied/.test(text)){health="AUTH_FAILURE";code="provider-auth-failure"}
  else if(status===429||/rate limit|too many requests|resource_exhausted/.test(text)){const quota=/quota|billing|free tier|daily limit|per day/.test(text);health=quota?"QUOTA_EXHAUSTED":"COOLDOWN";cooldownMs=quota?DEFAULT_QUOTA_COOLDOWN_MS:DEFAULT_RATE_LIMIT_COOLDOWN_MS;code=quota?"provider-quota-exhausted":"provider-rate-limited"}
  else if(status>=500||/timeout|temporar|unavailable|network|fetch failed|overloaded/.test(text)){health="TEMPORARY_FAILURE";cooldownMs=15_000;code="provider-temporary-failure"}
  healthLedger.set(id,{...current,health,cooldownUntil:cooldownMs?now+cooldownMs:0,failures:current.failures+1,lastErrorCode:sanitizeErrorCode(code)});
  return code;
}

export function resetVivitoMeshHealth(){healthLedger.clear()}

export function rankVivitoMeshModels(task:VivitoMeshTask="general",now=Date.now()):VivitoMeshCandidate[]{
  return loadVivitoModelMesh().filter(m=>m.enabled!==false).map(m=>{
    const configured=Boolean(env(m.apiKeyEnv));const health=vivitoMeshHealth(m.id,now);const cooling=health.cooldownRemainingMs>0;
    const taskFit=!m.tasks?.length||m.tasks.includes(task)?18:-20;
    const quality=(m.quality??70)*0.62;const cost=(100-(m.cost??50))*0.22;const latency=(100-(m.latency??50))*0.16;
    const healthPenalty=health.health==="AUTH_FAILURE"?-120:health.health==="QUOTA_EXHAUSTED"?-100:cooling?-80:health.health==="TEMPORARY_FAILURE"?-25:0;
    const observedLatencyPenalty=health.lastLatencyMs?Math.min(12,health.lastLatencyMs/4000):0;
    return {...m,configured,health:health.health,cooldownRemainingMs:health.cooldownRemainingMs,score:Math.round((quality+cost+latency+taskFit+(configured?12:-100)+healthPenalty-observedLatencyPenalty)*100)/100};
  }).filter(m=>m.configured&&m.health!=="AUTH_FAILURE"&&m.cooldownRemainingMs===0).sort((a,b)=>b.score-a.score);
}

function boundedTimeout(options:MeshOptions){const requested=Number(options.timeoutMs??process.env.VIVITO_PROVIDER_TIMEOUT_MS??DEFAULT_TIMEOUT_MS);if(!Number.isFinite(requested))return DEFAULT_TIMEOUT_MS;return Math.max(MIN_TIMEOUT_MS,Math.min(MAX_TIMEOUT_MS,Math.round(requested)))}

export async function generateViaVivitoMesh(prompt:string,system:string,options:MeshOptions={}){
  const candidates=rankVivitoMeshModels(options.task||"general");
  if(!candidates.length)throw new Error("mesh-not-configured-or-all-models-cooling-down");
  const errors:string[]=[];
  for(const candidate of candidates){
    const started=Date.now();
    try{
      const r=await fetch(`${candidate.baseUrl}/chat/completions`,{method:"POST",signal:AbortSignal.timeout(boundedTimeout(options)),headers:{"Content-Type":"application/json","Authorization":`Bearer ${env(candidate.apiKeyEnv)}`},body:JSON.stringify({model:candidate.model,temperature:options.temperature??0.18,max_tokens:Math.min(options.maxTokens||3200,candidate.maxTokens||options.maxTokens||3200),messages:[{role:"system",content:system},{role:"user",content:prompt}]})});
      const d:any=await r.json().catch(()=>({}));
      if(!r.ok){const raw=String(d?.error?.message||d?.message||`http-${r.status}`);const code=markMeshFailure(candidate.id,r.status,raw);errors.push(`${candidate.id}:${code}`);continue}
      const text=String(d?.choices?.[0]?.message?.content||"").trim();
      if(!text){markMeshFailure(candidate.id,0,"empty-response");errors.push(`${candidate.id}:empty-response`);continue}
      markMeshSuccess(candidate.id,Date.now()-started);return {text,modelId:candidate.id,provider:candidate.provider,errors};
    }catch(error){const raw=(error as any)?.name==="TimeoutError"?"timeout":String((error as any)?.message||"failed");const code=markMeshFailure(candidate.id,0,raw);errors.push(`${candidate.id}:${code}`)}
  }
  throw new Error(`mesh-all-models-failed:${errors.join("|")}`);
}

export function vivitoMeshSummary(){
  const all=loadVivitoModelMesh();const configured=all.filter(m=>m.enabled!==false&&Boolean(env(m.apiKeyEnv)));
  const health=Object.fromEntries(configured.map(m=>[m.id,vivitoMeshHealth(m.id)]));
  return {registered:all.length,configured:configured.length,providers:new Set(configured.map(m=>m.provider)).size,models:configured.map(m=>m.id),health};
}
