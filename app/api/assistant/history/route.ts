export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {parseSanitizedAudit} from "@/lib/vivito/audit-safety";

const noStore={"Cache-Control":"private, no-store"};
type HistoryRow={id:string;user_id:string|null;action:string;entity:string|null;entity_id:string|null;new_values:string|null;created_at:string|Date};

export async function GET(req:NextRequest){
 const session=await auth();
 if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401,headers:noStore});
 const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id||""),role=String(session.user.role||"");
 if(!workspaceId||!userId)return NextResponse.json({error:"Workspace unavailable"},{status:403,headers:noStore});
 const url=new URL(req.url),rawLimit=Number(url.searchParams.get("limit")||25),limit=Number.isFinite(rawLimit)?Math.min(100,Math.max(1,Math.trunc(rawLimit))):25;
 const before=(url.searchParams.get("before")||"").trim();
 if(before&&!/^\d{4}-\d{2}-\d{2}T/.test(before))return NextResponse.json({error:"Invalid history cursor."},{status:400,headers:noStore});
 const ownerScope=role==="SUPER_ADMIN"?sql``:sql`and user_id=${userId}`;
 const cursor=before?sql`and created_at < ${before}`:sql``;
 const rows=Array.from(await db.execute<HistoryRow>(sql`select id,user_id,action,entity,entity_id,new_values,created_at from audit_logs where workspace_id=${workspaceId} and action like 'vivito_history_%' ${ownerScope} ${cursor} order by created_at desc,id desc limit ${limit+1}`));
 const hasMore=rows.length>limit,visible=rows.slice(0,limit);
 return NextResponse.json({success:true,items:visible.map(row=>({id:row.id,actorId:row.user_id,action:row.action.replace(/^vivito_history_/,""),entity:row.entity,entityId:row.entity_id,data:parseSanitizedAudit(row.new_values),createdAt:row.created_at})),nextCursor:hasMore?new Date(visible[visible.length-1].created_at).toISOString():null},{headers:noStore});
}
