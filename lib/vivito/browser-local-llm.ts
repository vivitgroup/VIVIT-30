"use client";

type BrowserEngine={chat:{completions:{create:(input:unknown)=>Promise<unknown>}}};
type WebLLMModule={CreateMLCEngine:(model:string,options?:Record<string,unknown>)=>Promise<BrowserEngine>};
type CompletionRoot={choices?:Array<{message?:{content?:unknown}}>};

const MODULE_URL="https://esm.sh/@mlc-ai/web-llm@0.2.84";
const MODEL_CANDIDATES=["Qwen2.5-0.5B-Instruct-q4f16_1-MLC","SmolLM2-360M-Instruct-q4f32_1-MLC"] as const;
let enginePromise:Promise<{engine:BrowserEngine;modelId:string}>|null=null;

function webGpuAvailable(){return typeof navigator!=="undefined"&&"gpu" in navigator}
async function loadModule():Promise<WebLLMModule>{const mod=await import(/* webpackIgnore: true */ MODULE_URL) as unknown as WebLLMModule;if(typeof mod.CreateMLCEngine!=="function")throw new Error("browser-local-runtime-unavailable");return mod}
function textOf(result:CompletionRoot){return String(result.choices?.[0]?.message?.content||"").trim()}
function stripFence(raw:string){const t=raw.trim();return t.startsWith("```")?t.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim():t}

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
  const text=textOf(result);if(!text)throw new Error("browser-local-empty-response");
  return{text,modelId:runtime.modelId,provider:"browser-local" as const};
}

export async function planActionWithBrowserLocalVivito(input:{question:string;context:string;onProgress?:(text:string)=>void}){
  const runtime=await engine(input.onProgress);
  const system=`You are a local JSON-only ERP action planner. Convert ONE explicit user command into ONE action proposal. Never claim execution. Return only strict JSON with keys op, summary, args, risk, requiresConfirmation, missingFields. Allowed op values: create_client, update_client, add_client_contact, archive_client, restore_client, delete_client, create_task, update_task, reassign_task, archive_task, restore_task, delete_task, schedule_post, mark_posted, create_lead, update_lead, move_lead, archive_lead, log_expense, record_payment, create_invoice, attach_file, remind_me, create_user, update_user, set_user_active, create_leave_request, decide_leave, upsert_payroll, set_payroll_status, create_contract, update_contract, update_workspace_settings, send_email, send_whatsapp, create_api_key, revoke_api_key, create_webhook, revoke_webhook, sync_campaign, update_campaign, start_integration, disconnect_integration, export_data, generate_report, update_onboarding, record_nps, create_referral, bulk_update_tasks, bulk_remind_clients. If the command is not explicit, return {"op":"none"}. Use names from AUTHORIZED CONTEXT exactly when present. Never invent ids. create_task requires clientName,title,brief,deadline. record_payment requires clientName,amount. create_invoice requires clientName,month,year,retainer. create_lead requires companyName. High-risk or destructive operations still set requiresConfirmation=true.`;
  const prompt=`USER COMMAND:\n${input.question.slice(0,2200)}\n\nAUTHORIZED CONTEXT:\n${input.context.slice(0,10000)}\n\nReturn strict JSON only.`;
  const result=await runtime.engine.chat.completions.create({messages:[{role:"system",content:system},{role:"user",content:prompt}],temperature:0,max_tokens:700}) as CompletionRoot;
  const raw=stripFence(textOf(result));if(!raw)throw new Error("browser-local-action-empty");
  let proposal:unknown;try{proposal=JSON.parse(raw)}catch{throw new Error("browser-local-action-invalid-json")}
  return{proposal,raw,modelId:runtime.modelId,provider:"browser-local" as const};
}

export function browserLocalVivitoSupported(){return webGpuAvailable()}
