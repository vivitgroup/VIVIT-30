import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {approveHospitalityPurchaseOrder} from "@/lib/vgroup/operations";

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await requireBusinessPermission("hospitality","purchase_orders:approve");
  const {id}=await params;
  try{return NextResponse.json({purchaseOrder:await approveHospitalityPurchaseOrder(id,session.userId)});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"purchase_order_approval_failed"},{status:409});}
}
