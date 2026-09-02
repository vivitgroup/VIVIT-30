import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {listHospitalityIncidents} from "@/lib/vgroup/operational-controls";

export async function GET(){
  try{
    await requireApiPermission("hospitality","maintenance:view");
    return NextResponse.json({incidents:await listHospitalityIncidents(100)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
