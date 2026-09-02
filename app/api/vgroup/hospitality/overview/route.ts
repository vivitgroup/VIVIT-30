import {NextResponse} from "next/server";
import {getVGroupSession} from "@/lib/vgroup/session";
import {canAccessBusinessUnit} from "@/lib/vgroup/contracts";
import {getHospitalityDashboard} from "@/lib/vgroup/dashboard";

export const dynamic="force-dynamic";

export async function GET(){
  const session=await getVGroupSession();
  if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!canAccessBusinessUnit(session,"hospitality"))return NextResponse.json({error:"Forbidden"},{status:403});
  const data=await getHospitalityDashboard();
  return NextResponse.json({businessUnit:"hospitality",data},{headers:{"Cache-Control":"private, no-store"}});
}
