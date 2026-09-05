import {redirect} from "next/navigation";
import {canAccessBusinessUnit} from "@/lib/vgroup/contracts";
import {getVGroupSession} from "@/lib/vgroup/session";

type Workspace="group"|"marketing"|"tech"|"hospitality";
const valid=new Set<Workspace>(["group","marketing","tech","hospitality"]);

export const dynamic="force-dynamic";

export default async function WorkspaceEntry({params}:{params:Promise<{workspace:string}>}){
  const {workspace:raw}=await params;
  const workspace=raw as Workspace;
  if(!valid.has(workspace))redirect('/');

  // Marketing is a complete, independent ERP runtime. Never send it through the
  // unfinished Group shell/integration adapter; use its native auth and app.
  if(workspace==="marketing")redirect('/login?workspace=marketing');

  // Preserve the selected destination through Group authentication. Previously
  // requireVGroupSession() redirected to /group/login without the workspace,
  // causing Hospitality/Tech selections to fall back to Group after sign-in.
  const session=await getVGroupSession();
  if(!session)redirect(`/group/login?workspace=${workspace}`);

  if(workspace==="group"){
    const board=session.memberships.some(item=>item.role==="GROUP_SUPER_ADMIN");
    if(board)redirect('/group/overview');
    redirect('/group/access?workspace=group&reason=permission');
  }

  if(canAccessBusinessUnit(session,workspace))redirect(`/group/${workspace}`);
  redirect(`/group/access?workspace=${workspace}&reason=permission`);
}
