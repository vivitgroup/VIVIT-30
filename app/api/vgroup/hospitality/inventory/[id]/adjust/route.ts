import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {adjustInventory} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
const uuid=/^[0-9a-f-]{36}$/i;
const movementTypes=new Set(["in","out","adjustment"]);
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("hospitality","inventory:update");
    const {id}=await params;
    const body=await request.json().catch(()=>null) as {quantityDelta?:number;movementType?:string;reason?:string;workOrderId?:string}|null;
    const quantityDelta=Number(body?.quantityDelta);
    const movementType=String(body?.movementType??"");
    const workOrderId=String(body?.workOrderId??"");
    const reason=String(body?.reason??"").trim();
    if(!uuid.test(id)||!Number.isFinite(quantityDelta)||quantityDelta===0||!movementTypes.has(movementType)||Boolean(workOrderId&&!uuid.test(workOrderId))||reason.length>1000)return NextResponse.json({error:"invalid_inventory_adjustment"},{status:400,headers:noStore});
    try{
      const item=await adjustInventory({itemId:id,quantityDelta,movementType:movementType as "in"|"out"|"adjustment",reason:reason||null,workOrderId:workOrderId||null,userId:session.userId});
      return NextResponse.json({item},{headers:noStore});
    }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"inventory_adjustment_failed"},{status:409,headers:noStore});}
  }catch(error){return apiErrorResponse(error)}
}
