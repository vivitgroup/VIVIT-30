export const dynamic="force-dynamic";

import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,workspaces,users,auditLogs} from "@/lib/db";
import {and,eq} from "drizzle-orm";

const headers={"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache"};
const clean=(value:unknown,max=120)=>String(value||"").trim().slice(0,max);

function validCurrency(value:string){
 if(!/^[A-Z]{3}$/.test(value))return false;
 try{new Intl.NumberFormat("en",{style:"currency",currency:value}).format(1);return true}catch{return false}
}
function validTimezone(value:string){
 if(!value||value.length>120)return false;
 try{new Intl.DateTimeFormat("en",{timeZone:value}).format(new Date());return true}catch{return false}
}

async function scope(){
 const session=await auth();
 if(!session?.user?.id)return null;
 const workspaceId=clean(session.user.workspaceId,160),userId=clean(session.user.id,160);
 if(!workspaceId||!userId)return null;
 const [live]=await db.select({role:users.role}).from(users).where(and(eq(users.id,userId),eq(users.workspaceId,workspaceId),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"))).limit(1);
 return live?{workspaceId,userId,role:String(live.role)}:null;
}

export async function GET(){
 const s=await scope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 const [workspace]=await db.select({currency:workspaces.currency,timezone:workspaces.timezone}).from(workspaces).where(and(eq(workspaces.id,s.workspaceId),eq(workspaces.isActive,true))).limit(1);
 if(!workspace)return NextResponse.json({error:"Workspace unavailable"},{status:404,headers});
 return NextResponse.json({currency:workspace.currency,timezone:workspace.timezone,canEdit:s.role==="SUPER_ADMIN"},{headers});
}

export async function PATCH(req:NextRequest){
 const s=await scope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 if(s.role!=="SUPER_ADMIN")return NextResponse.json({error:"Forbidden"},{status:403,headers});
 const body=await req.json().catch(()=>null) as {currency?:unknown;timezone?:unknown}|null;
 const currency=clean(body?.currency,3).toUpperCase(),timezone=clean(body?.timezone,120);
 if(!validCurrency(currency))return NextResponse.json({error:"Choose a valid ISO 4217 currency code."},{status:400,headers});
 if(!validTimezone(timezone))return NextResponse.json({error:"Choose a valid IANA timezone."},{status:400,headers});
 const updatedAt=new Date();
 let before:{currency:string;timezone:string}|undefined;
 await db.transaction(async tx=>{
  [before]=await tx.select({currency:workspaces.currency,timezone:workspaces.timezone}).from(workspaces).where(and(eq(workspaces.id,s.workspaceId),eq(workspaces.isActive,true))).limit(1);
  if(!before)throw new Error("Workspace unavailable");
  const updated=await tx.update(workspaces).set({currency,timezone,updatedAt}).where(and(eq(workspaces.id,s.workspaceId),eq(workspaces.isActive,true))).returning({id:workspaces.id});
  if(!updated.length)throw new Error("Workspace unavailable");
  await tx.insert(auditLogs).values({workspaceId:s.workspaceId,userId:s.userId,action:"workspace_region_updated",entity:"Workspace",entityId:s.workspaceId,oldValues:JSON.stringify(before),newValues:JSON.stringify({currency,timezone})});
 });
 return NextResponse.json({success:true,currency,timezone,canEdit:true,version:updatedAt.getTime()},{headers});
}
