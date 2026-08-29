export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {db,calendarEvents,clients,creativeTasks} from "@/lib/db";
import {eq,and,gte,lte,inArray,sql} from "drizzle-orm";
import {Role} from "@/lib/types";
import {CalendarClient} from "@/components/calendar/CalendarClient";

export default async function CalendarPage({searchParams}:{searchParams:Promise<{clientId?:string}>}){
 const session=await auth();if(!session?.user)redirect("/login");
 const role=(session.user as any).role as Role,userId=String((session.user as any).id),workspaceId=String((session.user as any).workspaceId||""),q=await searchParams;if(!workspaceId)redirect("/login?reason=workspace_missing");
 if(![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.MEDIA_BUYER,Role.CREATOR,Role.SALES,Role.CLIENT].includes(role))redirect("/dashboard");
 const now=new Date(),start=new Date(now.getFullYear(),now.getMonth()-1,1),end=new Date(now.getFullYear(),now.getMonth()+2,0);
 const activeClientBase=and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true));
 let visibleClients:{id:string;companyName:string}[]=[];
 if(role===Role.SUPER_ADMIN||role===Role.SALES)visibleClients=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(activeClientBase).orderBy(clients.companyName);
 else if(role===Role.ACCOUNT_MANAGER)visibleClients=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(activeClientBase,eq(clients.accountManagerId,userId))).orderBy(clients.companyName);
 else if(role===Role.MEDIA_BUYER)visibleClients=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(activeClientBase,eq(clients.mediaBuyerId,userId))).orderBy(clients.companyName);
 else if(role===Role.CLIENT)visibleClients=await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(activeClientBase,eq(clients.userId,userId))).limit(1);
 const creatorTasks=role===Role.CREATOR?Array.from(await db.execute(sql`select t.id,t.client_id from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${workspaceId} and c.workspace_id=${workspaceId} and c.is_active=true and t.assigned_to_id=${userId} and t.archived_at is null`)) as any[]:[];
 const allowedClientIds=role===Role.CREATOR?[...new Set(creatorTasks.map(t=>String(t.client_id)).filter(Boolean))]:visibleClients.map(c=>c.id),allowedTaskIds=creatorTasks.map(t=>String(t.id));
 const requestedClient=String(q?.clientId||"");
 const selectedClientId=requestedClient&&allowedClientIds.includes(requestedClient)?requestedClient:"";
 const eventScope=role===Role.CREATOR?(allowedTaskIds.length?inArray(calendarEvents.taskId,allowedTaskIds):eq(calendarEvents.taskId,"__none__")):(selectedClientId?eq(calendarEvents.clientId,selectedClientId):(allowedClientIds.length?inArray(calendarEvents.clientId,allowedClientIds):eq(calendarEvents.clientId,"__none__")));
 const taskActive=sql`${creativeTasks.id} in (select t.id from creative_tasks t join clients c on c.id=t.client_id where t.workspace_id=${workspaceId} and c.workspace_id=${workspaceId} and t.archived_at is null and c.is_active=true)`;
 const taskScope=role===Role.CREATOR?and(eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.assignedToId,userId),taskActive):(selectedClientId?and(eq(creativeTasks.workspaceId,workspaceId),eq(creativeTasks.clientId,selectedClientId),taskActive):(allowedClientIds.length?and(eq(creativeTasks.workspaceId,workspaceId),inArray(creativeTasks.clientId,allowedClientIds),taskActive):eq(creativeTasks.clientId,"__none__")));
 const eventFilter=role===Role.CLIENT?and(eventScope,eq(calendarEvents.status,"approved"),gte(calendarEvents.date,start),lte(calendarEvents.date,end)):and(eventScope,gte(calendarEvents.date,start),lte(calendarEvents.date,end));
 const [events,approvedTasks]=await Promise.all([
  db.select({id:calendarEvents.id,title:calendarEvents.title,date:calendarEvents.date,platform:calendarEvents.platform,caption:calendarEvents.caption,status:calendarEvents.status,clientId:calendarEvents.clientId}).from(calendarEvents).where(eventFilter).orderBy(calendarEvents.date),
  role===Role.CLIENT?Promise.resolve([]):db.select({id:creativeTasks.id,title:creativeTasks.title,clientId:creativeTasks.clientId}).from(creativeTasks).where(and(taskScope,inArray(creativeTasks.status,["APPROVED","COMPLETED"]),eq(creativeTasks.isPosted,false))).limit(30)
 ]);
 const clientIds=[...new Set([...events.map(e=>e.clientId),...approvedTasks.map(t=>t.clientId)])];
 const clientRows=clientIds.length?await db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(and(activeClientBase,inArray(clients.id,clientIds))):[];
 const clientMap=Object.fromEntries(clientRows.map(c=>[c.id,c.companyName])),eventsWithClients=events.map(e=>({...e,client:{companyName:clientMap[e.clientId]??""}})),tasksWithClients=approvedTasks.map(t=>({...t,client:{companyName:clientMap[t.clientId]??""}}));
 const canManage=[Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.MEDIA_BUYER].includes(role);
 return <div style={{display:"grid",gap:12}}>{role!==Role.CREATOR&&visibleClients.length>1&&<form method="get" className="card" style={{padding:12,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><label style={{fontSize:11,fontWeight:800}}>CLIENT</label><select name="clientId" defaultValue={selectedClientId} className="form-select" style={{width:"min(320px,100%)"}}><option value="">All Clients</option>{visibleClients.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}</select><button className="btn btn-secondary btn-sm">Apply</button>{selectedClientId&&<a className="btn btn-ghost btn-sm" href="/dashboard/calendar">Clear</a>}</form>}<CalendarClient events={eventsWithClients} clients={canManage?visibleClients:[]} approvedTasks={canManage?tasksWithClients:[]} canManage={canManage}/></div>;
}