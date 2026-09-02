import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {approveHospitalityWorkOrder} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","maintenance:approve");
    const {id}=await params;
    try{return NextResponse.json({workOrder:await approveHospitalityWorkOrder(id,session.userId)},{headers:noStore});}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:"work_order_approval_failed"},{status:409,headers:noStore});}
  }catch(error){return apiErrorResponse(error)}
}
