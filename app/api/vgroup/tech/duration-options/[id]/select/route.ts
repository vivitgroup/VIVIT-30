import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {selectDurationOption} from "@/lib/vgroup/operations";

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  await requireBusinessPermission("tech","projects:update");
  const {id}=await params;
  try{return NextResponse.json({project:await selectDurationOption(id)});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"duration_option_selection_failed"},{status:409});}
}
