import {getVGroupSql} from "@/lib/vgroup/db";

export async function listApprovalRules(){
  const sql=getVGroupSql();
  return sql`select ar.*,bu.code as business_unit from vgroup.approval_rules ar left join vgroup.business_units bu on bu.id=ar.business_unit_id where ar.active=true order by bu.code nulls first,ar.module,ar.action,ar.threshold_amount nulls first`;
}

export async function listReconciliations(limit=50){
  const sql=getVGroupSql();
  return sql`select rr.*,bu.code as business_unit from vgroup.reconciliation_runs rr left join vgroup.business_units bu on bu.id=rr.business_unit_id order by rr.created_at desc limit ${Math.min(Math.max(limit,1),200)}`;
}

export async function listIntercompany(limit=50){
  const sql=getVGroupSql();
  return sql`select i.*,fb.code as from_business_unit,tb.code as to_business_unit from vgroup.intercompany_transactions i join vgroup.business_units fb on fb.id=i.from_business_unit_id join vgroup.business_units tb on tb.id=i.to_business_unit_id order by i.created_at desc limit ${Math.min(Math.max(limit,1),200)}`;
}

export async function listHospitalityIncidents(limit=50){
  const sql=getVGroupSql();
  return sql`select gi.*,r.property_id,r.guest_name,r.check_in,r.check_out from hospitality.guest_incidents gi join hospitality.reservations r on r.id=gi.reservation_id order by gi.created_at desc limit ${Math.min(Math.max(limit,1),200)}`;
}

export async function listDeliveryAcceptances(limit=50){
  const sql=getVGroupSql();
  return sql`select da.*,p.name as project_name,ph.name as phase_name from tech.delivery_acceptances da join tech.projects p on p.id=da.project_id left join tech.project_phases ph on ph.id=da.phase_id order by da.requested_at desc limit ${Math.min(Math.max(limit,1),200)}`;
}

export async function listBudgetSnapshots(projectId:string){
  const sql=getVGroupSql();
  return sql`select * from tech.project_budget_snapshots where project_id=${projectId}::uuid order by created_at desc`;
}
