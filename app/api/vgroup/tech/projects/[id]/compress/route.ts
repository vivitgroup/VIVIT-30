import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {compressProjectTimeline} from "@/lib/vgroup/operations";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  await requireBusinessPermission("tech","projects:update");
  const {id}=await params;
  const body=await request.json() as {targetDays?:number};
  if(!Number.isInteger(body.targetDays)||Number(body.targetDays)<=0)return NextResponse.json({error:"invalid_target_days"},{status:400});
  try{return NextResponse.json({project:await compressProjectTimeline(id,Number(body.targetDays))});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"timeline_compression_failed"},{status:409});}
}
