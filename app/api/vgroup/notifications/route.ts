import {NextResponse} from "next/server";
import {requireVGroupSession} from "@/lib/vgroup/session";
import {listNotifications} from "@/lib/vgroup/admin";

export async function GET(){
  const session=await requireVGroupSession();
  return NextResponse.json({notifications:await listNotifications(session.userId)});
}
