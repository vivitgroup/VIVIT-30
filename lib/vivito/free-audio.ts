type JsonRecord=Record<string,unknown>;
type AudioKind="speech"|"transcription";
type CatalogModel={id?:unknown;type?:unknown;tags?:unknown;pricing?:unknown};

const CATALOG_URL="https://ai-gateway.vercel.sh/v1/models";
export const VIVITO_FREE_TRANSCRIPTION_MODELS=["fish-audio/transcribe-1-free","fish-audio/transcribe-1"] as const;
export const VIVITO_FREE_SPEECH_MODELS=["fish-audio/s2.1-pro-free","fish-audio/s2-pro-free","fish-audio/s1-free","fish-audio/s2.1-pro"] as const;
const CACHE_MS=5*60_000;
let cached:{until:number;models:CatalogModel[]}|null=null;

const record=(value:unknown):JsonRecord=>value&&typeof value==="object"&&!Array.isArray(value)?value as JsonRecord:{};
const array=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const explicitFree=(id:string)=>id.endsWith("-free");
function pricingIsZero(value:unknown){
 const pricing=record(value),values=Object.values(pricing);if(!values.length)return true;
 return values.every(v=>{if(v&&typeof v==="object")return pricingIsZero(v);const n=Number(v??0);return Number.isFinite(n)&&n===0});
}
function catalogSaysFree(model:CatalogModel,kind:AudioKind){
 const id=String(model.id||""),type=String(model.type||""),tags=array(model.tags).map(String);
 return Boolean(id)&&type===kind&&tags.includes("free")&&pricingIsZero(model.pricing);
}
async function catalog(){
 if(cached&&cached.until>Date.now())return cached.models;
 const response=await fetch(CATALOG_URL,{signal:AbortSignal.timeout(5000),cache:"no-store"});
 if(!response.ok)throw new Error(`audio-catalog-${response.status}`);
 const root=record(await response.json()),models=array(root.data).map(x=>record(x) as CatalogModel);cached={until:Date.now()+CACHE_MS,models};return models;
}
export function vivitoGatewayToken(){return String(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||"").trim()}
export async function verifiedFreeAudioModels(kind:AudioKind,candidates:readonly string[]){
 try{const models=await catalog(),byId=new Map(models.map(model=>[String(model.id||""),model]));return candidates.filter(id=>{const found=byId.get(id);return found?catalogSaysFree(found,kind):false})}
 catch{return candidates.filter(explicitFree)}
}
export function safeGatewayError(value:unknown){const root=record(value),error=record(root.error);return String(error.message||root.message||"audio-provider-error").replace(/[\r\n\t]+/g," ").slice(0,180)}
