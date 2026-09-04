import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {getVGroupSql} from "@/lib/vgroup/db";
import {priceChangeRequest} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("tech","change_requests:update");
    const {id}=await params;
    const body=await request.json() as {price?:number;extraDays?:number};
    if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"invalid_change_request_id"},{status:400,headers:noStore});
    if(!Number.isFinite(body.price)||!Number.isInteger(body.extraDays)||Number(body.price)<0||Number(body.extraDays)<0)return NextResponse.json({error:"invalid_cr_pricing"},{status:400,headers:noStore});
    const sql=getVGroupSql();
    const [scoped]=await sql`select cr.id from tech.change_requests cr join tech.projects p on p.id=cr.project_id join vgroup.business_units bu on bu.id=p.business_unit_id where cr.id=${id}::uuid and bu.code='tech' and bu.status='active' and p.archived_at is null limit 1`;
    if(!scoped)return NextResponse.json({error:"change_request_not_found"},{status:404,headers:noStore});
    try{return NextResponse.json({changeRequest:await priceChangeRequest(id,Number(body.price),Number(body.extraDays),session.userId)},{headers:noStore});}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:"cr_pricing_failed"},{status:409,headers:noStore});}
  }catch(error){return apiErrorResponse(error)}
}
