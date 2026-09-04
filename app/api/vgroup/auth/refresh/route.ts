export const dynamic="force-dynamic";

import {NextRequest,NextResponse} from "next/server";
import {VGROUP_ACCESS_COOKIE,VGROUP_REFRESH_COOKIE} from "@/lib/vgroup/session";

type RefreshResponse={access_token?:string;refresh_token?:string;expires_in?:number};

export async function POST(request:NextRequest){
  const refreshToken=request.cookies.get(VGROUP_REFRESH_COOKIE)?.value;
  if(!refreshToken)return NextResponse.json({error:{code:"SESSION_EXPIRED",message:"Session expired"}},{status:401,headers:{"Cache-Control":"no-store"}});
  const url=process.env.VGROUP_SUPABASE_URL,key=process.env.VGROUP_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.json({error:{code:"AUTH_UNAVAILABLE",message:"Group authentication is not configured"}},{status:503,headers:{"Cache-Control":"no-store"}});
  const authResponse=await fetch(`${url}/auth/v1/token?grant_type=refresh_token`,{
    method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:refreshToken}),cache:"no-store",signal:AbortSignal.timeout(8000),
  });
  const token=await authResponse.json().catch(()=>({})) as RefreshResponse;
  if(!authResponse.ok||!token.access_token||!token.refresh_token){
    const response=NextResponse.json({error:{code:"SESSION_EXPIRED",message:"Session expired"}},{status:401,headers:{"Cache-Control":"no-store"}});
    response.cookies.set(VGROUP_ACCESS_COOKIE,"",{httpOnly:true,path:"/",maxAge:0,sameSite:"lax",secure:process.env.NODE_ENV==="production"});
    response.cookies.set(VGROUP_REFRESH_COOKIE,"",{httpOnly:true,path:"/",maxAge:0,sameSite:"lax",secure:process.env.NODE_ENV==="production"});
    return response;
  }
  const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  const cookieBase={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/"};
  response.cookies.set(VGROUP_ACCESS_COOKIE,token.access_token,{...cookieBase,maxAge:Math.max(60,Number(token.expires_in||3600))});
  response.cookies.set(VGROUP_REFRESH_COOKIE,token.refresh_token,{...cookieBase,maxAge:60*60*24*30});
  return response;
}
