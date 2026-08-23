export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, calendarEvents, clients, creativeTasks } from "@/lib/db";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { Role } from "@/lib/types";
import { CalendarClient } from "@/components/calendar/CalendarClient";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  const userId = (session.user as any).id as string;
  if(![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.CREATOR].includes(role)) redirect("/dashboard");

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const end   = new Date(now.getFullYear(), now.getMonth()+2, 0);

  const visibleClients = role===Role.ACCOUNT_MANAGER
    ? await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.isActive,true),eq(clients.accountManagerId,userId))).orderBy(clients.companyName)
    : role===Role.SUPER_ADMIN
      ? await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(eq(clients.isActive,true)).orderBy(clients.companyName)
      : [];
  const creatorTasks = role===Role.CREATOR
    ? await db.select({id:creativeTasks.id,clientId:creativeTasks.clientId}).from(creativeTasks).where(eq(creativeTasks.assignedToId,userId))
    : [];
  const allowedClientIds = role===Role.CREATOR ? [...new Set(creatorTasks.map(t=>t.clientId))] : visibleClients.map(c=>c.id);
  const allowedTaskIds = creatorTasks.map(t=>t.id);
  const eventScope = role===Role.SUPER_ADMIN
    ? sql`true`
    : role===Role.ACCOUNT_MANAGER
      ? (allowedClientIds.length?inArray(calendarEvents.clientId,allowedClientIds):eq(calendarEvents.clientId,"__none__"))
      : (allowedTaskIds.length?inArray(calendarEvents.taskId,allowedTaskIds):eq(calendarEvents.taskId,"__none__"));
  const taskScope = role===Role.SUPER_ADMIN
    ? eq(creativeTasks.workspaceId,"default")
    : role===Role.ACCOUNT_MANAGER
      ? (allowedClientIds.length?inArray(creativeTasks.clientId,allowedClientIds):eq(creativeTasks.clientId,"__none__"))
      : eq(creativeTasks.assignedToId,userId);

  const [events, approvedTasks] = await Promise.all([
    db.select({ id: calendarEvents.id, title: calendarEvents.title, date: calendarEvents.date, platform: calendarEvents.platform, caption: calendarEvents.caption, status: calendarEvents.status, clientId: calendarEvents.clientId })
      .from(calendarEvents).where(and(eventScope,gte(calendarEvents.date, start), lte(calendarEvents.date, end))).orderBy(calendarEvents.date),
    db.select({ id: creativeTasks.id, title: creativeTasks.title, clientId: creativeTasks.clientId })
      .from(creativeTasks).where(and(taskScope,inArray(creativeTasks.status,["APPROVED","COMPLETED"]), eq(creativeTasks.isPosted,false))).limit(20),
  ]);

  // Add client names to events
  const clientIds = [...new Set([...events.map(e=>e.clientId), ...approvedTasks.map(t=>t.clientId)])];
  const clientRows = clientIds.length>0 ? await db.select({ id: clients.id, companyName: clients.companyName }).from(clients).where(inArray(clients.id, clientIds)) : [];
  const clientMap = Object.fromEntries(clientRows.map(c=>[c.id,c.companyName]));

  const eventsWithClients = events.map(e=>({...e, client:{companyName:clientMap[e.clientId]??""}}));
  const tasksWithClients = approvedTasks.map(t=>({...t, client:{companyName:clientMap[t.clientId]??""}}));

  const canManage = [Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER].includes(role);
  return <CalendarClient events={eventsWithClients} clients={visibleClients} approvedTasks={tasksWithClients} canManage={canManage} />;
}
