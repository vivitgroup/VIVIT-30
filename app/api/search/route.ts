export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, creativeTasks, salesLeads, contacts } from "@/lib/db";
import { ilike, or, eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error:"Unauthorized" },{status:401});

  const q      = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const userId = (session.user as any).id as string;
  const role   = (session.user as any).role as string;

  if (!q || q.length < 2) return NextResponse.json({ results:[], query:q });

  const term = `%${q}%`;
  const results: any[] = [];
  const canSearchClients = ["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","SALES","ACCOUNTANT"].includes(role);

  try {
    if (canSearchClients) {
      const clientResults = await db.select({
        id:clients.id, companyName:clients.companyName,
        industry:clients.industry, churnRisk:clients.churnRisk,
      }).from(clients)
        .where(and(eq(clients.isActive,true), ilike(clients.companyName,term),role==="ACCOUNT_MANAGER"?eq(clients.accountManagerId,userId):role==="MEDIA_BUYER"?eq(clients.mediaBuyerId,userId):eq(clients.workspaceId,"default")))
        .limit(5);
      results.push(...clientResults.map(c=>({
        type:"client", title:c.companyName,
        subtitle:`${c.industry??""} · ${c.churnRisk} risk`,
        href:`/dashboard/clients/${c.id}`, icon:"🏢",
      })));
    }

    if (["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"].includes(role)) {
      const taskWhere = role === "CREATOR"
        ? and(ilike(creativeTasks.title,term), eq(creativeTasks.assignedToId,userId))
        : role === "ACCOUNT_MANAGER"
          ? and(ilike(creativeTasks.title,term), eq(clients.accountManagerId,userId), eq(clients.isActive,true))
          : ilike(creativeTasks.title,term);
      const taskBase = db.select({
        id:creativeTasks.id, title:creativeTasks.title,
        status:creativeTasks.status, type:creativeTasks.type,
      }).from(creativeTasks);
      const taskResults = role === "ACCOUNT_MANAGER"
        ? await taskBase.innerJoin(clients,eq(creativeTasks.clientId,clients.id)).where(taskWhere).limit(5)
        : await taskBase.where(taskWhere).limit(5);
      results.push(...taskResults.map(t=>({
        type:"task", title:t.title,
        subtitle:`${t.type?.replace(/_/g," ")} · ${t.status}`,
        href:`/dashboard/creative/${t.id}`, icon:"🎨",
      })));
    }

    if (["SUPER_ADMIN","SALES"].includes(role)) {
      const leadResults = await db.select({
        id:salesLeads.id, companyName:salesLeads.companyName,
        stage:salesLeads.stage, estimatedValue:salesLeads.estimatedValue,
      }).from(salesLeads)
        .where(and(or(ilike(salesLeads.companyName,term),ilike(salesLeads.contactPerson,term)),role==="SALES"?eq(salesLeads.salesRepId,userId):eq(salesLeads.workspaceId,"default")))
        .limit(3);
      results.push(...leadResults.map(l=>({
        type:"lead", title:l.companyName,
        subtitle:`${l.stage} · EGP ${(l.estimatedValue??0).toLocaleString()}`,
        href:`/dashboard/sales`, icon:"🎯",
      })));
    }

    if (["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role)) {
      const contactResults = await db.select({
        id:contacts.id, name:contacts.name,
        email:contacts.email, clientId:contacts.clientId,
      }).from(contacts).innerJoin(clients,eq(contacts.clientId,clients.id)).where(and(
        ilike(contacts.name,term),
        role==="ACCOUNT_MANAGER" ? eq(clients.accountManagerId,userId) :
        role==="MEDIA_BUYER" ? eq(clients.mediaBuyerId,userId) : eq(clients.workspaceId,"default")
      )).limit(3);
      results.push(...contactResults.map(c=>({
        type:"contact", title:c.name,
        subtitle:c.email??"",
        href:`/dashboard/clients/${c.clientId}`, icon:"👤",
      })));
    }
  } catch (e) {
    console.error("Search error:", e);
  }

  return NextResponse.json({
    results: results.slice(0,12),
    query: q,
    count: results.length,
  });
}
