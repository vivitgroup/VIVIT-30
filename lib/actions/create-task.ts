"use server";

import { auth } from "@/lib/auth";
import { db, clients, creativeTasks, users, notifications, auditLogs } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const TASK_TYPES = ["REEL", "GRAPHIC", "CAROUSEL", "MOTION_GRAPHIC", "VIDEO_EDIT", "PHOTO_SESSION", "STORY", "UGC"] as const;
const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

const clean = (value: FormDataEntryValue | null, max: number) => String(value ?? "").trim().slice(0, max);

export async function createTask(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const role = String((session.user as any).role ?? "");
  const userId = String((session.user as any).id ?? "");
  if (!["SUPER_ADMIN", "ACCOUNT_MANAGER"].includes(role)) throw new Error("Forbidden");

  const title = clean(formData.get("title"), 180);
  const clientId = clean(formData.get("clientId"), 100);
  const type = clean(formData.get("type"), 40);
  const brief = clean(formData.get("brief"), 6000);
  const tov = clean(formData.get("tov"), 1500);
  const caption = clean(formData.get("caption"), 5000);
  const priority = clean(formData.get("priority"), 20);
  const assignedToId = clean(formData.get("assignedToId"), 100) || null;
  const deadlineValue = clean(formData.get("deadline"), 40);

  if (title.length < 2 || !clientId || brief.length < 5 || !deadlineValue) throw new Error("Complete all required task fields");
  if (!TASK_TYPES.includes(type as any)) throw new Error("Invalid creative type");
  if (!PRIORITIES.includes(priority as any)) throw new Error("Invalid priority");

  const deadline = new Date(`${deadlineValue}T23:59:59`);
  if (Number.isNaN(deadline.getTime())) throw new Error("Invalid deadline");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (deadline < today) throw new Error("Deadline cannot be in the past");

  const [client] = await db.select({ id: clients.id, accountManagerId: clients.accountManagerId })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, "default"), eq(clients.isActive, true)))
    .limit(1);
  if (!client) throw new Error("Client not found");
  if (role === "ACCOUNT_MANAGER" && client.accountManagerId !== userId) throw new Error("Client access denied");

  if (assignedToId) {
    const [creator] = await db.select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.id, assignedToId),
        eq(users.workspaceId, "default"),
        eq(users.role, "CREATOR"),
        eq(users.isActive, true),
      ))
      .limit(1);
    if (!creator) throw new Error("Choose an active creator");
  }

  const [task] = await db.insert(creativeTasks).values({
    workspaceId: "default",
    title,
    clientId,
    type: type as any,
    brief,
    tov: tov || null,
    priority: priority as any,
    status: "PENDING",
    assignedToId,
    deadline,
    caption: caption || null,
    createdById: userId,
  } as any).returning({ id: creativeTasks.id });

  if (assignedToId) {
    await db.insert(notifications).values({
      userId: assignedToId,
      type: "TASK_ASSIGNED",
      title: `New task assigned: ${title}`,
      message: `Deadline: ${deadline.toLocaleDateString("en-GB")}`,
      link: `/dashboard/creative/${task.id}`,
      priority: priority === "URGENT" || priority === "HIGH" ? "high" : "normal",
    } as any);
  }

  await db.insert(auditLogs).values({
    userId,
    action: "task_created",
    entity: "CreativeTask",
    entityId: task.id,
    newValues: JSON.stringify({ clientId, type, priority, assignedToId }),
  } as any);

  revalidatePath("/dashboard/creative");
  redirect(`/dashboard/creative/${task.id}`);
}
