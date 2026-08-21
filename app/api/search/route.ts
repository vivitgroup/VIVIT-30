export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, creativeTasks, salesLeads, contacts, proposals } from "@/lib/db";
import { ilike, or, eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error:"Unauthorized" },{status:401});

  const q      = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const userId = (session.user as any).id as string;
  const role   = (session.user as any).role as string;

  if (!q || q.length < 2) return NextResponse.json({ results:[], query:q });

  const term    = `%${q}%`;
  const results: any[] = [];

  // Fix 62: Only return data user has access to
  const isAdmin = ["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","SALES","ACCOUNTANT"].includes(role);

  try {
    // Clients — only if not CLIENT role
    if (isAdmin) {
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

    // Tasks
    if (["SUPER_ADMIN","ACCOUNT_MANAGER","CREATOR"].includes(role)) {
      const where = role === "CREATOR"
        ? and(ilike(creativeTasks.title,term), eq(creativeTasks.assignedToId,userId))
        : ilike(creativeTasks.title,term);
      const taskResults = await db.select({
        id:creativeTasks.id, title:creativeTasks.title,
        status:creativeTasks.status, type:creativeTasks.type,
      }).from(creativeTasks).where(where).limit(5);
      results.push(...taskResults.map(t=>({
        type:"task", title:t.title,
        subtitle:`${t.type?.replace(/_/g," ")} · ${t.status}`,
        href:`/dashboard/creative/${t.id}`, icon:"🎨",
      })));
    }

    // Leads — sales + admins only
    if (["SUPER_ADMIN","SALES","ACCOUNT_MANAGER"].includes(role)) {
      const leadResults = await db.select({
        id:salesLeads.id, companyName:salesLeads.companyName,
        stage:salesLeads.stage, estimatedValue:salesLeads.estimatedValue,
      }).from(salesLeads)
        .where(or(ilike(salesLeads.companyName,term),ilike(salesLeads.contactPerson,term)))
        .limit(3);
      results.push(...leadResults.map(l=>({
        type:"lead", title:l.companyName,
        subtitle:`${l.stage} · $${(l.estimatedValue??0).toLocaleString()}`,
        href:`/dashboard/sales`, icon:"🎯",
      })));
    }

    // Contacts
    if (isAdmin) {
      const contactResults = await db.select({
        id:contacts.id, name:contacts.name,
        email:contacts.email, clientId:contacts.clientId,
      }).from(contacts).where(ilike(contacts.name,term)).limit(3);
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
