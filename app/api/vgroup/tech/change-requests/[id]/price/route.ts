import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {priceChangeRequest} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("tech","change_requests:update");
    const {id}=await params;
    const body=await request.json() as {price?:number;extraDays?:number};
    if(!Number.isFinite(body.price)||!Number.isInteger(body.extraDays)||Number(body.price)<0||Number(body.extraDays)<0)return NextResponse.json({error:"invalid_cr_pricing"},{status:400,headers:noStore});
    try{return NextResponse.json({changeRequest:await priceChangeRequest(id,Number(body.price),Number(body.extraDays),session.userId)},{headers:noStore});}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:"cr_pricing_failed"},{status:409,headers:noStore});}
  }catch(error){return apiErrorResponse(error)}
}
