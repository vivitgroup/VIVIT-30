import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {GET as runMediaCron} from "@/app/api/cron/media-sync/route";

export const dynamic="force-dynamic";
export const maxDuration=300;

const ALLOWED_ROLES=new Set(["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"]);
let lastStartedAt=0;

export async function POST(req:NextRequest){
  const session=await auth();
  if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"private, no-store"}});
  const role=String(session.user.role||"");
  if(!ALLOWED_ROLES.has(role))return NextResponse.json({error:"Forbidden"},{status:403,headers:{"Cache-Control":"private, no-store"}});

  const now=Date.now();
  if(now-lastStartedAt<60_000)return NextResponse.json({success:true,skipped:"recently-started"},{headers:{"Cache-Control":"private, no-store"}});
  lastStartedAt=now;

  const secret=String(process.env.CRON_SECRET||"");
  if(!secret)return NextResponse.json({error:"Media sync unavailable"},{status:503,headers:{"Cache-Control":"private, no-store"}});

  const cronReq=new NextRequest(new URL("/api/cron/media-sync",req.nextUrl.origin),{headers:{authorization:`Bearer ${secret}`}});
  const response=await runMediaCron(cronReq);
  const body=await response.text();
  return new NextResponse(body,{status:response.status,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store"}});
}
