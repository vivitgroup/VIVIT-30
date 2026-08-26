export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {proposeVivitoRollback} from "@/lib/vivito/rollback";
import type {VivitoActionOp} from "@/lib/vivito/action-engine";
const W="default",headers={"Cache-Control":"private, no-store"};
export async function GET(req:NextRequest){const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401,headers});const role=String((session.user as any).role||""),userId=String((session.user as any).id||""),id=String(req.nextUrl.searchParams.get("eventId")||"").trim();if(!id)return NextResponse.json({error:"eventId is required."},{status:400,headers});const owner=role==="SUPER_ADMIN"?sql``:sql`and user_id=${userId}`;const rows=Array.from(await db.execute(sql`select new_values from audit_logs where workspace_id=${W} and id=${id} and action='vivito_action_executed' ${owner} limit 1`)) as any[];if(!rows[0])return NextResponse.json({error:"Execution event was not found."},{status:404,headers});let data:any={};try{data=JSON.parse(String(rows[0].new_values||"{}"))}catch{}const proposal=proposeVivitoRollback(String(data.op||"") as VivitoActionOp,data.result||{});return NextResponse.json({eventId:id,...proposal,note:proposal.available?"Execute the inverse as a new VIVITO action so RBAC, approval and audit rules run again.":undefined},{headers})}
