export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, creativeTasks, salesLeads, contacts } from "@/lib/db";
import { ilike, or, eq, and, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const userId = String((session.user as any).id ?? "");
  const role = String((session.user as any).role ?? "");
  if (!q || q.length < 2) return NextResponse.json({ results: [], query: q });

  const term = `%${q}%`;
  const results: any[] = [];
  const isStaff = ["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER", "SALES", "ACCOUNTANT"].includes(role);

  try {
    let assignedClientIds: string[] = [];
    if (role === "ACCOUNT_MANAGER" || role === "MEDIA_BUYER") {
      assignedClientIds = (await db.select({ id: clients.id }).from(clients).where(and(
        eq(clients.workspaceId, "default"),
        eq(clients.isActive, true),
        role === "ACCOUNT_MANAGER" ? eq(clients.accountManagerId, userId) : eq(clients.mediaBuyerId, userId),
      ))).map((row) => row.id);
    }

    if (isStaff) {
      const clientResults = await db.select({
        id: clients.id,
        companyName: clients.companyName,
        industry: clients.industry,
        churnRisk: clients.churnRisk,
      }).from(clients).where(and(
        eq(clients.isActive, true),
        ilike(clients.companyName, term),
        role === "ACCOUNT_MANAGER" ? eq(clients.accountManagerId, userId) :
        role === "MEDIA_BUYER" ? eq(clients.mediaBuyerId, userId) :
        eq(clients.workspaceId, "default"),
      )).limit(5);
      results.push(...clientResults.map((client) => ({
        type: "client",
        title: client.companyName,
        subtitle: `${client.industry ?? ""} · ${client.churnRisk} risk`,
        href: `/dashboard/clients/${client.id}`,
        icon: "🏢",
      })));
    }

    if (["SUPER_ADMIN", "ACCOUNT_MANAGER", "CREATOR"].includes(role)) {
      const taskWhere = role === "CREATOR"
        ? and(eq(creativeTasks.workspaceId, "default"), ilike(creativeTasks.title, term), eq(creativeTasks.assignedToId, userId))
        : role === "ACCOUNT_MANAGER"
          ? assignedClientIds.length
            ? and(eq(creativeTasks.workspaceId, "default"), ilike(creativeTasks.title, term), inArray(creativeTasks.clientId, assignedClientIds))
            : and(eq(creativeTasks.workspaceId, "default"), eq(creativeTasks.clientId, "__none__"))
          : and(eq(creativeTasks.workspaceId, "default"), ilike(creativeTasks.title, term));
      const taskResults = await db.select({
        id: creativeTasks.id,
        title: creativeTasks.title,
        status: creativeTasks.status,
        type: creativeTasks.type,
      }).from(creativeTasks).where(taskWhere).limit(5);
      results.push(...taskResults.map((task) => ({
        type: "task",
        title: task.title,
        subtitle: `${task.type?.replace(/_/g, " ")} · ${task.status}`,
        href: `/dashboard/creative/${task.id}`,
        icon: "🎨",
      })));
    }

    if (["SUPER_ADMIN", "SALES"].includes(role)) {
      const leadResults = await db.select({
        id: salesLeads.id,
        companyName: salesLeads.companyName,
        stage: salesLeads.stage,
        estimatedValue: salesLeads.estimatedValue,
      }).from(salesLeads).where(and(
        or(ilike(salesLeads.companyName, term), ilike(salesLeads.contactPerson, term)),
        role === "SALES" ? eq(salesLeads.salesRepId, userId) : eq(salesLeads.workspaceId, "default"),
      )).limit(3);
      results.push(...leadResults.map((lead) => ({
        type: "lead",
        title: lead.companyName,
        subtitle: `${lead.stage} · ${Number(lead.estimatedValue ?? 0).toLocaleString("en-EG")} EGP`,
        href: "/dashboard/sales",
        icon: "🎯",
      })));
    }

    if (["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER"].includes(role)) {
      const contactResults = await db.select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        clientId: contacts.clientId,
      }).from(contacts).innerJoin(clients, eq(contacts.clientId, clients.id)).where(and(
        ilike(contacts.name, term),
        role === "ACCOUNT_MANAGER" ? eq(clients.accountManagerId, userId) :
        role === "MEDIA_BUYER" ? eq(clients.mediaBuyerId, userId) :
        eq(clients.workspaceId, "default"),
      )).limit(3);
      results.push(...contactResults.map((contact) => ({
        type: "contact",
        title: contact.name,
        subtitle: contact.email ?? "",
        href: `/dashboard/clients/${contact.clientId}`,
        icon: "👤",
      })));
    }
  } catch (error) {
    console.error("Search error:", error);
  }

  return NextResponse.json({
    results: results.slice(0, 12),
    query: q,
    count: results.length,
  });
}
