import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiGroupSuperAdmin} from "@/lib/vgroup/api-access";
import {restoreEmployee} from "@/lib/vgroup/admin";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiGroupSuperAdmin();
    const {id}=await params;
    try{return NextResponse.json({employee:await restoreEmployee(id,session.userId)},{headers:noStore});}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:"employee_restore_failed"},{status:409,headers:noStore});}
  }catch(error){return apiErrorResponse(error)}
}
