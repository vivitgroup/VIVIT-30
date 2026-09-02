import {NextResponse} from "next/server";
import {requireBusinessPermission} from "@/lib/vgroup/access";
import {listDeliveryAcceptances} from "@/lib/vgroup/operational-controls";

export async function GET(){
  await requireBusinessPermission("tech","projects:view");
  return NextResponse.json({acceptances:await listDeliveryAcceptances(100)});
}
