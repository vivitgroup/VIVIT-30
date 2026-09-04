export const dynamic="force-dynamic";

import {NextResponse} from "next/server";
import {VGROUP_ACCESS_COOKIE,VGROUP_REFRESH_COOKIE} from "@/lib/vgroup/session";

export async function POST(){
  const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  response.cookies.set(VGROUP_ACCESS_COOKIE,"",{httpOnly:true,path:"/",maxAge:0,sameSite:"lax",secure:process.env.NODE_ENV==="production"});
  response.cookies.set(VGROUP_REFRESH_COOKIE,"",{httpOnly:true,path:"/",maxAge:0,sameSite:"lax",secure:process.env.NODE_ENV==="production"});
  return response;
}
