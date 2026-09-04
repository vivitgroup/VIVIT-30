import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {listDeliveryAcceptances} from "@/lib/vgroup/operational-controls";

export async function GET(){
  try{
    await requireApiPermission("tech","projects:view");
    return NextResponse.json({acceptances:await listDeliveryAcceptances(100)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
