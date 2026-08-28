export const dynamic="force-dynamic";
export const maxDuration=300;
import {NextRequest,NextResponse} from "next/server";
import {runVivitoDirectCycle} from "@/lib/vivito/direct-runtime";

export async function GET(req:NextRequest){
 const expected=String(process.env.CRON_SECRET||"");
 const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 const header=req.headers.get("x-cron-secret")||"";
 if(!expected||(bearer!==expected&&header!==expected))return NextResponse.json({error:"Unauthorized"},{status:401});
 const result=await runVivitoDirectCycle();
 return NextResponse.json(result,{status:result.ok?200:503,headers:{"Cache-Control":"no-store"}});
}
