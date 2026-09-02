import {NextResponse} from "next/server";
import {apiPermissionOrResponse} from "@/lib/vgroup/api-access";
import {compressProjectTimeline} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const auth=await apiPermissionOrResponse("tech","projects:update"); if(auth instanceof NextResponse)return auth;
  const {id}=await params;
  const body=await request.json() as {targetDays?:number};
  if(!Number.isInteger(body.targetDays)||Number(body.targetDays)<=0)return NextResponse.json({error:"invalid_target_days"},{status:400,headers:noStore});
  try{return NextResponse.json({project:await compressProjectTimeline(id,Number(body.targetDays))},{headers:noStore});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"timeline_compression_failed"},{status:409,headers:noStore});}
}
