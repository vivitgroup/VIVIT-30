export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {decideVivitoDirectEvent,resolveVivitoWorkspaceForUser} from "@/lib/vivito/direct-runtime";

type DirectEventRow={id:string;workspace_id:string;client_id:string|null;signal_type:string;action_op:string;approval_mode:string;status:string;actor_id:string;created_at:string|Date;outcome_checks:number|string};
type SummaryRow={status:string;count:number|string};
type EscalationRow={id:string;workspace_id:string;event_id:string|null;client_id:string|null;assigned_to_id:string|null;severity:string;status:string;dedupe_key:string;message:string;created_at:string|Date};
type DirectDecision="approve"|"reject";
const isDirectDecision=(value:string):value is DirectDecision=>value==="approve"||value==="reject";

export async function GET(req:NextRequest){
 const s=await auth();if(!s?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String(s.user.role||""),userId=String(s.user.id||"");
 if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return NextResponse.json({events:[]},{headers:{"Cache-Control":"private, no-store"}});
 try{
  const workspaceId=await resolveVivitoWorkspaceForUser(userId),status=req.nextUrl.searchParams.get("status")||"ALL";
  const statusClause=status==="ALL"?sql``:sql`and e.status=${status}`;
  const q=role==="SUPER_ADMIN"?sql`select e.*,(select count(*)::int from vivito_outcome_checks o where o.event_id=e.id and o.workspace_id=e.workspace_id) outcome_checks from vivito_autonomy_events e where e.workspace_id=${workspaceId} ${statusClause} order by e.created_at desc limit 150`:role==="ACCOUNT_MANAGER"?sql`select e.*,(select count(*)::int from vivito_outcome_checks o where o.event_id=e.id and o.workspace_id=e.workspace_id) outcome_checks from vivito_autonomy_events e join clients c on c.id=e.client_id and c.workspace_id=e.workspace_id where e.workspace_id=${workspaceId} and c.account_manager_id=${userId} ${statusClause} order by e.created_at desc limit 150`:sql`select e.*,(select count(*)::int from vivito_outcome_checks o where o.event_id=e.id and o.workspace_id=e.workspace_id) outcome_checks from vivito_autonomy_events e join clients c on c.id=e.client_id and c.workspace_id=e.workspace_id where e.workspace_id=${workspaceId} and c.media_buyer_id=${userId} ${statusClause} order by e.created_at desc limit 150`;
  const events=Array.from(await db.execute<DirectEventRow>(q));
  const summary=Array.from(await db.execute<SummaryRow>(sql`select status,count(*)::int count from vivito_autonomy_events where workspace_id=${workspaceId} group by status`));
  const escalations=role==="SUPER_ADMIN"?Array.from(await db.execute<EscalationRow>(sql`select id,workspace_id,event_id,client_id,assigned_to_id,severity,status,dedupe_key,message,created_at from vivito_escalations where workspace_id=${workspaceId} and status<>'RESOLVED' order by created_at desc limit 50`)):[];
  return NextResponse.json({events,summary,escalations,workspaceId},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e:unknown){return NextResponse.json({events:[],schemaReady:false,error:e instanceof Error?e.message:String(e)},{status:503,headers:{"Cache-Control":"private, no-store"}})}
}

export async function POST(req:NextRequest){
 const s=await auth();if(!s?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String(s.user.role||""),userId=String(s.user.id||"");
 if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return NextResponse.json({error:"Not authorized"},{status:403});
 const b=await req.json().catch(()=>({})),eventId=String(b.eventId||""),decision=String(b.decision||"").toLowerCase();
 if(!eventId||!isDirectDecision(decision))return NextResponse.json({error:"eventId and decision=approve|reject are required."},{status:409});
 if(decision==="approve"&&b.confirm!==true)return NextResponse.json({error:"Explicit confirm=true is required for approval."},{status:409});
 if(decision==="reject"&&!String(b.reason||"").trim())return NextResponse.json({error:"A rejection reason is required."},{status:409});
 try{const workspaceId=await resolveVivitoWorkspaceForUser(userId);return NextResponse.json(await decideVivitoDirectEvent(eventId,decision,String(b.reason||"Explicit confirmation"),role,userId,workspaceId),{headers:{"Cache-Control":"private, no-store"}})}catch(e:unknown){const status=e&&typeof e==="object"&&"status" in e?Number(e.status||400):400;return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status,headers:{"Cache-Control":"private, no-store"}})}
}
