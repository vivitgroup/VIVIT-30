export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, calendarEvents, clients, creativeTasks } from "@/lib/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { Role } from "@/lib/types";
import { CalendarClient } from "@/components/calendar/CalendarClient";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const end   = new Date(now.getFullYear(), now.getMonth()+2, 0);

  const [events, allClients, approvedTasks] = await Promise.all([
    db.select({ id: calendarEvents.id, title: calendarEvents.title, date: calendarEvents.date, platform: calendarEvents.platform, caption: calendarEvents.caption, status: calendarEvents.status, clientId: calendarEvents.clientId })
      .from(calendarEvents).where(and(gte(calendarEvents.date, start), lte(calendarEvents.date, end))).orderBy(calendarEvents.date),
    db.select({ id: clients.id, companyName: clients.companyName }).from(clients).where(eq(clients.isActive, true)).orderBy(clients.companyName),
    db.select({ id: creativeTasks.id, title: creativeTasks.title, clientId: creativeTasks.clientId })
      .from(creativeTasks).where(and(inArray(creativeTasks.status,["APPROVED","COMPLETED"]), eq(creativeTasks.isPosted,false))).limit(20),
  ]);

  // Add client names to events
  const clientIds = [...new Set([...events.map(e=>e.clientId), ...approvedTasks.map(t=>t.clientId)])];
  const clientRows = clientIds.length>0 ? await db.select({ id: clients.id, companyName: clients.companyName }).from(clients).where(inArray(clients.id, clientIds)) : [];
  const clientMap = Object.fromEntries(clientRows.map(c=>[c.id,c.companyName]));

  const eventsWithClients = events.map(e=>({...e, client:{companyName:clientMap[e.clientId]??""}}));
  const tasksWithClients = approvedTasks.map(t=>({...t, client:{companyName:clientMap[t.clientId]??""}}));

  const canManage = [Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER].includes(role);
  return <CalendarClient events={eventsWithClients} clients={allClients} approvedTasks={tasksWithClients} canManage={canManage} />;
}
