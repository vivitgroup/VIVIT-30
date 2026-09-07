export const dynamic="force-dynamic";

import {NextRequest,NextResponse} from "next/server";
import {canAccessBusinessUnit,isBusinessUnitCode} from "@/lib/vgroup/contracts";
import {getVGroupSession} from "@/lib/vgroup/session";

export async function GET(request:NextRequest){
  const session=await getVGroupSession();
  if(!session)return NextResponse.json({authenticated:false,allowed:false},{status:401,headers:{"Cache-Control":"private, no-store"}});

  const requested=String(request.nextUrl.searchParams.get("workspace")||"group").toLowerCase();
  const allowed=requested==="group"
    ?session.memberships.some(item=>item.role==="GROUP_SUPER_ADMIN")
    :isBusinessUnitCode(requested)&&canAccessBusinessUnit(session,requested);

  return NextResponse.json({authenticated:true,allowed},{status:allowed?200:403,headers:{"Cache-Control":"private, no-store"}});
}
