import {NextResponse} from "next/server";
import {requireGroupSuperAdmin} from "@/lib/vgroup/access";
import {listApprovalRules,listReconciliations,listIntercompany} from "@/lib/vgroup/operational-controls";

export async function GET(){
  await requireGroupSuperAdmin();
  const [approvalRules,reconciliations,intercompany]=await Promise.all([
    listApprovalRules(),listReconciliations(100),listIntercompany(100)
  ]);
  return NextResponse.json({approvalRules,reconciliations,intercompany});
}
