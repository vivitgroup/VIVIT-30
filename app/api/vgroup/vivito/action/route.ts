import {NextRequest,NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {canAccessBusinessUnit} from "@/lib/vgroup/contracts";
import {queueGovernedMarketingProposal,validateBrowserMarketingProposal} from "@/lib/vgroup/vivito-marketing-chat-action";

export const dynamic="force-dynamic";
const NO_STORE={"Cache-Control":"private, no-store"};

export async function POST(request:NextRequest){
  const session=await getVGroupSession();
  if(!session)return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Unauthorized"}},{status:401,headers:NO_STORE});
  if(!canAccessBusinessUnit(session,"marketing"))return NextResponse.json({error:{code:"MARKETING_ACCESS_FORBIDDEN",message:"Current user has no Marketing business-unit access"}},{status:403,headers:NO_STORE});
  const body=await request.json().catch(()=>null) as {proposal?:unknown;question?:unknown}|null;
  const raw=typeof body?.proposal==="string"?body.proposal:JSON.stringify(body?.proposal??{});
  if(raw.length<2||raw.length>12000)return NextResponse.json({error:{code:"INVALID_ACTION_PROPOSAL",message:"Action proposal is invalid"}},{status:400,headers:NO_STORE});
  try{
    const checked=await validateBrowserMarketingProposal({raw,session});
    if("error" in checked)return NextResponse.json({error:{code:checked.error,message:"Action is invalid or not allowed for the live Marketing role"}},{status:403,headers:NO_STORE});
    const proposal=checked.proposal;
    if(proposal.missingFields.length){
      return NextResponse.json({ok:false,status:"needs_input",missingFields:proposal.missingFields,action:{op:proposal.op,risk:proposal.risk}},{status:400,headers:NO_STORE});
    }
    const queued=await queueGovernedMarketingProposal({proposal,session,request});
    if(queued instanceof NextResponse)return queued;
    const arabic=/[\u0600-\u06ff]/.test(String(body?.question||proposal.summary));
    const answer=queued.replay
      ?(arabic?`الطلب موجود بالفعل وحالته ${queued.status}، ومش هكرر التنفيذ.`:`This request already exists with status ${queued.status}; it will not execute twice.`)
      :(arabic?`جهزت الأمر: ${proposal.summary}. حالته ${queued.status} وبيحتاج الموافقة قبل التنفيذ الفعلي.`:`Prepared: ${proposal.summary}. Status: ${queued.status}; approval is required before the real write executes.`);
    return NextResponse.json({ok:true,answer,action:{op:proposal.op,args:proposal.args,risk:proposal.risk,taskId:queued.taskId,status:queued.status,approvalRequired:true,idempotentReplay:queued.replay}},{status:queued.httpStatus===202?202:200,headers:NO_STORE});
  }catch{
    return NextResponse.json({error:{code:"ACTION_VALIDATION_FAILED",message:"VIVITO could not validate this action safely"}},{status:503,headers:NO_STORE});
  }
}
