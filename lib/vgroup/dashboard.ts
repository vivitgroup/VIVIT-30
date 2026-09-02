import {getVGroupSql} from "@/lib/vgroup/db";

export type HospitalityDashboard={owners:number;properties:number;reservations:number;openWorkOrders:number;openInvoices:number;revenue:number;expenses:number;ownerNet:number};
export type TechDashboard={clients:number;projects:number;activeProjects:number;openChangeRequests:number;outstandingInstallments:number;subscriptions:number;activeSubscriptions:number;revenue:number};

const n=(value:unknown)=>Number(value??0);

export async function getHospitalityDashboard():Promise<HospitalityDashboard>{
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`
    select
      (select count(*) from hospitality.owners where archived_at is null) owners,
      (select count(*) from hospitality.properties where archived_at is null) properties,
      (select count(*) from hospitality.reservations where archived_at is null) reservations,
      (select count(*) from hospitality.work_orders where archived_at is null and status not in ('completed','cancelled')) open_work_orders,
      (select count(*) from hospitality.invoices where archived_at is null and status not in ('paid','cancelled')) open_invoices,
      coalesce((select sum(amount) from vgroup.ledger_transactions where business_unit='hospitality' and direction='credit' and archived_at is null),0) revenue,
      coalesce((select sum(amount) from vgroup.ledger_transactions where business_unit='hospitality' and direction='debit' and archived_at is null),0) expenses,
      coalesce((select sum(case when direction='credit' then amount else -amount end) from vgroup.ledger_transactions where business_unit='hospitality' and archived_at is null),0) owner_net
  `;
  return {owners:n(row.owners),properties:n(row.properties),reservations:n(row.reservations),openWorkOrders:n(row.open_work_orders),openInvoices:n(row.open_invoices),revenue:n(row.revenue),expenses:n(row.expenses),ownerNet:n(row.owner_net)};
}

export async function getTechDashboard():Promise<TechDashboard>{
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`
    select
      (select count(*) from tech.clients where archived_at is null) clients,
      (select count(*) from tech.projects where archived_at is null) projects,
      (select count(*) from tech.projects where archived_at is null and status in ('planning','in_progress','review')) active_projects,
      (select count(*) from tech.change_requests where archived_at is null and status in ('submitted','priced')) open_change_requests,
      (select count(*) from tech.payment_installments where archived_at is null and status in ('pending','overdue')) outstanding_installments,
      (select count(*) from tech.subscriptions where archived_at is null) subscriptions,
      (select count(*) from tech.subscriptions where archived_at is null and status in ('trialing','active')) active_subscriptions,
      coalesce((select sum(amount) from vgroup.ledger_transactions where business_unit='tech' and direction='credit' and archived_at is null),0) revenue
  `;
  return {clients:n(row.clients),projects:n(row.projects),activeProjects:n(row.active_projects),openChangeRequests:n(row.open_change_requests),outstandingInstallments:n(row.outstanding_installments),subscriptions:n(row.subscriptions),activeSubscriptions:n(row.active_subscriptions),revenue:n(row.revenue)};
}
