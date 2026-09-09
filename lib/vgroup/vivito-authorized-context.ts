import {canAccessBusinessUnit,hasPermission,isBusinessUnitCode,type BusinessUnitCode} from "@/lib/vgroup/contracts";
import {getHospitalityDashboard,getTechDashboard} from "@/lib/vgroup/dashboard";
import type {VGroupSession} from "@/lib/vgroup/session";

export type VivitoSelectedWorkspace="group"|BusinessUnitCode;

export type AuthorizedVivitoContext={
  workspace:VivitoSelectedWorkspace;
  memberships:Array<{businessUnit:BusinessUnitCode;role:string;permissionCount:number}>;
  liveData:{
    hospitality?:Awaited<ReturnType<typeof getHospitalityDashboard>>;
    tech?:Awaited<ReturnType<typeof getTechDashboard>>;
  };
};

function scopedMemberships(session:VGroupSession,workspace:VivitoSelectedWorkspace){
  return workspace==="group"
    ?session.memberships
    :session.memberships.filter(m=>m.businessUnit===workspace||m.role==="GROUP_SUPER_ADMIN");
}

export function resolveVivitoWorkspace(value:unknown):VivitoSelectedWorkspace{
  const requested=String(value||"group").toLowerCase();
  return requested==="group"||isBusinessUnitCode(requested)?requested:"group";
}

export async function buildAuthorizedVivitoContext(session:VGroupSession,workspace:VivitoSelectedWorkspace):Promise<AuthorizedVivitoContext>{
  const memberships=scopedMemberships(session,workspace).map(m=>({businessUnit:m.businessUnit,role:m.role,permissionCount:m.permissions.length}));
  const liveData:AuthorizedVivitoContext["liveData"]={};

  const canReadHospitality=(workspace==="group"||workspace==="hospitality")&&canAccessBusinessUnit(session,"hospitality")&&hasPermission(session,"hospitality","properties:view");
  const canReadTech=(workspace==="group"||workspace==="tech")&&canAccessBusinessUnit(session,"tech");

  if(canReadHospitality)liveData.hospitality=await getHospitalityDashboard();
  if(canReadTech)liveData.tech=await getTechDashboard();

  return {workspace,memberships,liveData};
}
