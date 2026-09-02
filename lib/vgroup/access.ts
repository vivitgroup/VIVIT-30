import {redirect} from "next/navigation";
import {canAccessBusinessUnit,hasPermission,type BusinessUnitCode,type PermissionKey} from "@/lib/vgroup/contracts";
import {requireVGroupSession,type VGroupSession} from "@/lib/vgroup/session";

export async function requireBusinessUnitAccess(businessUnit:BusinessUnitCode):Promise<VGroupSession>{
  const session=await requireVGroupSession();
  if(!canAccessBusinessUnit(session,businessUnit))redirect("/group");
  return session;
}

export async function requireBusinessPermission(businessUnit:BusinessUnitCode,permission:PermissionKey):Promise<VGroupSession>{
  const session=await requireBusinessUnitAccess(businessUnit);
  if(!hasPermission(session,businessUnit,permission))redirect("/group");
  return session;
}

export async function requireGroupSuperAdmin():Promise<VGroupSession>{
  const session=await requireVGroupSession();
  if(!session.memberships.some(item=>item.role==="GROUP_SUPER_ADMIN"))redirect("/group");
  return session;
}

export function membershipsFor(session:VGroupSession,businessUnit:BusinessUnitCode){
  return session.memberships.filter(item=>item.businessUnit===businessUnit||item.role==="GROUP_SUPER_ADMIN");
}
