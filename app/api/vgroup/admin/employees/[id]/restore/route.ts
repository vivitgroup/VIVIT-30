import {NextResponse} from "next/server";
import {requireGroupSuperAdmin} from "@/lib/vgroup/access";
import {restoreEmployee} from "@/lib/vgroup/admin";

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await requireGroupSuperAdmin();
  const {id}=await params;
  try{return NextResponse.json({employee:await restoreEmployee(id,session.userId)});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"employee_restore_failed"},{status:409});}
}
