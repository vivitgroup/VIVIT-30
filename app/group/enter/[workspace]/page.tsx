import {redirect} from "next/navigation";
import {canAccessBusinessUnit} from "@/lib/vgroup/contracts";
import {getMarketingIntegrationState} from "@/lib/vgroup/marketing-integration";
import {requireVGroupSession} from "@/lib/vgroup/session";

type Workspace="group"|"marketing"|"tech"|"hospitality";
const valid=new Set<Workspace>(["group","marketing","tech","hospitality"]);

export const dynamic="force-dynamic";

export default async function WorkspaceEntry({params}:{params:Promise<{workspace:string}>}){
  const session=await requireVGroupSession();
  const {workspace:raw}=await params;
  const workspace=raw as Workspace;
  if(!valid.has(workspace))redirect('/group/access?workspace=unknown&reason=invalid');

  if(workspace==="group"){
    const board=session.memberships.some(item=>item.role==="GROUP_SUPER_ADMIN");
    if(board)redirect('/group/command-center');
    redirect('/group/access?workspace=group&reason=permission');
  }

  if(workspace==="marketing"){
    const state=getMarketingIntegrationState();
    if(!state.enabled||!state.certified)redirect('/group/access?workspace=marketing&reason=unavailable');
    if(canAccessBusinessUnit(session,"marketing"))redirect('/group/marketing');
    redirect('/group/access?workspace=marketing&reason=permission');
  }

  if(canAccessBusinessUnit(session,workspace))redirect(`/group/${workspace}`);
  redirect(`/group/access?workspace=${workspace}&reason=permission`);
}
