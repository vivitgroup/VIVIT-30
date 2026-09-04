import {getVGroupSql} from "@/lib/vgroup/db";

export async function adjustInventory(input:{itemId:string;quantityDelta:number;movementType:"in"|"out"|"adjustment";reason?:string|null;workOrderId?:string|null;userId?:string|null}){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select * from hospitality.adjust_inventory(${input.itemId}::uuid,${input.quantityDelta},${input.movementType},${input.reason??null},${input.workOrderId??null}::uuid,${input.userId??null}::uuid)`;
  return row;
}

export async function approveHospitalityWorkOrder(id:string,userId:string){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select (hospitality.approve_work_order(${id}::uuid,${userId}::uuid)).*`;
  return row;
}

export async function approveHospitalityPurchaseOrder(id:string,userId:string){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select (hospitality.approve_purchase_order(${id}::uuid,${userId}::uuid)).*`;
  return row;
}

export async function generateOwnerStatement(ownerId:string,periodStart:string,periodEnd:string){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select (hospitality.generate_owner_statement(${ownerId}::uuid,${periodStart}::date,${periodEnd}::date)).*`;
  return row;
}

export async function priceChangeRequest(id:string,price:number,extraDays:number,userId:string){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select (tech.price_change_request(${id}::uuid,${price},${extraDays},${userId}::uuid)).*`;
  return row;
}

export async function rejectChangeRequest(id:string,userId:string,note?:string|null){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select (tech.reject_change_request(${id}::uuid,${userId}::uuid,${note??null})).*`;
  return row;
}

export async function selectDurationOption(id:string){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select (tech.select_duration_price_option(${id}::uuid)).*`;
  return row;
}

export async function compressProjectTimeline(projectId:string,targetDays:number){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select (tech.compress_project_timeline(${projectId}::uuid,${targetDays})).*`;
  return row;
}

export async function recordInstallmentPayment(id:string,amount:number){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select (tech.record_installment_payment(${id}::uuid,${amount})).*`;
  return row;
}

export async function markNotificationRead(id:string,userId:string){
  const sql=getVGroupSql();
  const [row]=await sql<{ok:boolean}[]>`select vgroup.mark_notification_read(${id}::uuid,${userId}::uuid) as ok`;
  return row?.ok===true;
}
