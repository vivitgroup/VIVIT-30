import {NextResponse} from "next/server";
import {apiErrorResponse,requireApiGroupSuperAdmin} from "@/lib/vgroup/api-access";
import {listApprovalRules,listReconciliations,listIntercompany} from "@/lib/vgroup/operational-controls";

export async function GET(){
  try{
    await requireApiGroupSuperAdmin();
    const [approvalRules,reconciliations,intercompany]=await Promise.all([
      listApprovalRules(),listReconciliations(100),listIntercompany(100)
    ]);
    return NextResponse.json({approvalRules,reconciliations,intercompany},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
