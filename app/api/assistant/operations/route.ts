export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
const noStore={"Cache-Control":"private, no-store"};
type DbRow=Record<string,unknown>;
const rows=(v:unknown):DbRow[]=>Array.from(v as Iterable<DbRow>);
export async function GET(req:NextRequest){
 const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401,headers:noStore});
 const role=String(session.user.role||""),userId=String(session.user.id||""),workspaceId=String(session.user.workspaceId||"");if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403,headers:noStore});
 const limit=Math.min(200,Math.max(20,Number(req.nextUrl.searchParams.get("limit")||80)));
 const owner=role==="SUPER_ADMIN"?sql``:sql`and user_id=${userId}`;
 const raw=rows(await db.execute(sql`select id,user_id,action,entity,entity_id,new_values,created_at from audit_logs where workspace_id=${workspaceId} and action like 'vivito_%' ${owner} order by created_at desc limit ${limit}`));
 const events=raw.map(r=>{let data:Record<string,unknown>={};try{data=typeof r.new_values==="string"?JSON.parse(r.new_values):r.new_values&&typeof r.new_values==="object"?r.new_values as Record<string,unknown>:{} }catch{}const result=data.result&&typeof data.result==="object"?data.result as Record<string,unknown>:{};const action=String(r.action||"");const failed=action.includes("stopped")||action.includes("failed");return{id:r.id,userId:r.user_id,action,entity:r.entity,entityId:r.entity_id,createdAt:r.created_at,status:failed?"FAILED":action.includes("executed")||action.includes("created")||action.includes("updated")||action.includes("saved")?"SUCCESS":"INFO",op:data.op||result.action||null,requestId:data.requestId||null,message:data.message||result.message||null,approval:data.approval||null,stepIndex:data.stepIndex??null,completedSteps:data.completedSteps??null};});
 const summary={total:events.length,success:events.filter(e=>e.status==="SUCCESS").length,failed:events.filter(e=>e.status==="FAILED").length,plans:events.filter(e=>e.action.includes("plan_")).length,financial:events.filter(e=>["record_payment","create_invoice","log_expense","upsert_payroll","set_payroll_status"].includes(String(e.op))).length};
 return NextResponse.json({summary,events},{headers:noStore});
}
