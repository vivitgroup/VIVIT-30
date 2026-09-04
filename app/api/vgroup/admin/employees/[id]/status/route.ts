import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiGroupSuperAdmin} from "@/lib/vgroup/api-access";
import {setEmployeeStatus} from "@/lib/vgroup/admin";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiGroupSuperAdmin();
    const {id}=await params;
    const body=await request.json() as {status?:"active"|"suspended"|"archived"};
    if(!body.status||!["active","suspended","archived"].includes(body.status))return NextResponse.json({error:"invalid_employee_status"},{status:400,headers:noStore});
    try{return NextResponse.json({employee:await setEmployeeStatus(id,body.status,session.userId)},{headers:noStore});}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:"employee_status_change_failed"},{status:409,headers:noStore});}
  }catch(error){return apiErrorResponse(error)}
}
