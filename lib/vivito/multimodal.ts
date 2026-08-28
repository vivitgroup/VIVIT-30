import {buildLiveKnowledgeResearchPolicy,loadVivitoLiveKnowledgeContext} from "./live-knowledge-fabric";

type VisionInput={mimeType:string;base64:string;prompt:string};
export type VivitoResearchSource={title:string;uri:string};
export type VivitoGroundedResearch={text:string;queries:string[];sources:VivitoResearchSource[]};
const endpoint=(model:string)=>`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
const model=()=>process.env.GEMINI_MULTIMODAL_MODEL||process.env.GEMINI_MODEL||"gemini-3.6-flash";
const safeJson=async(r:Response)=>r.json().catch(()=>({}));
const timeout=()=>AbortSignal.timeout(Math.max(3000,Math.min(45000,Number(process.env.VIVITO_PROVIDER_TIMEOUT_MS||25000))));

export async function analyzeVivitoImage(input:VisionInput){
 if(!process.env.GEMINI_API_KEY)throw new Error("gemini-not-configured");
 const mime=String(input.mimeType||"").toLowerCase();if(!["image/png","image/jpeg","image/jpg","image/webp"].includes(mime))throw new Error("unsupported-image-type");
 const bytes=Buffer.byteLength(input.base64||"","base64");if(!bytes||bytes>12*1024*1024)throw new Error("image-size-out-of-range");
 const system="You are VIVITO Visual Intelligence. Separate OBSERVATION from INFERENCE. Analyze composition, hierarchy, layout, typography, palette, lighting, perspective, product/logo integrity, visible text confidence, whitespace, brand cues, creative objective, strengths, weaknesses and precise design improvements. Never invent text or objects you cannot see.";
 const r=await fetch(endpoint(model()),{method:"POST",signal:timeout(),headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{inlineData:{mimeType:mime,data:input.base64}},{text:input.prompt||"Analyze this image professionally."}]}],generationConfig:{temperature:.12,maxOutputTokens:4500}})});const d=await safeJson(r);if(!r.ok)throw new Error(d?.error?.message||`gemini-vision-${r.status}`);const text=String(d?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text).filter(Boolean).join("\n")||"").trim();if(!text)throw new Error("vision-empty-response");return{text,model:model()}
}

export async function groundedVivitoResearch(workspaceId:string,prompt:string):Promise<VivitoGroundedResearch>{
 if(!workspaceId)throw new Error("workspace-required-for-grounded-research");
 if(!process.env.GEMINI_API_KEY)throw new Error("gemini-not-configured");
 const cached=await loadVivitoLiveKnowledgeContext(workspaceId,prompt).catch(()=>"Cached knowledge unavailable; rely on live search and disclose that limitation.");
 const system=`You are VIVITO Research Intelligence. Search when necessary. Prefer official/first-party and primary sources. State dates, geography, metric definitions and limitations. Distinguish fact, inference and recommendation. Never fabricate a citation or market statistic. Cached snapshots are evidence leads, not permission to skip live verification when the user asks for current information.\n\n${buildLiveKnowledgeResearchPolicy(prompt)}\n\nCACHED VERIFIED-SOURCE SNAPSHOTS:\n${cached}`;
 const r=await fetch(endpoint(model()),{method:"POST",signal:timeout(),headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{temperature:.12,maxOutputTokens:6000}})});const d=await safeJson(r);if(!r.ok)throw new Error(d?.error?.message||`gemini-search-${r.status}`);const c=d?.candidates?.[0],text=String(c?.content?.parts?.map((p:any)=>p.text).filter(Boolean).join("\n")||"").trim(),gm=c?.groundingMetadata||{};if(!text)throw new Error("research-empty-response");const sources=(Array.isArray(gm.groundingChunks)?gm.groundingChunks:[]).map((x:any)=>x?.web).filter((x:any)=>x?.uri).map((x:any)=>({title:String(x.title||"Source"),uri:String(x.uri)}));return{text,queries:Array.isArray(gm.webSearchQueries)?gm.webSearchQueries.map(String):[],sources}
}
