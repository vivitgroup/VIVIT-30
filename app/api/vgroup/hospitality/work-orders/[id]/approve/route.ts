import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {approveHospitalityWorkOrder} from "@/lib/vgroup/operations";

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await requireBusinessPermission("hospitality","maintenance:approve");
  const {id}=await params;
  try{return NextResponse.json({workOrder:await approveHospitalityWorkOrder(id,session.userId)});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"work_order_approval_failed"},{status:409});}
}
