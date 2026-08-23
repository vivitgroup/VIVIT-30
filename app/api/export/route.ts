export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, creativeTasks, salesLeads, financeRecords, mediaMetrics , companyExpenses } from "@/lib/db";
import { eq, gte, and, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entity = req.nextUrl.searchParams.get("entity") ?? "clients";
  const role=(session.user as any).role as string;
  const userId=(session.user as any).id as string;
  const allowed:Record<string,string[]>={SUPER_ADMIN:["clients","tasks","sales","finance","media","expenses"],ACCOUNT_MANAGER:["clients","tasks","sales","media"],MEDIA_BUYER:["clients","media"],ACCOUNTANT:["clients","finance","expenses"],SALES:["clients","sales"],CREATOR:["tasks"],CLIENT:[]};
  if(!(allowed[role]??[]).includes(entity))return NextResponse.json({error:"Forbidden"},{status:403});

  let data: any[] = [];
  let headers: string[] = [];
  const assignedClients = ["ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role)
    ? await db.select({id:clients.id}).from(clients).where(and(eq(clients.isActive,true),role==="ACCOUNT_MANAGER"?eq(clients.accountManagerId,userId):eq(clients.mediaBuyerId,userId)))
    : [];
  const clientIds=assignedClients.map(c=>c.id);

  switch (entity) {
    case "clients":
      data = await db.select().from(clients).where(and(
        eq(clients.isActive, true),
        role==="ACCOUNT_MANAGER" ? eq(clients.accountManagerId,userId) :
        role==="MEDIA_BUYER" ? eq(clients.mediaBuyerId,userId) : eq(clients.workspaceId,"default")
      ));
      headers = ["Company","Industry","Health Score","Churn Risk","Monthly Retainer","Media Budget","Contract Value","Performance Score"];
      data = data.map(c => [c.companyName,c.industry,c.healthScore,c.churnRisk,c.monthlyRetainer,c.mediaBudget,c.contractValue,c.performanceScore]);
      break;
    case "tasks":
      data = await db.select().from(creativeTasks).where(
        role==="CREATOR" ? eq(creativeTasks.assignedToId,userId) :
        role==="ACCOUNT_MANAGER" ? (clientIds.length?inArray(creativeTasks.clientId,clientIds):eq(creativeTasks.clientId,"__none__")) :
        eq(creativeTasks.workspaceId,"default")
      );
      headers = ["Title","Type","Status","Priority","Client ID","Assigned To","Deadline","Revisions","Posted"];
      data = data.map(t => [t.title,t.type,t.status,t.priority,t.clientId,t.assignedToId,t.deadline,t.revisionCount,t.isPosted]);
      break;
    case "sales":
      data = await db.select().from(salesLeads).where(role==="ACCOUNT_MANAGER"?(clientIds.length?inArray(salesLeads.clientId,clientIds):eq(salesLeads.clientId,"__none__")):eq(salesLeads.workspaceId,"default"));
      headers = ["Company","Contact","Stage","Source","Value","Probability","Industry","Expected Close"];
      data = data.map(l => [l.companyName,l.contactPerson,l.stage,l.source,l.estimatedValue,l.probability,l.industry,l.expectedClose]);
      break;
    case "finance":
      data = await db.select().from(financeRecords).where(eq(financeRecords.year, new Date().getFullYear()));
      headers = ["Client ID","Month","Year","Retainer","Media Fee","Extra","Total","Paid","Outstanding","Status"];
      data = data.map(r => [r.clientId,r.month,r.year,r.retainer,r.mediaBuyingFee,r.extraServices,r.totalRevenue,r.paid,r.outstanding,r.invoiceStatus]);
      break;
    case "media":
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      data = await db.select().from(mediaMetrics).where(and(gte(mediaMetrics.date, monthStart),["ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role)?(clientIds.length?inArray(mediaMetrics.clientId,clientIds):eq(mediaMetrics.clientId,"__none__")):eq(mediaMetrics.workspaceId,"default")));
      headers = ["Client ID","Platform","Date","Ad Spend","Leads","Purchases","Revenue","ROAS","CPL","Agency Fee"];
      data = data.map(m => [m.clientId,m.platform,m.date,m.adSpend,m.leads,m.purchases,m.revenue,m.roas,m.cpl,m.agencyFee]);
      break;

    case "expenses":
      const expList = await db.select().from(companyExpenses).orderBy(companyExpenses.date);
      headers = ["Category","Description","Amount","Date"];
      data = expList.map(e=>[e.category,e.description,e.amount,e.date]);
      break;
  }

  return NextResponse.json({ headers, rows: data, count: data.length, entity });
}
