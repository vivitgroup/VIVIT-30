import {canAccessBusinessUnit,hasPermission,type BusinessUnitCode} from "@/lib/vgroup/contracts";
import type {VGroupSession} from "@/lib/vgroup/session";
import type {VivitoSelectedWorkspace} from "@/lib/vgroup/vivito-authorized-context";

export type VivitoLiveModule="hospitality"|"tech";

const MODULE_UNIT:Record<VivitoLiveModule,BusinessUnitCode>={hospitality:"hospitality",tech:"tech"};

export function isVivitoLiveModuleAllowed(session:VGroupSession,workspace:VivitoSelectedWorkspace,module:VivitoLiveModule):boolean{
  const unit=MODULE_UNIT[module];
  if(workspace!=="group"&&workspace!==unit)return false;
  if(!canAccessBusinessUnit(session,unit))return false;
  if(module==="hospitality")return hasPermission(session,"hospitality","properties:view");
  if(module==="tech")return session.memberships.some(m=>m.role==="GROUP_SUPER_ADMIN"||(m.businessUnit==="tech"&&m.permissions.some(p=>p.endsWith(":view"))));
  return false;
}

export function authorizedVivitoLiveModules(session:VGroupSession,workspace:VivitoSelectedWorkspace):VivitoLiveModule[]{
  return (["hospitality","tech"] as const).filter(module=>isVivitoLiveModuleAllowed(session,workspace,module));
}
