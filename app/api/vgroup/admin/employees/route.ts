import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiGroupSuperAdmin} from "@/lib/vgroup/api-access";
import {listEmployees} from "@/lib/vgroup/admin";

export async function GET(){
  try{
    await requireApiGroupSuperAdmin();
    return NextResponse.json({employees:await listEmployees()},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
