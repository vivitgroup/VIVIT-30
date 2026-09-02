import {NextResponse} from "next/server";
import {canAccessBusinessUnit,hasPermission,type BusinessUnitCode,type PermissionKey} from "@/lib/vgroup/contracts";
import {getVGroupSession,type VGroupSession} from "@/lib/vgroup/session";

export class VGroupApiError extends Error{
  constructor(public status:number,message:string){super(message)}
}

export async function requireApiBusinessUnit(unit:BusinessUnitCode):Promise<VGroupSession>{
  const session=await getVGroupSession();
  if(!session)throw new VGroupApiError(401,"Unauthorized");
  if(!canAccessBusinessUnit(session,unit))throw new VGroupApiError(403,"Forbidden");
  return session;
}

export async function requireApiPermission(unit:BusinessUnitCode,permission:PermissionKey):Promise<VGroupSession>{
  const session=await requireApiBusinessUnit(unit);
  if(!hasPermission(session,unit,permission))throw new VGroupApiError(403,"Forbidden");
  return session;
}

export function apiErrorResponse(error:unknown){
  if(error instanceof VGroupApiError)return NextResponse.json({error:error.message},{status:error.status});
  console.error("VGROUP_API_ERROR",error instanceof Error?error.message:"unknown_error");
  return NextResponse.json({error:"Internal server error"},{status:500});
}
