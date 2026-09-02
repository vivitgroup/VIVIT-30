import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {listHospitalityIncidents} from "@/lib/vgroup/operational-controls";

export async function GET(){
  await requireBusinessPermission("hospitality","maintenance:view");
  return NextResponse.json({incidents:await listHospitalityIncidents(100)});
}
