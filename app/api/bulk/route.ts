export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, creativeTasks, clients, users , financeRecords, notifications } from "@/lib/db";
import { eq, inArray , lte , and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, ids, data } = await req.json();
  const role = (session.user as any).role;
  const updated: string[] = [];

  switch(action) {
    // Bulk update task status
    case "tasks.status": {
      if (!["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await db.update(creativeTasks)
        .set({ status: data.status, updatedAt: new Date() })
        .where(inArray(creativeTasks.id, ids));
      updated.push(...ids);
      break;
    }
    // Bulk assign tasks to creator
    case "tasks.assign": {
      if (!["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await db.update(creativeTasks)
        .set({ assignedToId: data.assignedToId, updatedAt: new Date() })
        .where(inArray(creativeTasks.id, ids));
      updated.push(...ids);
      break;
    }
    // Bulk update client health scores
    case "clients.recalculate": {
      if (role !== "SUPER_ADMIN")
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      // Trigger health score recalculation
      await fetch(`${process.env.NEXTAUTH_URL}/api/performance-score`, { method: "POST" });
      updated.push("all_clients");
      break;
    }
    // Export clients as JSON (for Excel processing)
    case "clients.export": {
      const allClients = await db.select().from(clients).where(eq(clients.isActive, true));
      return NextResponse.json({ data: allClients, count: allClients.length });
    }
    // Export tasks as JSON
    case "tasks.export": {
      const allTasks = ids?.length > 0
        ? await db.select().from(creativeTasks).where(inArray(creativeTasks.id, ids))
        : await db.select().from(creativeTasks);
      return NextResponse.json({ data: allTasks, count: allTasks.length });
    }
    case "tasks.notify": {
      // Bulk send reminders for selected tasks
      const taskIds = ids as string[];
      const tasks = await db.select({ id:creativeTasks.id, title:creativeTasks.title, assignedToId:creativeTasks.assignedToId })
        .from(creativeTasks).where(inArray(creativeTasks.id, taskIds));
      for (const t of tasks) {
        if (!t.assignedToId) continue;
        await db.insert(notifications).values({
          userId:t.assignedToId, type:"DEADLINE_UPCOMING", priority:"high",
          title:`📬 Reminder: ${t.title}`,
          message:"Your task needs attention — please check the latest status.",
          link:`/dashboard/creative/${t.id}`,
        }).onConflictDoNothing();
      }
      return NextResponse.json({ success: true, notified: tasks.length });
    }

    case "clients.update_health": {
      // Trigger health score recalculation
      const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      await fetch(`${base}/api/performance-score`, { method: "POST" });
      return NextResponse.json({ success: true, action: "health_recalculated" });
    }

    case "invoices.mark_overdue": {
      // Mark all unpaid past-due invoices as OVERDUE
      const now2 = new Date();
      await db.update(financeRecords).set({ invoiceStatus: "OVERDUE" as any })
        .where(and(lte(financeRecords.dueDate!, now2), eq(financeRecords.invoiceStatus, "SENT" as any)));
      return NextResponse.json({ success: true, action: "overdue_marked" });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ success: true, updated: updated.length, ids: updated });
}
