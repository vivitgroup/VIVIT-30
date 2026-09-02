import {NextResponse} from "next/server";
import {signIn} from "@/lib/auth";

export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store, max-age=0"};
function errorResponse(code:string,status:number){return NextResponse.json({error:{code}},{status,headers:noStore})}

export async function POST(request:Request){
  if(process.env.VGROUP_MARKETING_HANDOFF_RECEIVER_ENABLED!=="true")return errorResponse("HANDOFF_DISABLED",503);
  const allowedOrigin=process.env.VGROUP_GROUP_ORIGIN?.replace(/\/$/,"");
  if(!allowedOrigin)return errorResponse("HANDOFF_ORIGIN_NOT_CONFIGURED",503);
  const origin=request.headers.get("origin")?.replace(/\/$/,"");
  if(origin!==allowedOrigin)return errorResponse("HANDOFF_ORIGIN_REJECTED",403);
  let assertion="";
  try{
    const type=request.headers.get("content-type")||"";
    if(type.includes("application/json")){const body=await request.json() as {assertion?:unknown};assertion=typeof body.assertion==="string"?body.assertion:""}
    else{const form=await request.formData();assertion=String(form.get("assertion")??"")}
  }catch{return errorResponse("INVALID_HANDOFF_BODY",400)}
  if(!assertion||assertion.length>8192)return errorResponse("INVALID_HANDOFF_ASSERTION",400);
  try{
    const result=await signIn("group-handoff",{assertion,redirect:false});
    if(!result)return errorResponse("HANDOFF_AUTH_FAILED",401);
    const response=NextResponse.redirect(new URL("/dashboard",request.url),303);
    response.headers.set("Cache-Control","no-store, max-age=0");
    return response;
  }catch(error){console.error("GROUP HANDOFF CONSUME ERROR:",error instanceof Error?error.name:"handoff_consume_failure");return errorResponse("HANDOFF_AUTH_FAILED",401)}
}
export async function GET(){return errorResponse("METHOD_NOT_ALLOWED",405)}
