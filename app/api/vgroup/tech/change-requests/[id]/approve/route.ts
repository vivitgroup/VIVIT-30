import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

const noStore={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireApiPermission("tech","change_requests:approve");
    const {id}=await params;
    const body=await request.json().catch(()=>({})) as {decisionNote?:string};
    if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Invalid change request id"},{status:400,headers:noStore});
    const sql=getVGroupSql();
    const [row]=await sql`select * from tech.approve_change_request(${id}::uuid,${session.userId}::uuid,${body.decisionNote??null})`;
    return NextResponse.json({result:row},{headers:noStore});
  }catch(error){
    const message=error instanceof Error?error.message:"";
    if(message.includes("change_request_not_found"))return NextResponse.json({error:"Change request not found"},{status:404,headers:noStore});
    if(message.includes("change_request_not_priced")||message.includes("change_request_missing_commercials"))return NextResponse.json({error:"Change request is not ready for approval"},{status:409,headers:noStore});
    return apiErrorResponse(error);
  }
}
