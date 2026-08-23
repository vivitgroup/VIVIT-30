export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, creativeTasks, clients, financeRecords, notifications } from "@/lib/db";
import { eq, inArray, lte, and } from "drizzle-orm";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

function hasRole(role: string, allowed: string[]) {
  return allowed.includes(role);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0) : [];
  const data = body.data ?? {};
  const role = String((session.user as any).role ?? "");
  const userId = String(session.user.id ?? "");
  const updated: string[] = [];

  const assignedClientIds = async () => {
    if (role === "SUPER_ADMIN" || role === "ACCOUNTANT") return null;
    if (role === "ACCOUNT_MANAGER") {
      return (await db.select({ id: clients.id }).from(clients).where(and(
        eq(clients.workspaceId, "default"),
        eq(clients.isActive, true),
        eq(clients.accountManagerId, userId),
      ))).map((row) => row.id);
    }
    if (role === "MEDIA_BUYER") {
      return (await db.select({ id: clients.id }).from(clients).where(and(
        eq(clients.workspaceId, "default"),
        eq(clients.isActive, true),
        eq(clients.mediaBuyerId, userId),
      ))).map((row) => row.id);
    }
    return [] as string[];
  };

  const scopedTaskIds = async (requestedIds: string[]) => {
    if (!requestedIds.length) return [] as string[];
    if (role === "SUPER_ADMIN") {
      const rows = await db.select({ id: creativeTasks.id }).from(creativeTasks).where(and(
        eq(creativeTasks.workspaceId, "default"),
        inArray(creativeTasks.id, requestedIds),
      ));
      return rows.map((row) => row.id);
    }
    if (role === "CREATOR") {
      const rows = await db.select({ id: creativeTasks.id }).from(creativeTasks).where(and(
        eq(creativeTasks.workspaceId, "default"),
        eq(creativeTasks.assignedToId, userId),
        inArray(creativeTasks.id, requestedIds),
      ));
      return rows.map((row) => row.id);
    }
    if (role === "ACCOUNT_MANAGER") {
      const clientIds = await assignedClientIds();
      if (!clientIds?.length) return [] as string[];
      const rows = await db.select({ id: creativeTasks.id }).from(creativeTasks).where(and(
        eq(creativeTasks.workspaceId, "default"),
        inArray(creativeTasks.clientId, clientIds),
        inArray(creativeTasks.id, requestedIds),
      ));
      return rows.map((row) => row.id);
    }
    return [] as string[];
  };

  switch (action) {
    case "tasks.status": {
      if (!hasRole(role, ["SUPER_ADMIN", "ACCOUNT_MANAGER"])) return forbidden();
      const permittedIds = await scopedTaskIds(ids);
      if (permittedIds.length !== ids.length) return forbidden();
      if (!permittedIds.length || typeof data.status !== "string") {
        return NextResponse.json({ error: "Task ids and status are required" }, { status: 400 });
      }
      await db.update(creativeTasks)
        .set({ status: data.status, updatedAt: new Date() } as any)
        .where(inArray(creativeTasks.id, permittedIds));
      updated.push(...permittedIds);
      break;
    }

    case "tasks.assign": {
      if (!hasRole(role, ["SUPER_ADMIN", "ACCOUNT_MANAGER"])) return forbidden();
      const permittedIds = await scopedTaskIds(ids);
      if (permittedIds.length !== ids.length) return forbidden();
      if (!permittedIds.length || typeof data.assignedToId !== "string") {
        return NextResponse.json({ error: "Task ids and assignee are required" }, { status: 400 });
      }
      await db.update(creativeTasks)
        .set({ assignedToId: data.assignedToId, updatedAt: new Date() } as any)
        .where(inArray(creativeTasks.id, permittedIds));
      updated.push(...permittedIds);
      break;
    }

    case "clients.recalculate":
    case "clients.update_health": {
      if (role !== "SUPER_ADMIN") return forbidden();
      const base = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
      const res = await fetch(`${base}/api/performance-score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.get("cookie") ?? "",
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        return NextResponse.json({ error: "Health recalculation failed" }, { status: 502 });
      }
      return NextResponse.json({ success: true, action: "health_recalculated" });
    }

    case "clients.export": {
      if (!hasRole(role, ["SUPER_ADMIN", "ACCOUNT_MANAGER", "MEDIA_BUYER", "ACCOUNTANT"])) return forbidden();
      const clientIds = await assignedClientIds();
      const allClients = clientIds === null
        ? await db.select().from(clients).where(and(eq(clients.workspaceId, "default"), eq(clients.isActive, true)))
        : clientIds.length
          ? await db.select().from(clients).where(and(eq(clients.workspaceId, "default"), eq(clients.isActive, true), inArray(clients.id, clientIds)))
          : [];
      return NextResponse.json({ data: allClients, count: allClients.length });
    }

    case "tasks.export": {
      if (!hasRole(role, ["SUPER_ADMIN", "ACCOUNT_MANAGER", "CREATOR"])) return forbidden();
      if (ids.length) {
        const permittedIds = await scopedTaskIds(ids);
        if (permittedIds.length !== ids.length) return forbidden();
        const rows = permittedIds.length
          ? await db.select().from(creativeTasks).where(inArray(creativeTasks.id, permittedIds))
          : [];
        return NextResponse.json({ data: rows, count: rows.length });
      }
      if (role === "SUPER_ADMIN") {
        const rows = await db.select().from(creativeTasks).where(eq(creativeTasks.workspaceId, "default"));
        return NextResponse.json({ data: rows, count: rows.length });
      }
      if (role === "CREATOR") {
        const rows = await db.select().from(creativeTasks).where(and(
          eq(creativeTasks.workspaceId, "default"),
          eq(creativeTasks.assignedToId, userId),
        ));
        return NextResponse.json({ data: rows, count: rows.length });
      }
      const clientIds = await assignedClientIds();
      const rows = clientIds?.length
        ? await db.select().from(creativeTasks).where(and(
            eq(creativeTasks.workspaceId, "default"),
            inArray(creativeTasks.clientId, clientIds),
          ))
        : [];
      return NextResponse.json({ data: rows, count: rows.length });
    }

    case "tasks.notify": {
      if (!hasRole(role, ["SUPER_ADMIN", "ACCOUNT_MANAGER"])) return forbidden();
      const permittedIds = await scopedTaskIds(ids);
      if (permittedIds.length !== ids.length) return forbidden();
      if (!permittedIds.length) return NextResponse.json({ error: "Task ids are required" }, { status: 400 });
      const tasks = await db.select({ id: creativeTasks.id, title: creativeTasks.title, assignedToId: creativeTasks.assignedToId })
        .from(creativeTasks).where(inArray(creativeTasks.id, permittedIds));
      let notified = 0;
      for (const task of tasks) {
        if (!task.assignedToId) continue;
        await db.insert(notifications).values({
          userId: task.assignedToId,
          type: "DEADLINE_UPCOMING",
          priority: "high",
          title: `📬 Reminder: ${task.title}`,
          message: "Your task needs attention — please check the latest status.",
          link: `/dashboard/creative/${task.id}`,
        } as any).onConflictDoNothing();
        notified += 1;
      }
      return NextResponse.json({ success: true, notified });
    }

    case "invoices.mark_overdue": {
      if (!hasRole(role, ["SUPER_ADMIN", "ACCOUNTANT"])) return forbidden();
      const now = new Date();
      await db.update(financeRecords)
        .set({ invoiceStatus: "OVERDUE" as any } as any)
        .where(and(
          eq(financeRecords.workspaceId, "default"),
          lte(financeRecords.dueDate!, now),
          eq(financeRecords.invoiceStatus, "SENT" as any),
        ));
      return NextResponse.json({ success: true, action: "overdue_marked" });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ success: true, updated: updated.length, ids: updated });
}
