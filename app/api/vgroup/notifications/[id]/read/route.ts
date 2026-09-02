import {NextResponse} from "next/server";
import {requireVGroupSession} from "@/lib/vgroup/session";
import {markNotificationRead} from "@/lib/vgroup/operations";

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await requireVGroupSession();
  const {id}=await params;
  const ok=await markNotificationRead(id,session.userId);
  return NextResponse.json({ok},{status:ok?200:404});
}
