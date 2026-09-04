import {getVGroupSql} from "@/lib/vgroup/db";
import type {VGroupSession} from "@/lib/vgroup/session";

export type HospitalityOwnerScope={isOwner:boolean;ownerIds:string[];propertyIds:string[]};

export async function getHospitalityOwnerScope(session:VGroupSession):Promise<HospitalityOwnerScope>{
  const membership=session.memberships.find(item=>item.businessUnit==="hospitality"||item.role==="GROUP_SUPER_ADMIN");
  const isOwner=membership?.role==="OWNER";
  if(!isOwner)return {isOwner:false,ownerIds:[],propertyIds:[]};
  const sql=getVGroupSql();
  const owners=await sql<{id:string}[]>`select id::text from hospitality.owners where user_id=${session.userId}::uuid and archived_at is null`;
  const ownerIds=Array.from(owners).map(row=>row.id);
  const properties=ownerIds.length?await sql<{id:string}[]>`select id::text from hospitality.properties where owner_id=any(${ownerIds}::uuid[]) and archived_at is null`:[];
  return {isOwner:true,ownerIds,propertyIds:Array.from(properties).map(row=>row.id)};
}

export function ownerCanAccessProperty(scope:HospitalityOwnerScope,propertyId:string){
  return !scope.isOwner||scope.propertyIds.includes(propertyId);
}
