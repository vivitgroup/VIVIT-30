export const dynamic = "force-dynamic";

import {NextResponse} from "next/server";
import {getVGroupHealth} from "@/lib/vgroup/db";
import {isVGroupConfigured} from "@/lib/vgroup/env";

export async function GET(){
  if(!isVGroupConfigured()){
    return NextResponse.json({ok:false,configured:false,isolated:true},{status:503,headers:{"Cache-Control":"no-store"}});
  }
  try{
    const health=await getVGroupHealth();
    return NextResponse.json({ok:Boolean(health?.schema_ready),configured:true,isolated:true,schemaReady:Boolean(health?.schema_ready)},{status:health?.schema_ready?200:503,headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({ok:false,configured:true,isolated:true,schemaReady:false},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
