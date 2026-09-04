export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,users,auditLogs} from "@/lib/db";
import {and,eq} from "drizzle-orm";

const MAX_AVATAR_BYTES=1024*1024;
const DATA_URL=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

export async function GET(){
 const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
 const workspaceId=String(session.user.workspaceId||"");if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403});
 const [row]=await db.select({avatar:users.avatar}).from(users).where(and(eq(users.id,String(session.user.id)),eq(users.workspaceId,workspaceId),eq(users.isActive,true))).limit(1);
 return NextResponse.json({avatar:row?.avatar||null},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:NextRequest){
 const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});
 const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id);if(!workspaceId)return NextResponse.json({error:"Workspace unavailable"},{status:403});
 const body=await req.json().catch(()=>null) as {avatar?:unknown}|null,avatar=String(body?.avatar||"");
 const match=avatar.match(DATA_URL);if(!match)return NextResponse.json({error:"Use a JPG, PNG or WebP profile image."},{status:415});
 const bytes=Math.floor(match[2].length*3/4);if(bytes<=0||bytes>MAX_AVATAR_BYTES)return NextResponse.json({error:"Profile image must be 1 MB or smaller."},{status:413});
 await db.transaction(async tx=>{
  const updated=await tx.update(users).set({avatar,updatedAt:new Date()}).where(and(eq(users.id,userId),eq(users.workspaceId,workspaceId),eq(users.isActive,true))).returning({id:users.id});
  if(!updated.length)throw new Error("Profile unavailable");
  await tx.insert(auditLogs).values({workspaceId,userId,action:"profile_avatar_updated",entity:"User",entityId:userId,newValues:JSON.stringify({mime:`image/${match[1]}`,bytes})});
 });
 return NextResponse.json({success:true,avatar},{headers:{"Cache-Control":"private, no-store"}});
}
