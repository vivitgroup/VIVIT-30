import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {canAccessBusinessUnit,hasPermission,type BusinessUnitCode,type PermissionKey} from "@/lib/vgroup/contracts";
import {getVGroupSession,type VGroupSession} from "@/lib/vgroup/session";

export class VGroupApiError extends Error{
  constructor(public status:number,message:string,public code="REQUEST_FAILED"){super(message)}
}

export async function requireApiBusinessUnit(unit:BusinessUnitCode):Promise<VGroupSession>{
  const session=await getVGroupSession();
  if(!session)throw new VGroupApiError(401,"Unauthorized","UNAUTHORIZED");
  if(!canAccessBusinessUnit(session,unit))throw new VGroupApiError(403,"Forbidden","BUSINESS_UNIT_FORBIDDEN");
  return session;
}

export async function requireApiPermission(unit:BusinessUnitCode,permission:PermissionKey):Promise<VGroupSession>{
  const session=await requireApiBusinessUnit(unit);
  if(!hasPermission(session,unit,permission))throw new VGroupApiError(403,"Forbidden","PERMISSION_FORBIDDEN");
  return session;
}

export function apiErrorResponse(error:unknown){
  const requestId=randomUUID();
  if(error instanceof VGroupApiError)return NextResponse.json({error:{code:error.code,message:error.message,requestId}},{status:error.status,headers:{"Cache-Control":"no-store","X-Request-Id":requestId}});
  console.error("VGROUP_API_ERROR",requestId,error instanceof Error?error.message:"unknown_error");
  return NextResponse.json({error:{code:"INTERNAL_ERROR",message:"Internal server error",requestId}},{status:500,headers:{"Cache-Control":"no-store","X-Request-Id":requestId}});
}
