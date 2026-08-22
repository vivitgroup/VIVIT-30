// @ts-nocheck -- Drizzle's generated action shapes are narrower than the live schema.
"use server";
// ═══════════════════════════════════════════════════════════════
// Vivit ERP — All Server Actions (single file for GitHub limit)
// ═══════════════════════════════════════════════════════════════
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, clients, contacts, auditLogs, notifications, calendarEvents,
  creativeTasks, users, webhooks } from "@/lib/db";
import { eq, and, inArray, notInArray, desc } from "drizzle-orm";

// ── Input Validation Helpers ─────────────────────────────────
function sanitize(str: string | null | undefined, maxLen = 500): string {
  if (!str) return "";
  return str.trim().slice(0, maxLen)
    .replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/javascript:/gi, "").replace(/on\w+=/gi, "");
}
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
function validateUrl(url: string): boolean {
  try { const u = new URL(url); return ["http:","https:"].includes(u.protocol); } catch { return false; }
}
function requireFields(data: Record<string, any>, fields: string[]): string | null {
  for (const f of fields) {
    if (!data[f] || String(data[f]).trim() === "") return `${f} is required`;
  }
  return null;
}
function roleOf(session:any):string { return String((session?.user as any)?.role||""); }
function requireRole(session:any, allowed:string[]) {
  if (!session?.user) throw new Error("Unauthorized");
  if (!allowed.includes(roleOf(session))) throw new Error("Forbidden");
}
async function requireClientAccess(session:any, clientId:string, write=false) {
  requireRole(session, write?["SUPER_ADMIN","ACCOUNT_MANAGER"]:["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"]);
  if (roleOf(session)==="SUPER_ADMIN") return;
  const [row]=await db.select({accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(eq(clients.id,clientId)).limit(1);
  const uid=session.user.id;
  if (!row || (roleOf(session)==="ACCOUNT_MANAGER"?row.accountManagerId!==uid:row.mediaBuyerId!==uid)) throw new Error("Client access denied");
}
async function taskForAccess(taskId:string){
  const [task]=await db.select().from(creativeTasks).where(eq(creativeTasks.id,taskId)).limit(1);
  if(!task) throw new Error("Task not found");
  return task;
}

// ── CLIENT ACTIONS ────────────────────────────────────────────

export async function createClient(formData: FormData) {
  const session = await auth();
  requireRole(session,["SUPER_ADMIN","ACCOUNT_MANAGER"]);
  const creatorRole=roleOf(session);

  const [client] = await db.insert(clients).values({
    companyName:      formData.get("companyName") as string,
    industry:         formData.get("industry") as string || null,
    website:          formData.get("website") as string || null,
    monthlyRetainer:  parseFloat(formData.get("monthlyRetainer") as string) || 0,
    mediaBudget:      parseFloat(formData.get("mediaBudget") as string) || 0,
    contractValue:    parseFloat(formData.get("contractValue") as string) || 0,
    accountManagerId: creatorRole==="ACCOUNT_MANAGER" ? session!.user!.id! : (formData.get("accountManagerId") as string || null),
    mediaBuyerId:     formData.get("mediaBuyerId") as string || null,
    metaAdsLink:      formData.get("metaAdsLink") as string || null,
    tiktokAdsLink:    formData.get("tiktokAdsLink") as string || null,
    snapchatAdsLink:  formData.get("snapchatAdsLink") as string || null,
    googleAdsLink:    formData.get("googleAdsLink") as string || null,
    internalNotes:    formData.get("internalNotes") as string || null,
    contractStart:    formData.get("contractStart") ? new Date(formData.get("contractStart") as string) : null,
    contractEnd:      formData.get("contractEnd")   ? new Date(formData.get("contractEnd")   as string) : null,
  } as any).returning();

  const contactName = formData.get("contactName") as string;
  if (contactName) {
    await db.insert(contacts).values({
      clientId: client.id, name: contactName, isPrimary: true,
      email:    formData.get("contactEmail")   as string || null,
      phone:    formData.get("contactPhone")   as string || null,
      whatsapp: formData.get("contactWhatsapp")as string || null,
      title:    formData.get("contactTitle")   as string || null,
    } as any);
  }

  await db.insert(auditLogs).values({
    userId: session.user.id!, action: "client_created",
    entity: "Client", entityId: client.id,
    newValues: JSON.stringify({ companyName: client.companyName }),
  } as any);

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${client.id}`);
}

export async function updateClient(clientId: string, formData: FormData) {
  const session = await auth();
  await requireClientAccess(session,clientId,true);

  await db.update(clients).set({
    companyName:      formData.get("companyName") as string,
    industry:         formData.get("industry") as string || null,
    website:          formData.get("website")  as string || null,
    monthlyRetainer:  parseFloat(formData.get("monthlyRetainer") as string) || 0,
    mediaBudget:      parseFloat(formData.get("mediaBudget")     as string) || 0,
    contractValue:    parseFloat(formData.get("contractValue")   as string) || 0,
    accountManagerId: formData.get("accountManagerId") as string || null,
    mediaBuyerId:     formData.get("mediaBuyerId")     as string || null,
    metaAdsLink:      formData.get("metaAdsLink")      as string || null,
    tiktokAdsLink:    formData.get("tiktokAdsLink")    as string || null,
    snapchatAdsLink:  formData.get("snapchatAdsLink")  as string || null,
    googleAdsLink:    formData.get("googleAdsLink")    as string || null,
    internalNotes:    formData.get("internalNotes")    as string || null,
    updatedAt: new Date(),
  } as any).where(eq(clients.id, clientId));

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${clientId}`);
}

// ── NOTIFICATION & CALENDAR ACTIONS ─────────────────────────

export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id),eq(notifications.userId,session.user.id!)));
  revalidatePath("/dashboard/notifications");
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) return;
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, session.user.id!), eq(notifications.isRead, false)));
  revalidatePath("/dashboard/notifications");
}

export async function deleteNotification(id: string) {
  const session = await auth();
  if (!session?.user) return;
  await db.delete(notifications).where(and(eq(notifications.id, id),eq(notifications.userId,session.user.id!)));
  revalidatePath("/dashboard/notifications");
}

export async function createCalendarEvent(formData: FormData) {
  const session = await auth();
  const clientId=formData.get("clientId") as string;
  await requireClientAccess(session,clientId,true);
  await db.insert(calendarEvents).values({
    clientId,
    title:    formData.get("title")    as string,
    date:     new Date(formData.get("date") as string),
    platform: formData.get("platform") as string || null,
    caption:  formData.get("caption")  as string || null,
    taskId:   formData.get("taskId")   as string || null,
    hashtags: `asset:${String(formData.get("assetFileId") || "")}`,
    status:   "scheduled",
  } as any);
  revalidatePath("/dashboard/calendar");
}

export async function markEventPosted(eventId: string) {
  const session = await auth();
  requireRole(session,["SUPER_ADMIN","ACCOUNT_MANAGER"]);
  const [event]=await db.select({clientId:calendarEvents.clientId}).from(calendarEvents).where(eq(calendarEvents.id,eventId)).limit(1);
  if(!event) throw new Error("Event not found");
  await requireClientAccess(session,event.clientId,true);
  await db.update(calendarEvents).set({ status: "posted", updatedAt: new Date() }).where(eq(calendarEvents.id, eventId));
  revalidatePath("/dashboard/calendar");
}

// ── TASK ACTIONS ─────────────────────────────────────────────

export async function createTask(formData: FormData) {
  const session = await auth();
  requireRole(session,["SUPER_ADMIN","ACCOUNT_MANAGER"]);

  const title        = formData.get("title") as string;
  const clientId     = formData.get("clientId") as string;
  await requireClientAccess(session,clientId,true);
  const type         = formData.get("type") as string;
  const brief        = formData.get("brief") as string;
  const tov          = formData.get("tov") as string;
  const priority     = formData.get("priority") as string;
  const assignedToId = formData.get("assignedToId") as string || null;
  const deadline     = formData.get("deadline") as string;
  const caption      = formData.get("caption") as string || null;

  if (!title || !clientId || !type || !brief || !deadline) throw new Error("Missing required fields");

  const [task] = await db.insert(creativeTasks).values({
    title, clientId, type: type as any, brief, tov: tov || null,
    priority: priority as any, status: "PENDING",
    assignedToId, deadline: new Date(deadline), caption,
    createdById: session.user.id!,
  } as any).returning();

  if (assignedToId) {
    await db.insert(notifications).values({
      userId: assignedToId, type: "TASK_ASSIGNED",
      title: `New task assigned: ${title}`,
      message: `Deadline: ${new Date(deadline).toLocaleDateString()}`,
      link: `/dashboard/creative/${task.id}`,
    } as any);
  }

  await db.insert(auditLogs).values({
    userId: session.user.id!, action: "task_created",
    entity: "CreativeTask", entityId: task.id,
    newValues: JSON.stringify({ title, clientId, type, priority }),
  } as any);

  revalidatePath("/dashboard/creative");
  redirect(`/dashboard/creative/${task.id}`);
}

export async function updateTaskStatus(taskId: string, status: string, revisionNotes?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const taskBefore=await taskForAccess(taskId);
  const role=roleOf(session),uid=session.user.id!;
  const creatorTransitions:Record<string,string[]>={PENDING:["IN_PROGRESS"],IN_PROGRESS:["REVIEW"],REVISION:["IN_PROGRESS"]};
  const managerTransitions:Record<string,string[]>={REVIEW:["APPROVED","REVISION","REJECTED"],APPROVED:["COMPLETED"]};
  if(role==="CREATOR"){
    if(taskBefore.assignedToId!==uid||!(creatorTransitions[taskBefore.status]||[]).includes(status))throw new Error("Forbidden transition");
  }else if(["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role)){
    await requireClientAccess(session,taskBefore.clientId,true);
    if(!(managerTransitions[taskBefore.status]||[]).includes(status))throw new Error("Forbidden transition");
  }else throw new Error("Forbidden");

  // Get current task to increment revision count
  const [currentTask] = await db.select({ revisionCount: creativeTasks.revisionCount }).from(creativeTasks).where(eq(creativeTasks.id, taskId));

  const [task] = await db.update(creativeTasks)
    .set({
      status: status as any,
      completedAt: ["APPROVED","COMPLETED"].includes(status) ? new Date() : undefined,
      revisionCount: status === "REVISION" ? (currentTask?.revisionCount ?? 0) + 1 : undefined,
      revisionNotes: status === "REVISION" ? (revisionNotes ?? null) : undefined,
      updatedAt: new Date(),
    } as any)
    .where(eq(creativeTasks.id, taskId))
    .returning();

  if (task?.assignedToId && task.assignedToId !== session.user.id) {
    const msgs: Record<string,string> = {
      APPROVED: `✅ "${task.title}" was approved!`,
      REJECTED: `❌ "${task.title}" was rejected.`,
      REVISION: `↩ "${task.title}" needs revision.`,
      IN_PROGRESS: `🎨 Creator started working on "${task.title}"`,
      REVIEW: `👀 "${task.title}" is ready for review`,
    };
    await db.insert(notifications).values({
      userId: task.assignedToId, type: "GENERAL",
      title: msgs[status] ?? `Task updated: ${status}`,
      message: `Status: ${status}`,
      link: `/dashboard/creative/${taskId}`,
    } as any);
  }

  await db.insert(auditLogs).values({
    userId: session.user.id!, action: `task_${status.toLowerCase()}`,
    entity: "CreativeTask", entityId: taskId,
    newValues: JSON.stringify({ status }),
  } as any);

  revalidatePath(`/dashboard/creative/${taskId}`);
  revalidatePath("/dashboard/creative");
}

export async function submitTaskFile(taskId: string, fileName: string, fileUrl: string, notes: string) {
  const session = await auth();
  requireRole(session,["CREATOR","SUPER_ADMIN","ACCOUNT_MANAGER"]);
  const taskBefore=await taskForAccess(taskId);
  const role=String((session!.user as any).role);
  const isManager=["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role);
  const allowedStatuses=isManager?["PENDING","IN_PROGRESS","REVISION","APPROVED","COMPLETED"]:["IN_PROGRESS","REVISION"];
  if((!isManager&&taskBefore.assignedToId!==session!.user!.id)||!allowedStatuses.includes(taskBefore.status))throw new Error("Forbidden");

  const [task] = await db.update(creativeTasks)
    .set({ status: "REVIEW", fileUrl: fileUrl || null, updatedAt: new Date() } as any)
    .where(eq(creativeTasks.id, taskId))
    .returning();

  if (task) {
    await db.insert(notifications).values({
      userId: task.createdById, type: "APPROVAL_REQUESTED",
      title: `📤 "${task.title}" submitted for review`,
      message: `${session.user.name} submitted. File: ${fileName}. ${notes}`,
      link: `/dashboard/creative/${taskId}`,
    } as any);

    const [client] = await db.select({ userId: clients.userId }).from(clients).where(eq(clients.id, task.clientId));
    if (client?.userId) {
      await db.insert(notifications).values({
        userId: client.userId, type: "APPROVAL_REQUESTED",
        title: `🎨 New creative ready for review`,
        message: `${task.title} is ready. Please review and approve.`,
        link: `/dashboard/portal`,
      } as any);
    }
  }

  revalidatePath(`/dashboard/creative/${taskId}`);
}

export async function updateTaskCaption(taskId: string, caption: string) {
  const session = await auth();
  if(!session?.user)throw new Error("Unauthorized");
  const task=await taskForAccess(taskId);
  if(roleOf(session)==="CREATOR"){if(task.assignedToId!==session.user.id)throw new Error("Forbidden");}
  else await requireClientAccess(session,task.clientId,true);
  await db.update(creativeTasks).set({ caption, updatedAt: new Date() } as any).where(eq(creativeTasks.id, taskId));
  revalidatePath(`/dashboard/creative/${taskId}`);
}

export async function markTaskPosted(taskId: string) {
  const session = await auth();
  const task=await taskForAccess(taskId);
  await requireClientAccess(session,task.clientId,true);
  if(task.status!=="APPROVED")throw new Error("Only approved tasks can be marked posted");
  await db.update(creativeTasks)
    .set({ isPosted: true, postedAt: new Date(), status: "COMPLETED", updatedAt: new Date() } as any)
    .where(eq(creativeTasks.id, taskId));
  revalidatePath(`/dashboard/creative/${taskId}`);
  revalidatePath("/dashboard/creative");
}
