import fs from "node:fs";

const file = "app/dashboard/portal/page.tsx";
let source = fs.readFileSync(file, "utf8");

const mediaStart = source.indexOf("async function reviewMediaPlan(");
const portalStart = source.indexOf("async function portalAction(", mediaStart);
const pageStart = source.indexOf("export default async function PortalPage()", portalStart);
if (mediaStart < 0 || portalStart < 0 || pageStart < 0) throw new Error("Portal action boundaries not found");

const reviewMediaPlan = `async function reviewMediaPlan(fd: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "CLIENT") throw new Error("Unauthorized");
  const userId = String((session.user as any).id);
  const [client] = await db.select({ id: clients.id }).from(clients).where(and(
    eq(clients.userId, userId),
    eq(clients.workspaceId, "default"),
    eq(clients.isActive, true),
  )).limit(1);
  if (!client) throw new Error("Forbidden");

  const planId = String(fd.get("planId") || "");
  const decision = String(fd.get("decision") || "");
  const note = String(fd.get("note") || "").trim().slice(0, 500);
  if (!planId || !["APPROVED", "REJECTED"].includes(decision)) throw new Error("Invalid request");
  const [plan] = await db.select().from(mediaPlans).where(and(
    eq(mediaPlans.id, planId),
    eq(mediaPlans.clientId, client.id),
    eq(mediaPlans.status, "PENDING_APPROVAL"),
  )).limit(1);
  if (!plan) throw new Error("This media plan is no longer pending approval");

  await db.update(mediaPlans).set({
    status: decision,
    clientNote: note || null,
    approvedBy: userId,
    approvedAt: decision === "APPROVED" ? new Date() : null,
    updatedAt: new Date(),
  }).where(and(eq(mediaPlans.id, planId), eq(mediaPlans.clientId, client.id), eq(mediaPlans.status, "PENDING_APPROVAL")));

  if (plan.submittedBy) await db.insert(notifications).values({
    userId: plan.submittedBy,
    type: "MEDIA_PLAN_REVIEW",
    title: \`Media plan \${decision.toLowerCase()}\`,
    message: \`The client \${decision.toLowerCase()} \${plan.name}.\${note ? \` Note: \${note}\` : ""}\`,
    link: "/dashboard/media/control-center",
    priority: decision === "APPROVED" ? "normal" : "high",
  });
  await db.insert(auditLogs).values({ userId, action: \`media_plan_\${decision.toLowerCase()}\`, entity: "media_plans", entityId: planId, newValues: JSON.stringify({ note }) });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/portal");
}

`;

const portalAction = `async function portalAction(fd: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "CLIENT") throw new Error("Unauthorized");
  const userId = String((session.user as any).id);
  const [client] = await db.select().from(clients).where(and(
    eq(clients.userId, userId),
    eq(clients.workspaceId, "default"),
    eq(clients.isActive, true),
  )).limit(1);
  if (!client) throw new Error("Forbidden");
  const action = String(fd.get("action") || "");
  const now = new Date();

  if (action === "nps") {
    const score = Number(fd.get("score"));
    const comment = String(fd.get("comment") || "").trim().slice(0, 500);
    if (!Number.isInteger(score) || score < 0 || score > 10) throw new Error("Choose a score from 0 to 10");
    const [existing] = await db.select({ id: clientFeedback.id }).from(clientFeedback).where(and(
      eq(clientFeedback.clientId, client.id),
      eq(clientFeedback.month, now.getMonth() + 1),
      eq(clientFeedback.year, now.getFullYear()),
    )).limit(1);
    if (existing) await db.update(clientFeedback).set({ score, comment: comment || null }).where(eq(clientFeedback.id, existing.id));
    else await db.insert(clientFeedback).values({ clientId: client.id, score, comment: comment || null, month: now.getMonth() + 1, year: now.getFullYear() });
    await db.insert(auditLogs).values({ userId, action: "client_nps_submitted", entity: "clients", entityId: client.id, newValues: JSON.stringify({ score, comment }) });
  } else if (action === "message") {
    const message = String(fd.get("message") || "").trim().slice(0, 1000);
    if (!message) throw new Error("Message is required");
    const recipient = client.accountManagerId;
    if (!recipient) throw new Error("No account manager is assigned yet");
    await db.insert(notifications).values({ userId: recipient, type: "CLIENT_MESSAGE", title: \`Message from \${client.companyName}\`, message, link: "/dashboard/clients", priority: "high" });
    await db.insert(auditLogs).values({ userId, action: "client_message_sent", entity: "clients", entityId: client.id, newValues: JSON.stringify({ message }) });
  } else if (action === "task_review") {
    const taskId = String(fd.get("taskId") || "");
    const decision = String(fd.get("decision") || "");
    const comment = String(fd.get("comment") || "").trim().slice(0, 1000);
    if (!["APPROVED", "REVISION"].includes(decision)) throw new Error("Invalid decision");
    if (decision === "REVISION" && !comment) throw new Error("Please explain what should be changed before requesting a revision.");
    const [task] = await db.select().from(creativeTasks).where(and(
      eq(creativeTasks.id, taskId),
      eq(creativeTasks.clientId, client.id),
      eq(creativeTasks.status, "REVIEW"),
    )).limit(1);
    if (!task) throw new Error("This creative is no longer awaiting client review");
    await db.update(creativeTasks).set({
      status: decision,
      updatedAt: now,
      completedAt: decision === "APPROVED" ? now : task.completedAt,
      revisionCount: decision === "REVISION" ? (task.revisionCount || 0) + 1 : task.revisionCount,
      revisionNotes: decision === "REVISION" ? comment : null,
    }).where(and(eq(creativeTasks.id, taskId), eq(creativeTasks.clientId, client.id), eq(creativeTasks.status, "REVIEW")));
    if (task.assignedToId) await db.insert(notifications).values({
      userId: task.assignedToId,
      type: "CLIENT_REVIEW",
      title: \`Client \${decision.toLowerCase()}: \${task.title}\`,
      message: decision === "APPROVED" ? "The client approved this creative." : \`The client requested changes: \${comment}\`,
      link: \`/dashboard/creative/\${task.id}\`,
      priority: decision === "REVISION" ? "high" : "normal",
    });
    await db.insert(auditLogs).values({ userId, action: \`creative_\${decision.toLowerCase()}\`, entity: "creative_tasks", entityId: task.id, newValues: JSON.stringify({ comment }) });
  } else {
    throw new Error("Invalid action");
  }
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/portal");
}

`;

source = source.slice(0, mediaStart) + reviewMediaPlan + portalAction + source.slice(pageStart);
source = source.replace('db.select().from(clients).where(eq(clients.userId, userId)).limit(1)', 'db.select().from(clients).where(and(eq(clients.userId, userId), eq(clients.workspaceId, "default"), eq(clients.isActive, true))).limit(1)');
source = source.replace('const fmt = (n:number) => n>=1000?`$${(n/1000).toFixed(0)}k`:`$${n.toLocaleString()}`;', 'const fmt = (n:number) => `${Math.round(Number(n)||0).toLocaleString("en-EG")} EGP`;');
source = source.replace('gridTemplateColumns:"repeat(4,minmax(0,1fr))"', 'gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))"');

fs.writeFileSync(file, source);
fs.unlinkSync("scripts/deep-qa-portal-patch.mjs");
fs.unlinkSync(".github/workflows/deep-qa-portal-patch.yml");
