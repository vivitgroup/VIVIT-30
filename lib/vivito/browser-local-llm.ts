"use client";

type BrowserEngine={chat:{completions:{create:(input:unknown)=>Promise<unknown>}}};
type WebLLMModule={CreateMLCEngine:(model:string,options?:Record<string,unknown>)=>Promise<BrowserEngine>};
type CompletionRoot={choices?:Array<{message?:{content?:unknown}}>};

const MODULE_URL="https://esm.sh/@mlc-ai/web-llm@0.2.84";
const MODEL_CANDIDATES=["Qwen2.5-0.5B-Instruct-q4f16_1-MLC","SmolLM2-360M-Instruct-q4f32_1-MLC"] as const;
let enginePromise:Promise<{engine:BrowserEngine;modelId:string}>|null=null;

function webGpuAvailable(){return typeof navigator!=="undefined"&&"gpu" in navigator}
async function loadModule():Promise<WebLLMModule>{const mod=await import(/* webpackIgnore: true */ MODULE_URL) as unknown as WebLLMModule;if(typeof mod.CreateMLCEngine!=="function")throw new Error("browser-local-runtime-unavailable");return mod}

async function engine(onProgress?:(text:string)=>void){
  if(!webGpuAvailable())throw new Error("browser-webgpu-unavailable");
  if(!enginePromise){
    enginePromise=(async()=>{
      const mod=await loadModule(),errors:string[]=[];
      for(const modelId of MODEL_CANDIDATES){
        try{
          onProgress?.(`Loading free local AI (${modelId.startsWith("Qwen")?"Qwen":"compact fallback"})…`);
          const runtime=await mod.CreateMLCEngine(modelId,{initProgressCallback:(report:unknown)=>{const row=report&&typeof report==="object"?report as {text?:unknown;progress?:unknown}:{};const pct=Number(row.progress);const suffix=Number.isFinite(pct)?` ${Math.round(pct*100)}%`:"";onProgress?.(`${String(row.text||"Loading free local AI").slice(0,90)}${suffix}`)}});
          return{engine:runtime,modelId};
        }catch(error){errors.push(`${modelId}:${error instanceof Error?error.message:"failed"}`)}
      }
      throw new Error(`browser-local-models-unavailable:${errors.join("|")}`);
    })().catch(error=>{enginePromise=null;throw error});
  }
  return enginePromise;
}

export async function generateWithBrowserLocalVivito(input:{question:string;context:string;history?:Array<{role:string;content:string}>;onProgress?:(text:string)=>void}){
  const runtime=await engine(input.onProgress),history=(input.history||[]).slice(-8).map(turn=>({role:turn.role==="assistant"?"assistant":"user",content:String(turn.content||"").slice(0,1100)}));
  const system="You are VIVITO running locally in the user's browser as a zero-cost reasoning fallback. Answer in the user's language. Use the supplied authorized ERP summary only for ERP facts. Never invent missing ERP data. Never claim that an ERP write was executed; writes are handled only by the governed server action layer. Preserve conversational context, reason specifically about the user's request, and avoid canned answers.";
  const prompt=`USER REQUEST:\n${input.question.slice(0,2200)}\n\nAUTHORIZED ERP SUMMARY FOR THIS USER:\n${input.context.slice(0,10000)}\n\nReason over this request. If the summary does not contain a requested ERP fact, say the live fact is unavailable instead of guessing. For marketing/media-buying questions, explain the diagnosis and practical next step rather than repeating generic definitions.`;
  const result=await runtime.engine.chat.completions.create({messages:[{role:"system",content:system},...history,{role:"user",content:prompt}],temperature:0.18,max_tokens:1000}) as CompletionRoot;
  const text=String(result.choices?.[0]?.message?.content||"").trim();if(!text)throw new Error("browser-local-empty-response");
  return{text,modelId:runtime.modelId,provider:"browser-local" as const};
}

export function browserLocalVivitoSupported(){return webGpuAvailable()}
