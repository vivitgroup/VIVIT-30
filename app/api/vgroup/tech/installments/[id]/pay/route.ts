import {NextResponse} from "next/server";
import {apiPermissionOrResponse} from "@/lib/vgroup/api-access";
import {getVGroupSql} from "@/lib/vgroup/db";
import {recordInstallmentPayment} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await apiPermissionOrResponse("tech","billing:update"); if(auth instanceof NextResponse)return auth;
  const {id}=await params;
  const body=await request.json() as {amount?:number};
  if(!Number.isFinite(body.amount)||Number(body.amount)<=0)return NextResponse.json({error:"invalid_payment_amount"},{status:400,headers:noStore});
  const sql=getVGroupSql();
  try{
    const [installment]=await sql<{id:string;business_unit_id:string}[]>`select i.id::text,p.business_unit_id::text from tech.payment_installments i join tech.projects p on p.id=i.project_id join vgroup.business_units bu on bu.id=p.business_unit_id where i.id=${id}::uuid and bu.code='tech' and bu.status='active' and p.archived_at is null limit 1`;
    if(!installment)return NextResponse.json({error:"installment_not_found"},{status:404,headers:noStore});
    const result=await recordInstallmentPayment(id,Number(body.amount));
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) values(${installment.business_unit_id}::uuid,${auth.userId}::uuid,'installment.payment','payment_installment',${id}::uuid,jsonb_build_object('amount',${Number(body.amount)}))`;
    return NextResponse.json({installment:result},{headers:noStore});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"installment_payment_failed"},{status:409,headers:noStore});}
}
