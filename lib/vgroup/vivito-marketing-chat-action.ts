import {createHash} from "node:crypto";
import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import type {VGroupSession} from "@/lib/vgroup/session";
import {canAccessBusinessUnit} from "@/lib/vgroup/contracts";
import {createMarketingHandoffAssertion} from "@/lib/vgroup/marketing-integration";
import {authorizeGroupHandoff} from "@/lib/group-handoff";
import {buildVivitoActionPlannerSystem,likelyVivitoActionIntent,parseVivitoActionProposal,type VivitoActionProposal} from "@/lib/vivito/action-engine";
import {generateVivito} from "@/lib/vivito/providers";

const NO_STORE={"Cache-Control":"private, no-store"};
const GROUP_MARKETING_HINT=/(client|task|campaign|lead|invoice|payment|expense|media|post|creative|عميل|تاسك|مهمه|مهمة|كامبين|حمله|حملة|ليد|فاتور|دفعة|مصروف|ميديا|بوست|كريتيف)/i;
const safe=(value:unknown)=>String(value||"").replace(/[\r\n\t]+/g," ").slice(0,220);

export function shouldTryGovernedMarketingChatAction(question:string,workspace:string){
  if(!likelyVivitoActionIntent(question))return false;
  return workspace==="marketing"||(workspace==="group"&&GROUP_MARKETING_HINT.test(question));
}

async function resolveLiveMarketingRole(session:VGroupSession){
  const {assertion}=createMarketingHandoffAssertion(session);
  return authorizeGroupHandoff(assertion);
}

export async function queueGovernedMarketingProposal(input:{proposal:VivitoActionProposal;session:VGroupSession;request:NextRequest}){
  const {proposal,session,request}=input;
  const key=`marketing:${createHash("sha256").update(`${session.userId}|${proposal.op}|${JSON.stringify(proposal.args)}`).digest("hex").slice(0,48)}`;
  const queued=await fetch(new URL("/api/vgroup/vivito/tasks",request.url),{
    method:"POST",
    headers:{"Content-Type":"application/json","Cookie":request.headers.get("cookie")??"","X-Vivito-Source":"chat"},
    body:JSON.stringify({capabilityKey:"marketing.task_execute",idempotencyKey:key,payload:{op:proposal.op,args:proposal.args}}),
    cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000),
  });
  const body=await queued.json().catch(()=>null) as {ok?:boolean;taskId?:string;status?:string;approvalRequired?:boolean;idempotentReplay?:boolean;task?:{id?:string;status?:string};error?:{code?:string;message?:string}}|null;
  if(!queued.ok&&queued.status!==202){
    const code=body?.error?.code||"GOVERNED_ACTION_FAILED",message=body?.error?.message||"The governed action could not be queued safely.";
    return NextResponse.json({error:{code,message}},{status:queued.status,headers:NO_STORE});
  }
  const taskId=body?.taskId||body?.task?.id||null,status=body?.status||body?.task?.status||"waiting_approval",replay=body?.idempotentReplay===true;
  return {taskId,status,replay,httpStatus:queued.status};
}

export async function validateBrowserMarketingProposal(input:{raw:string;session:VGroupSession}){
  const {raw,session}=input;
  if(!canAccessBusinessUnit(session,"marketing"))return {error:"MARKETING_ACCESS_FORBIDDEN" as const};
  const marketingUser=await resolveLiveMarketingRole(session);
  const proposal=parseVivitoActionProposal(raw,marketingUser.role);
  if(!proposal)return {error:"INVALID_OR_FORBIDDEN_ACTION" as const,role:marketingUser.role};
  return {proposal,role:marketingUser.role};
}

export async function tryGovernedMarketingChatAction(input:{question:string;workspace:string;session:VGroupSession;request:NextRequest;authorizedLiveData:unknown}){
  const {question,workspace,session,request,authorizedLiveData}=input;
  if(!shouldTryGovernedMarketingChatAction(question,workspace))return null;
  if(!canAccessBusinessUnit(session,"marketing"))return NextResponse.json({answer:"You do not have permission to execute Marketing actions from VIVITO.",provider:"local",modelId:"vivito-governed-action-router-v2"},{status:403,headers:NO_STORE});

  try{
    const marketingUser=await resolveLiveMarketingRole(session);
    const plannerSystem=buildVivitoActionPlannerSystem(marketingUser.role);
    const plannerPrompt=`USER REQUEST: ${question}\n\nAUTHORIZED ACTIVE CONTEXT (server-side only; use names exactly, never invent ids):\n${JSON.stringify(authorizedLiveData).slice(0,16000)}\n\nReturn one safe action proposal only.`;
    const generated=await generateVivito(plannerPrompt,plannerSystem,{task:"reasoning",maxTokens:900,timeoutMs:12000});
    const proposal=parseVivitoActionProposal(generated.text,marketingUser.role);
    if(!proposal)return null;
    if(proposal.missingFields.length){
      const arabic=/[\u0600-\u06ff]/.test(question);
      const answer=arabic?`محتاج البيانات دي قبل ما أنفذ: ${proposal.missingFields.join("، ")}.`:`I still need: ${proposal.missingFields.join(", ")}.`;
      return NextResponse.json({answer,provider:"local",modelId:"vivito-governed-action-router-v2",action:{op:proposal.op,status:"needs_input",missingFields:proposal.missingFields}},{headers:NO_STORE});
    }
    const queued=await queueGovernedMarketingProposal({proposal,session,request});
    if(queued instanceof NextResponse)return queued;
    const {taskId,status,replay,httpStatus}=queued;
    const arabic=/[\u0600-\u06ff]/.test(question);
    const answer=replay
      ?(arabic?`الطلب موجود بالفعل وحالته ${status}، ومش هكرر التنفيذ.`:`This request already exists with status ${status}; VIVITO will not execute it twice.`)
      :(arabic?`جهزت الأمر: ${proposal.summary}. حالته ${status} وبيحتاج الموافقة قبل التنفيذ الفعلي.`:`Prepared: ${proposal.summary}. Status: ${status}; approval is required before the real write executes.`);
    return NextResponse.json({answer,provider:"local",modelId:generated.modelId||"vivito-governed-action-router-v2",action:{op:proposal.op,args:proposal.args,risk:proposal.risk,taskId,status,approvalRequired:true,idempotentReplay:replay}},{status:httpStatus===202?202:200,headers:NO_STORE});
  }catch(error:unknown){
    console.warn("VIVITO governed Marketing action planning failed",{error:safe(error instanceof Error?error.message:error)});
    return null;
  }
}
