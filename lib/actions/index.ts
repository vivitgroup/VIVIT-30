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

// ── CLIENT ACTIONS ────────────────────────────────────────────

export async function createClient(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [client] = await db.insert(clients).values({
    companyName:      formData.get("companyName") as string,
    industry:         formData.get("industry") as string || null,
    website:          formData.get("website") as string || null,
    monthlyRetainer:  parseFloat(formData.get("monthlyRetainer") as string) || 0,
    mediaBudget:      parseFloat(formData.get("mediaBudget") as string) || 0,
    contractValue:    parseFloat(formData.get("contractValue") as string) || 0,
    accountManagerId: formData.get("accountManagerId") as string || null,
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
  if (!session?.user) throw new Error("Unauthorized");

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
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
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
  await db.delete(notifications).where(eq(notifications.id, id));
  revalidatePath("/dashboard/notifications");
}

export async function createCalendarEvent(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await db.insert(calendarEvents).values({
    clientId: formData.get("clientId") as string,
    title:    formData.get("title")    as string,
    date:     new Date(formData.get("date") as string),
    platform: formData.get("platform") as string || null,
    caption:  formData.get("caption")  as string || null,
    taskId:   formData.get("taskId")   as string || null,
    status:   "scheduled",
  } as any);
  revalidatePath("/dashboard/calendar");
}

export async function markEventPosted(eventId: string) {
  const session = await auth();
  if (!session?.user) return;
  await db.update(calendarEvents).set({ status: "posted", updatedAt: new Date() }).where(eq(calendarEvents.id, eventId));
  revalidatePath("/dashboard/calendar");
}

// ── TASK ACTIONS ─────────────────────────────────────────────

export async function createTask(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const title        = formData.get("title") as string;
  const clientId     = formData.get("clientId") as string;
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
  if (!session?.user) throw new Error("Unauthorized");

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
  if (!session?.user) throw new Error("Unauthorized");
  await db.update(creativeTasks).set({ caption, updatedAt: new Date() } as any).where(eq(creativeTasks.id, taskId));
  revalidatePath(`/dashboard/creative/${taskId}`);
}

export async function markTaskPosted(taskId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await db.update(creativeTasks)
    .set({ isPosted: true, postedAt: new Date(), status: "COMPLETED", updatedAt: new Date() } as any)
    .where(eq(creativeTasks.id, taskId));
  revalidatePath(`/dashboard/creative/${taskId}`);
  revalidatePath("/dashboard/creative");
}
