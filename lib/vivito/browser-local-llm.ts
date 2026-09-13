"use client";

type BrowserEngine={chat:{completions:{create:(input:unknown)=>Promise<unknown>}}};
type WebLLMModule={CreateMLCEngine:(model:string,options?:Record<string,unknown>)=>Promise<BrowserEngine>};

type CompletionRoot={choices?:Array<{message?:{content?:unknown}}>};

const MODEL_ID="SmolLM2-360M-Instruct-q4f32_1-MLC";
const MODULE_URL="https://esm.sh/@mlc-ai/web-llm@0.2.84";
let enginePromise:Promise<BrowserEngine>|null=null;

function webGpuAvailable(){return typeof navigator!=="undefined"&&"gpu" in navigator}

async function loadModule():Promise<WebLLMModule>{
  // Variable dynamic import keeps the heavy runtime completely client-side and
  // out of the Vercel bundle. No API key or server compute is required.
  const mod=await import(/* webpackIgnore: true */ MODULE_URL) as unknown as WebLLMModule;
  if(typeof mod.CreateMLCEngine!=="function")throw new Error("browser-local-runtime-unavailable");
  return mod;
}

async function engine(onProgress?:(text:string)=>void){
  if(!webGpuAvailable())throw new Error("browser-webgpu-unavailable");
  if(!enginePromise){
    enginePromise=loadModule().then(mod=>mod.CreateMLCEngine(MODEL_ID,{
      initProgressCallback:(report:unknown)=>{
        const row=report&&typeof report==="object"?report as {text?:unknown;progress?:unknown}:{};
        const pct=Number(row.progress);const suffix=Number.isFinite(pct)?` ${Math.round(pct*100)}%`:"";
        onProgress?.(`${String(row.text||"Loading free local AI").slice(0,90)}${suffix}`);
      },
    })).catch(error=>{enginePromise=null;throw error});
  }
  return enginePromise;
}

export async function generateWithBrowserLocalVivito(input:{question:string;context:string;history?:Array<{role:string;content:string}>;onProgress?:(text:string)=>void}){
  const runtime=await engine(input.onProgress);
  const history=(input.history||[]).slice(-6).map(turn=>({role:turn.role==="assistant"?"assistant":"user",content:String(turn.content||"").slice(0,900)}));
  const system="You are VIVITO running locally in the user's browser as a zero-cost emergency reasoning fallback. Answer in the user's language. Use the supplied authorized ERP summary only for ERP facts. Never invent missing ERP data. Never claim that an ERP write was executed; writes are handled only by the governed server action layer. Be concise, practical, and avoid canned responses.";
  const prompt=`USER REQUEST:\n${input.question.slice(0,1800)}\n\nAUTHORIZED ERP SUMMARY FOR THIS USER:\n${input.context.slice(0,8000)}\n\nReason over this request. If the summary does not contain a requested ERP fact, state that the live fact is unavailable instead of guessing.`;
  const result=await runtime.chat.completions.create({messages:[{role:"system",content:system},...history,{role:"user",content:prompt}],temperature:0.2,max_tokens:850}) as CompletionRoot;
  const text=String(result.choices?.[0]?.message?.content||"").trim();if(!text)throw new Error("browser-local-empty-response");
  return{text,modelId:MODEL_ID,provider:"browser-local" as const};
}

export function browserLocalVivitoSupported(){return webGpuAvailable()}
