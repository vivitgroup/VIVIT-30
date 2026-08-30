"use server";
// ═══════════════════════════════════════════════════════════════
// Vivit ERP — All Server Actions (single file for GitHub limit)
// ═══════════════════════════════════════════════════════════════
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";
import { db, clients, contacts, auditLogs, notifications, calendarEvents,
  creativeTasks, users, fileDocuments } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// ── Input Validation Helpers ─────────────────────────────────
function sanitize(str: string | null | undefined, maxLen = 500): string {
  if (!str) return "";
  return str.trim().slice(0, maxLen)
    .replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/javascript:/gi, "").replace(/on\w+=/gi, "");
}
function validateUrl(url: string): boolean {
  try { const u = new URL(url); return ["http:","https:"].includes(u.protocol); } catch { return false; }
}
type AuthSession=Session|null;
type AuthenticatedSession=Session&{user:NonNullable<Session["user"]>};
type CreativeTaskInsert=typeof creativeTasks.$inferInsert;
type TaskType=CreativeTaskInsert["type"];
type TaskPriority=CreativeTaskInsert["priority"];
type TaskStatus=CreativeTaskInsert["status"];
const TASK_TYPES:readonly TaskType[]=["REEL","GRAPHIC","CAROUSEL","MOTION_GRAPHIC","VIDEO_EDIT","PHOTO_SESSION","STORY","UGC"];
const TASK_PRIORITIES:readonly TaskPriority[]=["URGENT","HIGH","MEDIUM","LOW"];
const TASK_STATUSES:readonly TaskStatus[]=["PENDING","IN_PROGRESS","REVIEW","APPROVED","REJECTED","REVISION","COMPLETED"];
function isTaskType(value:string):value is TaskType{return (TASK_TYPES as readonly string[]).includes(value);}
function isTaskPriority(value:string):value is TaskPriority{return (TASK_PRIORITIES as readonly string[]).includes(value);}
function isTaskStatus(value:string):value is TaskStatus{return (TASK_STATUSES as readonly string[]).includes(value);}
function roleOf(session:AuthSession):string { return String(session?.user?.role||""); }
function requireRole(session:AuthSession, allowed:string[]):asserts session is AuthenticatedSession {
  if (!session?.user) throw new Error("Unauthorized");
  if (!allowed.includes(roleOf(session))) throw new Error("Forbidden");
}
async function requireClientAccess(session:AuthSession, clientId:string, write=false) {
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
  const requestedAm=creatorRole==="ACCOUNT_MANAGER"?session!.user!.id!:String(formData.get("accountManagerId")||"")||null;
  const requestedMb=String(formData.get("mediaBuyerId")||"")||null;
  if(requestedAm){const [am]=await db.select({id:users.id}).from(users).where(and(eq(users.id,requestedAm),eq(users.role,"ACCOUNT_MANAGER"),eq(users.isActive,true))).limit(1);if(!am)throw new Error("Invalid account manager");}
  if(requestedMb){const [mb]=await db.select({id:users.id}).from(users).where(and(eq(users.id,requestedMb),eq(users.role,"MEDIA_BUYER"),eq(users.isActive,true))).limit(1);if(!mb)throw new Error("Invalid media buyer");}

  const [client] = await db.insert(clients).values({
    companyName:      formData.get("companyName") as string,
    industry:         formData.get("industry") as string || null,
    website:          formData.get("website") as string || null,
    monthlyRetainer:  parseFloat(formData.get("monthlyRetainer") as string) || 0,
    mediaBudget:      parseFloat(formData.get("mediaBudget") as string) || 0,
    contractValue:    parseFloat(formData.get("contractValue") as string) || 0,
    accountManagerId: requestedAm,
    mediaBuyerId:     requestedMb,
    metaAdsLink:      formData.get("metaAdsLink") as string || null,
    tiktokAdsLink:    formData.get("tiktokAdsLink") as string || null,
    snapchatAdsLink:  formData.get("snapchatAdsLink") as string || null,
    googleAdsLink:    formData.get("googleAdsLink") as string || null,
    internalNotes:    formData.get("internalNotes") as string || null,
    contractStart:    formData.get("contractStart") ? new Date(formData.get("contractStart") as string) : null,
    contractEnd:      formData.get("contractEnd")   ? new Date(formData.get("contractEnd")   as string) : null,
  }).returning();

  const contactName = formData.get("contactName") as string;
  if (contactName) {
    await db.insert(contacts).values({
      clientId: client.id, name: contactName, isPrimary: true,
      email:    formData.get("contactEmail")   as string || null,
      phone:    formData.get("contactPhone")   as string || null,
      whatsapp: formData.get("contactWhatsapp")as string || null,
      title:    formData.get("contactTitle")   as string || null,
    });
  }

  await db.insert(auditLogs).values({
    userId: session.user.id!, action: "client_created",
    entity: "Client", entityId: client.id,
    newValues: JSON.stringify({ companyName: client.companyName }),
  });

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${client.id}`);
}

export async function updateClient(clientId: string, formData: FormData) {
  const session = await auth();
  await requireClientAccess(session,clientId,true);
  const updateRole=roleOf(session);
  const [existingClient]=await db.select({accountManagerId:clients.accountManagerId,mediaBuyerId:clients.mediaBuyerId}).from(clients).where(eq(clients.id,clientId)).limit(1);
  if(!existingClient)throw new Error("Client not found");
  let nextAm=existingClient.accountManagerId,nextMb=existingClient.mediaBuyerId;
  if(updateRole==="SUPER_ADMIN"){
    nextAm=String(formData.get("accountManagerId")||"")||null;nextMb=String(formData.get("mediaBuyerId")||"")||null;
    if(nextAm){const [am]=await db.select({id:users.id}).from(users).where(and(eq(users.id,nextAm),eq(users.role,"ACCOUNT_MANAGER"),eq(users.isActive,true))).limit(1);if(!am)throw new Error("Invalid account manager");}
    if(nextMb){const [mb]=await db.select({id:users.id}).from(users).where(and(eq(users.id,nextMb),eq(users.role,"MEDIA_BUYER"),eq(users.isActive,true))).limit(1);if(!mb)throw new Error("Invalid media buyer");}
  }

  await db.update(clients).set({
    companyName:      formData.get("companyName") as string,
    industry:         formData.get("industry") as string || null,
    website:          formData.get("website")  as string || null,
    monthlyRetainer:  parseFloat(formData.get("monthlyRetainer") as string) || 0,
    mediaBudget:      parseFloat(formData.get("mediaBudget")     as string) || 0,
    contractValue:    parseFloat(formData.get("contractValue")   as string) || 0,
    accountManagerId: nextAm,
    mediaBuyerId:     nextMb,
    metaAdsLink:      formData.get("metaAdsLink")      as string || null,
    tiktokAdsLink:    formData.get("tiktokAdsLink")    as string || null,
    snapchatAdsLink:  formData.get("snapchatAdsLink")  as string || null,
    googleAdsLink:    formData.get("googleAdsLink")    as string || null,
    internalNotes:    formData.get("internalNotes")    as string || null,
    updatedAt: new Date(),
  }).where(eq(clients.id, clientId));

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
  const clientId=sanitize(formData.get("clientId") as string,100);
  const title=sanitize(formData.get("title") as string,160);
  const dateValue=String(formData.get("date")||"");
  const assetFileId=sanitize(formData.get("assetFileId") as string,100);
  if(!clientId||!title||!dateValue||!assetFileId) throw new Error("Client, title, date and an image or video are required.");
  const eventDate=new Date(dateValue);
  if(Number.isNaN(eventDate.getTime())) throw new Error("Invalid schedule date.");
  await requireClientAccess(session,clientId,true);
  const [asset]=await db.select({id:fileDocuments.id,mimeType:fileDocuments.mimeType})
    .from(fileDocuments)
    .where(and(eq(fileDocuments.id,assetFileId),eq(fileDocuments.clientId,clientId)))
    .limit(1);
  if(!asset||!String(asset.mimeType||"").match(/^(image|video)\//)) {
    throw new Error("The selected image or video is unavailable for this client.");
  }
  await db.insert(calendarEvents).values({
    clientId,
    title,
    date:     eventDate,
    platform: sanitize(formData.get("platform") as string,40) || null,
    caption:  sanitize(formData.get("caption") as string,4000) || null,
    taskId:   sanitize(formData.get("taskId") as string,100) || null,
    hashtags: `asset:${assetFileId}`,
    status:   "scheduled",
  });
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

  const deadlineDate=new Date(deadline);
  if(!title||!clientId||!brief||!isTaskType(type)||!isTaskPriority(priority)||!deadline||Number.isNaN(deadlineDate.getTime()))throw new Error("Invalid task data");
  if(assignedToId){const [creator]=await db.select({id:users.id}).from(users).where(and(eq(users.id,assignedToId),eq(users.role,"CREATOR"),eq(users.isActive,true))).limit(1);if(!creator)throw new Error("Invalid creator assignment");}

  const [task] = await db.insert(creativeTasks).values({
    title, clientId, type, brief, tov: tov || null,
    priority, status: "PENDING",
    assignedToId, deadline: deadlineDate, caption,
    createdById: session.user.id!,
  }).returning();

  if (assignedToId) {
    await db.insert(notifications).values({
      userId: assignedToId, type: "TASK_ASSIGNED",
      title: `New task assigned: ${title}`,
      message: `Deadline: ${new Date(deadline).toLocaleDateString()}`,
      link: `/dashboard/creative/${task.id}`,
    });
  }

  await db.insert(auditLogs).values({
    userId: session.user.id!, action: "task_created",
    entity: "CreativeTask", entityId: task.id,
    newValues: JSON.stringify({ title, clientId, type, priority }),
  });

  revalidatePath("/dashboard/creative");
  redirect(`/dashboard/creative/${task.id}`);
}

export async function updateTaskStatus(taskId: string, status: string, revisionNotes?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  if(!isTaskStatus(status))throw new Error("Invalid task status");
  const taskBefore=await taskForAccess(taskId);
  const role=roleOf(session),uid=session.user.id!;
  const creatorTransitions:Record<string,string[]>={PENDING:["IN_PROGRESS"],IN_PROGRESS:["REVIEW"],REVISION:["IN_PROGRESS"]};
  // Account managers can step in for an assigned creator when delivery is urgent,
  // while still respecting the same ordered workflow.
  const managerTransitions:Record<string,string[]>={
    PENDING:["IN_PROGRESS"],
    IN_PROGRESS:["REVIEW"],
    REVISION:["IN_PROGRESS"],
    REVIEW:["APPROVED","REVISION","REJECTED"],
    APPROVED:["COMPLETED"],
  };
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
      status,
      completedAt: ["APPROVED","COMPLETED"].includes(status) ? new Date() : undefined,
      revisionCount: status === "REVISION" ? (currentTask?.revisionCount ?? 0) + 1 : undefined,
      revisionNotes: status === "REVISION" ? (revisionNotes ?? null) : undefined,
      updatedAt: new Date(),
    })
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
    });
  }

  await db.insert(auditLogs).values({
    userId: session.user.id!, action: `task_${status.toLowerCase()}`,
    entity: "CreativeTask", entityId: taskId,
    newValues: JSON.stringify({ status }),
  });

  revalidatePath(`/dashboard/creative/${taskId}`);
  revalidatePath("/dashboard/creative");
}

export async function submitTaskFile(taskId: string, fileName: string, fileUrl: string, notes: string) {
  const session = await auth();
  requireRole(session,["CREATOR","SUPER_ADMIN","ACCOUNT_MANAGER"]);
  const taskBefore=await taskForAccess(taskId);
  const role=String(session!.user.role);
  const isManager=["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role);
  const allowedStatuses=role==="SUPER_ADMIN"
    ? ["PENDING","IN_PROGRESS","REVIEW","REVISION","APPROVED","COMPLETED"]
    : role==="ACCOUNT_MANAGER"
      ? ["PENDING","IN_PROGRESS","REVIEW","REVISION"]
      : ["IN_PROGRESS","REVISION"];
  if((!isManager&&taskBefore.assignedToId!==session!.user!.id)||!allowedStatuses.includes(taskBefore.status))throw new Error("Forbidden");
  if(isManager)await requireClientAccess(session,taskBefore.clientId,true);
  if(!validateUrl(String(fileUrl||"")))throw new Error("A valid uploaded file URL is required");

  const [task] = await db.update(creativeTasks)
    .set({ status: "REVIEW", fileUrl: fileUrl || null, updatedAt: new Date() })
    .where(eq(creativeTasks.id, taskId))
    .returning();

  if (task) {
    await db.insert(notifications).values({
      userId: task.createdById, type: "APPROVAL_REQUESTED",
      title: `📤 "${task.title}" submitted for review`,
      message: `${session.user.name} submitted. File: ${fileName}. ${notes}`,
      link: `/dashboard/creative/${taskId}`,
    });

    const [client] = await db.select({ userId: clients.userId }).from(clients).where(eq(clients.id, task.clientId));
    if (client?.userId) {
      await db.insert(notifications).values({
        userId: client.userId, type: "APPROVAL_REQUESTED",
        title: `🎨 New creative ready for review`,
        message: `${task.title} is ready. Please review and approve.`,
        link: `/dashboard/portal`,
      });
    }
  }

  revalidatePath(`/dashboard/creative/${taskId}`);
}

export async function updateTaskCaption(taskId: string, caption: string) {
  const session = await auth();
  if(!session?.user)throw new Error("Unauthorized");
  const task=await taskForAccess(taskId);
  const role=roleOf(session);
  if(role==="CREATOR"){
    if(task.assignedToId!==session.user.id||!["PENDING","IN_PROGRESS","REVIEW","REVISION"].includes(task.status))throw new Error("This caption is locked.");
  } else {
    await requireClientAccess(session,task.clientId,true);
    if(role!=="SUPER_ADMIN"&&!["PENDING","IN_PROGRESS","REVIEW","REVISION"].includes(task.status))throw new Error("Approved or completed work is locked.");
  }
  await db.update(creativeTasks).set({ caption, updatedAt: new Date() }).where(eq(creativeTasks.id, taskId));
  revalidatePath(`/dashboard/creative/${taskId}`);
}

export async function markTaskPosted(taskId: string) {
  const session = await auth();
  const task=await taskForAccess(taskId);
  await requireClientAccess(session,task.clientId,true);
  if(task.status!=="APPROVED")throw new Error("Only approved tasks can be marked posted");
  await db.update(creativeTasks)
    .set({ isPosted: true, postedAt: new Date(), status: "COMPLETED", updatedAt: new Date() })
    .where(eq(creativeTasks.id, taskId));
  revalidatePath(`/dashboard/creative/${taskId}`);
  revalidatePath("/dashboard/creative");
}
