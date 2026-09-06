export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,users,auditLogs} from "@/lib/db";
import {and,eq} from "drizzle-orm";

const MAX_AVATAR_BYTES=1024*1024;
const DATA_URL=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const headers={"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache"};
async function scope(){const session=await auth();if(!session?.user?.id)return null;const workspaceId=String(session.user.workspaceId||""),userId=String(session.user.id);return workspaceId?{workspaceId,userId}:null}

export async function GET(){
 const s=await scope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 const [row]=await db.select({avatar:users.avatar,updatedAt:users.updatedAt}).from(users).where(and(eq(users.id,s.userId),eq(users.workspaceId,s.workspaceId),eq(users.isActive,true))).limit(1);
 return NextResponse.json({avatar:row?.avatar||null,version:row?.updatedAt?new Date(row.updatedAt).getTime():Date.now()},{headers});
}

export async function POST(req:NextRequest){
 const s=await scope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 const body=await req.json().catch(()=>null) as {avatar?:unknown}|null,avatar=String(body?.avatar||"");
 const match=avatar.match(DATA_URL);if(!match)return NextResponse.json({error:"Use a JPG, PNG or WebP profile image."},{status:415,headers});
 const bytes=Math.floor(match[2].length*3/4);if(bytes<=0||bytes>MAX_AVATAR_BYTES)return NextResponse.json({error:"Profile image must be 1 MB or smaller."},{status:413,headers});
 const updatedAt=new Date();
 await db.transaction(async tx=>{
  const updated=await tx.update(users).set({avatar,updatedAt}).where(and(eq(users.id,s.userId),eq(users.workspaceId,s.workspaceId),eq(users.isActive,true))).returning({id:users.id});
  if(!updated.length)throw new Error("Profile unavailable");
  await tx.insert(auditLogs).values({workspaceId:s.workspaceId,userId:s.userId,action:"profile_avatar_updated",entity:"User",entityId:s.userId,newValues:JSON.stringify({mime:`image/${match[1]}`,bytes,version:updatedAt.getTime()})});
 });
 return NextResponse.json({success:true,avatar,version:updatedAt.getTime()},{headers});
}

export async function DELETE(){
 const s=await scope();if(!s)return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 const updatedAt=new Date();
 await db.transaction(async tx=>{
  const updated=await tx.update(users).set({avatar:null,updatedAt}).where(and(eq(users.id,s.userId),eq(users.workspaceId,s.workspaceId),eq(users.isActive,true))).returning({id:users.id});
  if(!updated.length)throw new Error("Profile unavailable");
  await tx.insert(auditLogs).values({workspaceId:s.workspaceId,userId:s.userId,action:"profile_avatar_deleted",entity:"User",entityId:s.userId,newValues:JSON.stringify({version:updatedAt.getTime()})});
 });
 return NextResponse.json({success:true,avatar:null,version:updatedAt.getTime()},{headers});
}
