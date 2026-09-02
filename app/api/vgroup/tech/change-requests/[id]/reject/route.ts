import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {rejectChangeRequest} from "@/lib/vgroup/operations";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await requireBusinessPermission("tech","change_requests:approve");
  const {id}=await params;
  const body=await request.json().catch(()=>({})) as {note?:string};
  try{return NextResponse.json({changeRequest:await rejectChangeRequest(id,session.userId,body.note??null)});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"cr_rejection_failed"},{status:409});}
}
