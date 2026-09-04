export const dynamic="force-dynamic";

import {NextRequest,NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {hashRateLimitKey,VGROUP_ACCESS_COOKIE,VGROUP_REFRESH_COOKIE} from "@/lib/vgroup/session";

type TokenResponse={access_token?:string;refresh_token?:string;expires_in?:number;user?:{id:string;email?:string};error_description?:string;msg?:string};

export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>null) as {email?:string;password?:string}|null;
  const email=String(body?.email||"").trim().toLowerCase();
  const password=String(body?.password||"");
  if(!email||!password)return NextResponse.json({error:"Email and password are required"},{status:400});

  const ip=(request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip")||"unknown").split(",")[0].trim();
  const keyHash=hashRateLimitKey(`${ip}|${email}`);
  const sql=getVGroupSql();
  const [limit]=await sql<{attempt_count:number}[]>`
    insert into vgroup.auth_rate_limits(key_hash,window_start,attempt_count,updated_at)
    values(${keyHash},now(),1,now())
    on conflict(key_hash) do update set
      attempt_count=case when vgroup.auth_rate_limits.window_start < now()-interval '15 minutes' then 1 else vgroup.auth_rate_limits.attempt_count+1 end,
      window_start=case when vgroup.auth_rate_limits.window_start < now()-interval '15 minutes' then now() else vgroup.auth_rate_limits.window_start end,
      updated_at=now()
    returning attempt_count
  `;
  if((limit?.attempt_count??1)>10)return NextResponse.json({error:"Too many login attempts"},{status:429,headers:{"Retry-After":"900"}});

  const url=process.env.VGROUP_SUPABASE_URL,key=process.env.VGROUP_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.json({error:"Group authentication is not configured"},{status:503});
  const authResponse=await fetch(`${url}/auth/v1/token?grant_type=password`,{
    method:"POST",
    headers:{apikey:key,"Content-Type":"application/json"},
    body:JSON.stringify({email,password}),
    cache:"no-store",
    signal:AbortSignal.timeout(8000),
  });
  const token=await authResponse.json().catch(()=>({})) as TokenResponse;
  if(!authResponse.ok||!token.access_token||!token.refresh_token){
    return NextResponse.json({error:"Invalid credentials"},{status:401,headers:{"Cache-Control":"no-store"}});
  }

  await sql`delete from vgroup.auth_rate_limits where key_hash=${keyHash}`;
  const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  const cookieBase={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/"};
  response.cookies.set(VGROUP_ACCESS_COOKIE,token.access_token,{...cookieBase,maxAge:Math.max(60,Number(token.expires_in||3600))});
  response.cookies.set(VGROUP_REFRESH_COOKIE,token.refresh_token,{...cookieBase,maxAge:60*60*24*30});
  return response;
}
