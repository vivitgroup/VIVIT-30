import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {selectDurationOption} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await requireApiPermission("tech","projects:update");
    const {id}=await params;
    try{return NextResponse.json({project:await selectDurationOption(id)},{headers:noStore});}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:"duration_option_selection_failed"},{status:409,headers:noStore});}
  }catch(error){return apiErrorResponse(error)}
}
