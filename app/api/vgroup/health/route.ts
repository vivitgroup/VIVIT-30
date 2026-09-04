export const dynamic = "force-dynamic";

import {NextResponse} from "next/server";
import {getVGroupHealth} from "@/lib/vgroup/db";
import {isVGroupConfigured} from "@/lib/vgroup/env";

type PublicHealthPayload={ok:boolean;configured:boolean;isolated:true;schemaReady?:boolean};
const PUBLIC_HEALTH_KEYS=new Set(["ok","configured","isolated","schemaReady"]);
function verifyPublicHealthPayload(payload:PublicHealthPayload){
  if(Object.keys(payload).some(key=>!PUBLIC_HEALTH_KEYS.has(key)))throw new Error("Unsafe health payload");
  return payload;
}

export async function GET(){
  if(!isVGroupConfigured()){
    return NextResponse.json(verifyPublicHealthPayload({ok:false,configured:false,isolated:true}),{status:503,headers:{"Cache-Control":"no-store"}});
  }
  try{
    const health=await getVGroupHealth();
    const schemaReady=Boolean(health?.schema_ready);
    return NextResponse.json(verifyPublicHealthPayload({ok:schemaReady,configured:true,isolated:true,schemaReady}),{status:schemaReady?200:503,headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json(verifyPublicHealthPayload({ok:false,configured:true,isolated:true,schemaReady:false}),{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
