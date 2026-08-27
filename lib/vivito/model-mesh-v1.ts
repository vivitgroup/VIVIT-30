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

export type VivitoMeshCandidate=VivitoMeshModel&{score:number;configured:boolean};

type MeshOptions={task?:VivitoMeshTask;maxTokens?:number;temperature?:number;timeoutMs?:number};

const MIN_TIMEOUT_MS=2000;
const DEFAULT_TIMEOUT_MS=25000;
const MAX_TIMEOUT_MS=45000;

function clamp(v:number,min:number,max:number){return Math.max(min,Math.min(max,v))}
function env(name:string){return String(process.env[name]||"").trim()}

export function loadVivitoModelMesh():VivitoMeshModel[]{
  const raw=env("VIVITO_MODEL_MESH_JSON");
  if(!raw)return [];
  try{
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed))return [];
    return parsed.filter((m:any)=>m&&typeof m.id==="string"&&typeof m.provider==="string"&&typeof m.model==="string"&&typeof m.baseUrl==="string"&&typeof m.apiKeyEnv==="string").map((m:any)=>({
      id:m.id.trim(),provider:m.provider.trim(),model:m.model.trim(),baseUrl:m.baseUrl.replace(/\/+$/,"").trim(),apiKeyEnv:m.apiKeyEnv.trim(),enabled:m.enabled!==false,
      quality:clamp(Number(m.quality??70),0,100),cost:clamp(Number(m.cost??50),0,100),latency:clamp(Number(m.latency??50),0,100),
      tasks:Array.isArray(m.tasks)?m.tasks:undefined,maxTokens:Number.isFinite(Number(m.maxTokens))?Number(m.maxTokens):undefined,
    }));
  }catch{return []}
}

export function rankVivitoMeshModels(task:VivitoMeshTask="general"):VivitoMeshCandidate[]{
  return loadVivitoModelMesh().filter(m=>m.enabled!==false).map(m=>{
    const configured=Boolean(env(m.apiKeyEnv));
    const taskFit=!m.tasks?.length||m.tasks.includes(task)?18:-20;
    const quality=(m.quality??70)*0.62;
    const cost=(100-(m.cost??50))*0.22;
    const latency=(100-(m.latency??50))*0.16;
    return {...m,configured,score:Math.round((quality+cost+latency+taskFit+(configured?12:-100))*100)/100};
  }).filter(m=>m.configured).sort((a,b)=>b.score-a.score);
}

function boundedTimeout(options:MeshOptions){const requested=Number(options.timeoutMs??process.env.VIVITO_PROVIDER_TIMEOUT_MS??DEFAULT_TIMEOUT_MS);if(!Number.isFinite(requested))return DEFAULT_TIMEOUT_MS;return Math.max(MIN_TIMEOUT_MS,Math.min(MAX_TIMEOUT_MS,Math.round(requested)))}

export async function generateViaVivitoMesh(prompt:string,system:string,options:MeshOptions={}){
  const candidates=rankVivitoMeshModels(options.task||"general");
  if(!candidates.length)throw new Error("mesh-not-configured");
  const errors:string[]=[];
  for(const candidate of candidates){
    try{
      const r=await fetch(`${candidate.baseUrl}/chat/completions`,{method:"POST",signal:AbortSignal.timeout(boundedTimeout(options)),headers:{"Content-Type":"application/json","Authorization":`Bearer ${env(candidate.apiKeyEnv)}`},body:JSON.stringify({model:candidate.model,temperature:options.temperature??0.18,max_tokens:Math.min(options.maxTokens||3200,candidate.maxTokens||options.maxTokens||3200),messages:[{role:"system",content:system},{role:"user",content:prompt}]})});
      const d:any=await r.json().catch(()=>({}));
      if(!r.ok){errors.push(`${candidate.id}:${r.status}`);continue}
      const text=String(d?.choices?.[0]?.message?.content||"").trim();
      if(!text){errors.push(`${candidate.id}:empty`);continue}
      return {text,modelId:candidate.id,provider:candidate.provider,errors};
    }catch(error){const code=(error as any)?.name==="TimeoutError"?"timeout":"failed";errors.push(`${candidate.id}:${code}`)}
  }
  throw new Error(`mesh-all-models-failed:${errors.join("|")}`);
}

export function vivitoMeshSummary(){
  const all=loadVivitoModelMesh();const configured=all.filter(m=>m.enabled!==false&&Boolean(env(m.apiKeyEnv)));
  return {registered:all.length,configured:configured.length,providers:new Set(configured.map(m=>m.provider)).size,models:configured.map(m=>m.id)};
}
