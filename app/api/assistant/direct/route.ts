export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {decideVivitoDirectEvent,resolveVivitoWorkspaceForUser} from "@/lib/vivito/direct-runtime";
const rows=(v:any)=>Array.from(v as any) as any[];

export async function GET(req:NextRequest){
 const s=await auth();if(!s?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String((s.user as any).role||""),userId=String((s.user as any).id||"");
 if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return NextResponse.json({events:[]},{headers:{"Cache-Control":"private, no-store"}});
 try{
  const workspaceId=await resolveVivitoWorkspaceForUser(userId),status=req.nextUrl.searchParams.get("status")||"ALL";let q:any;
  const statusClause=status==="ALL"?sql``:sql`and e.status=${status}`;
  if(role==="SUPER_ADMIN")q=sql`select e.*,(select count(*)::int from vivito_outcome_checks o where o.event_id=e.id and o.workspace_id=e.workspace_id) outcome_checks from vivito_autonomy_events e where e.workspace_id=${workspaceId} ${statusClause} order by e.created_at desc limit 150`;
  else if(role==="ACCOUNT_MANAGER")q=sql`select e.*,(select count(*)::int from vivito_outcome_checks o where o.event_id=e.id and o.workspace_id=e.workspace_id) outcome_checks from vivito_autonomy_events e join clients c on c.id=e.client_id and c.workspace_id=e.workspace_id where e.workspace_id=${workspaceId} and c.account_manager_id=${userId} ${statusClause} order by e.created_at desc limit 150`;
  else q=sql`select e.*,(select count(*)::int from vivito_outcome_checks o where o.event_id=e.id and o.workspace_id=e.workspace_id) outcome_checks from vivito_autonomy_events e join clients c on c.id=e.client_id and c.workspace_id=e.workspace_id where e.workspace_id=${workspaceId} and c.media_buyer_id=${userId} ${statusClause} order by e.created_at desc limit 150`;
  const events=rows(await db.execute(q));
  const summary=rows(await db.execute(sql`select status,count(*)::int count from vivito_autonomy_events where workspace_id=${workspaceId} group by status`));
  const escalations=role==="SUPER_ADMIN"?rows(await db.execute(sql`select * from vivito_escalations where workspace_id=${workspaceId} and status<>'RESOLVED' order by created_at desc limit 50`)):[];
  return NextResponse.json({events,summary,escalations,workspaceId},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e:any){return NextResponse.json({events:[],schemaReady:false,error:String(e?.message||e)},{status:503,headers:{"Cache-Control":"private, no-store"}})}
}

export async function POST(req:NextRequest){
 const s=await auth();if(!s?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const role=String((s.user as any).role||""),userId=String((s.user as any).id||"");
 if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role))return NextResponse.json({error:"Not authorized"},{status:403});
 const b=await req.json().catch(()=>({})),eventId=String(b.eventId||""),decision=String(b.decision||"").toLowerCase();
 if(!eventId||!["approve","reject"].includes(decision))return NextResponse.json({error:"eventId and decision=approve|reject are required."},{status:409});
 if(decision==="approve"&&b.confirm!==true)return NextResponse.json({error:"Explicit confirm=true is required for approval."},{status:409});
 if(decision==="reject"&&!String(b.reason||"").trim())return NextResponse.json({error:"A rejection reason is required."},{status:409});
 try{const workspaceId=await resolveVivitoWorkspaceForUser(userId);return NextResponse.json(await decideVivitoDirectEvent(eventId,decision as "approve"|"reject",String(b.reason||"Explicit confirmation"),role,userId,workspaceId),{headers:{"Cache-Control":"private, no-store"}})}catch(e:any){return NextResponse.json({error:String(e?.message||e)},{status:Number(e?.status||400),headers:{"Cache-Control":"private, no-store"}})}
}
