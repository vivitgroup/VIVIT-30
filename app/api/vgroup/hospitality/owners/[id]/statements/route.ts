import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {generateOwnerStatement} from "@/lib/vgroup/operations";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  await requireBusinessPermission("hospitality","finance:create");
  const {id}=await params;
  const body=await request.json() as {periodStart?:string;periodEnd?:string};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(body.periodStart??"")||!/^\d{4}-\d{2}-\d{2}$/.test(body.periodEnd??""))return NextResponse.json({error:"invalid_statement_period"},{status:400});
  try{return NextResponse.json({statement:await generateOwnerStatement(id,body.periodStart!,body.periodEnd!)});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"statement_generation_failed"},{status:409});}
}
