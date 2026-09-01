export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {effectiveRoles} from "@/lib/session-access";
import {listManageableBusinessRecords} from "@/lib/business-lifecycle";

export async function GET(){
 const session=await auth();
 if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const workspaceId=String(session.user.workspaceId||"").trim(),userId=String(session.user.id||"").trim();
 if(!workspaceId||!userId)return NextResponse.json({error:"Invalid session scope"},{status:403});
 const items=await listManageableBusinessRecords(workspaceId,userId,effectiveRoles(session.user));
 return NextResponse.json({items},{headers:{"Cache-Control":"private, no-store"}});
}
