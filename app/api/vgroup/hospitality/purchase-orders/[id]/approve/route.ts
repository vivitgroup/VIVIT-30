import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {approveHospitalityPurchaseOrder} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","purchase_orders:approve");
    const {id}=await params;
    try{return NextResponse.json({purchaseOrder:await approveHospitalityPurchaseOrder(id,session.userId)},{headers:noStore});}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:"purchase_order_approval_failed"},{status:409,headers:noStore});}
  }catch(error){return apiErrorResponse(error)}
}
