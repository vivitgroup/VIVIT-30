import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {recordInstallmentPayment} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  await requireBusinessPermission("tech","billing:update");
  const {id}=await params;
  const body=await request.json() as {amount?:number};
  if(!Number.isFinite(body.amount)||Number(body.amount)<=0)return NextResponse.json({error:"invalid_payment_amount"},{status:400,headers:noStore});
  try{return NextResponse.json({installment:await recordInstallmentPayment(id,Number(body.amount))},{headers:noStore});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"installment_payment_failed"},{status:409,headers:noStore});}
}
