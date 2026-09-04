import {NextResponse} from "next/server";
import {apiPermissionOrResponse} from "@/lib/vgroup/api-access";
import {recordInstallmentPayment} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await apiPermissionOrResponse("tech","billing:update"); if(auth instanceof NextResponse)return auth;
  const {id}=await params;
  const body=await request.json() as {amount?:number};
  if(!Number.isFinite(body.amount)||Number(body.amount)<=0)return NextResponse.json({error:"invalid_payment_amount"},{status:400,headers:noStore});
  try{return NextResponse.json({installment:await recordInstallmentPayment(id,Number(body.amount))},{headers:noStore});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"installment_payment_failed"},{status:409,headers:noStore});}
}
