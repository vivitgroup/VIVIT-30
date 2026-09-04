import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {approveHospitalityWorkOrder} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","maintenance:approve");
    const {id}=await params;
    if(!uuid.test(id))return NextResponse.json({error:"invalid_work_order_id"},{status:400,headers:noStore});
    try{return NextResponse.json({workOrder:await approveHospitalityWorkOrder(id,session.userId)},{headers:noStore});}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:"work_order_approval_failed"},{status:409,headers:noStore});}
  }catch(error){return apiErrorResponse(error)}
}
