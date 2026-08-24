export const dynamic="force-dynamic";
import {NextRequest,NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {db,notifications} from "@/lib/db";
import {eq,and,gte} from "drizzle-orm";

export async function GET(req:NextRequest){const session=await auth();if(!session?.user)return NextResponse.json({error:"Unauthorized"},{status:401});const raw=req.nextUrl.searchParams.get("since"),parsed=raw?new Date(raw):new Date(Date.now()-60000);if(Number.isNaN(parsed.getTime()))return NextResponse.json({error:"Invalid since cursor"},{status:400});const earliest=new Date(Date.now()-24*60*60*1000),sinceDate=parsed<earliest?earliest:parsed,newNotifs=await db.select({id:notifications.id,title:notifications.title,message:notifications.message,type:notifications.type,link:notifications.link,priority:notifications.priority,createdAt:notifications.createdAt}).from(notifications).where(and(eq(notifications.userId,String(session.user.id)),eq(notifications.isRead,false),gte(notifications.createdAt,sinceDate))).limit(100);return NextResponse.json({notifications:newNotifs,count:newNotifs.length},{headers:{"Cache-Control":"private, no-store"}})}
