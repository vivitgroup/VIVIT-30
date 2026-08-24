export const dynamic="force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db,calendarEvents,clients,creativeTasks } from "@/lib/db";
import { eq,and,gte,lte,inArray,sql } from "drizzle-orm";
import { Role } from "@/lib/types";
import { CalendarClient } from "@/components/calendar/CalendarClient";
import { ClientCalendarDemo } from "@/components/calendar/ClientCalendarDemo";

export default async function CalendarPage(){
 const session=await auth();if(!session?.user)redirect("/login");const role=(session.user as any).role as Role,userId=String((session.user as any).id);
 if(![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.CREATOR,Role.SALES,Role.CLIENT].includes(role))redirect("/dashboard");
 const now=new Date(),start=new Date(now.getFullYear(),now.getMonth()-1,1),end=new Date(now.getFullYear(),now.getMonth()+2,0);
 let visibleClients:{id:string;companyName:string}[]=[];
 if(role===Role.SUPER_ADMIN||role===Role.SALES)visibleClients=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(eq(clients.isActive,true)).orderBy(clients.companyName);
 else if(role===Role.ACCOUNT_MANAGER)visibleClients=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.isActive,true),eq(clients.accountManagerId,userId))).orderBy(clients.companyName);
 else if(role===Role.CLIENT)visibleClients=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(eq(clients.isActive,true),eq(clients.userId,userId))).limit(1);
 const creatorTasks=role===Role.CREATOR?await db.select({id:creativeTasks.id,clientId:creativeTasks.clientId}).from(creativeTasks).where(eq(creativeTasks.assignedToId,userId)):[];
 const allowedClientIds=role===Role.CREATOR?[...new Set(creatorTasks.map(t=>t.clientId))]:visibleClients.map(c=>c.id),allowedTaskIds=creatorTasks.map(t=>t.id);
 const eventScope=role===Role.SUPER_ADMIN||role===Role.SALES?sql`true`:role===Role.CREATOR?(allowedTaskIds.length?inArray(calendarEvents.taskId,allowedTaskIds):eq(calendarEvents.taskId,"__none__")):(allowedClientIds.length?inArray(calendarEvents.clientId,allowedClientIds):eq(calendarEvents.clientId,"__none__"));
 const taskScope=role===Role.SUPER_ADMIN||role===Role.SALES?eq(creativeTasks.workspaceId,"default"):role===Role.CREATOR?eq(creativeTasks.assignedToId,userId):(allowedClientIds.length?inArray(creativeTasks.clientId,allowedClientIds):eq(creativeTasks.clientId,"__none__"));
 const eventFilter=role===Role.CLIENT?and(eventScope,eq(calendarEvents.status,"approved"),gte(calendarEvents.date,start),lte(calendarEvents.date,end)):and(eventScope,gte(calendarEvents.date,start),lte(calendarEvents.date,end));
 const [events,approvedTasks]=await Promise.all([
  db.select({id:calendarEvents.id,title:calendarEvents.title,date:calendarEvents.date,platform:calendarEvents.platform,caption:calendarEvents.caption,status:calendarEvents.status,clientId:calendarEvents.clientId}).from(calendarEvents).where(eventFilter).orderBy(calendarEvents.date),
  role===Role.CLIENT?Promise.resolve([]):db.select({id:creativeTasks.id,title:creativeTasks.title,clientId:creativeTasks.clientId}).from(creativeTasks).where(and(taskScope,inArray(creativeTasks.status,["APPROVED","COMPLETED"]),eq(creativeTasks.isPosted,false))).limit(30)
 ]);
 const clientIds=[...new Set([...events.map(e=>e.clientId),...approvedTasks.map(t=>t.clientId)])],clientRows=clientIds.length?await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(inArray(clients.id,clientIds)):[],clientMap=Object.fromEntries(clientRows.map(c=>[c.id,c.companyName]));
 const eventsWithClients=events.map(e=>({...e,client:{companyName:clientMap[e.clientId]??""}})),tasksWithClients=approvedTasks.map(t=>({...t,client:{companyName:clientMap[t.clientId]??""}}));
 const canManage=[Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER].includes(role);
 if(role===Role.CLIENT&&eventsWithClients.length===0)return <ClientCalendarDemo companyName={visibleClients[0]?.companyName||"Your Brand"}/>;
 return <CalendarClient events={eventsWithClients} clients={canManage?visibleClients:[]} approvedTasks={canManage?tasksWithClients:[]} canManage={canManage}/>;
}
