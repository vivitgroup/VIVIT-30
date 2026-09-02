import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {listEmployees} from "@/lib/vgroup/admin";

export async function GET(){
  await requireBusinessPermission("tech","employees:view");
  return NextResponse.json({employees:await listEmployees()});
}
