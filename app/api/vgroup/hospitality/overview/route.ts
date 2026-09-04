import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {getHospitalityDashboard} from "@/lib/vgroup/dashboard";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    await requireApiPermission("hospitality","properties:view");
    const data=await getHospitalityDashboard();
    return NextResponse.json({businessUnit:"hospitality",data},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
