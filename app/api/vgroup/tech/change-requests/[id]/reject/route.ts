import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {rejectChangeRequest} from "@/lib/vgroup/operations";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("tech","change_requests:approve");
    const {id}=await params;
    const body=await request.json().catch(()=>({})) as {note?:string};
    try{return NextResponse.json({changeRequest:await rejectChangeRequest(id,session.userId,body.note??null)},{headers:noStore});}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:"cr_rejection_failed"},{status:409,headers:noStore});}
  }catch(error){return apiErrorResponse(error)}
}
