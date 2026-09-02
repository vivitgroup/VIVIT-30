import {NextResponse} from "next/server";
import {requireGroupSuperAdmin} from "@/lib/vgroup/access";
import {listEmployees} from "@/lib/vgroup/admin";

export async function GET(){
  await requireGroupSuperAdmin();
  return NextResponse.json({employees:await listEmployees()});
}
