import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {adjustInventory} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await requireBusinessPermission("hospitality","inventory:update");
  const {id}=await params;
  const body=await request.json() as {quantityDelta?:number;movementType?:"in"|"out"|"adjustment";reason?:string;workOrderId?:string};
  if(!Number.isFinite(body.quantityDelta)||!body.movementType)return NextResponse.json({error:"invalid_inventory_adjustment"},{status:400,headers:noStore});
  try{
    const item=await adjustInventory({itemId:id,quantityDelta:Number(body.quantityDelta),movementType:body.movementType,reason:body.reason??null,workOrderId:body.workOrderId??null,userId:session.userId});
    return NextResponse.json({item},{headers:noStore});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"inventory_adjustment_failed"},{status:409,headers:noStore});}
}
