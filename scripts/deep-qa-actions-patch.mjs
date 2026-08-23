import fs from "node:fs";

const file = "lib/actions/index.ts";
let source = fs.readFileSync(file, "utf8");
const start = source.indexOf("export async function submitTaskFile(");
const end = source.indexOf("export async function updateTaskCaption(", start);
if (start < 0 || end < 0) throw new Error("submitTaskFile boundaries not found");

const replacement = `export async function submitTaskFile(taskId: string, fileName: string, fileUrl: string, notes: string) {
  const session = await auth();
  requireRole(session,["CREATOR","SUPER_ADMIN","ACCOUNT_MANAGER"]);
  const taskBefore=await taskForAccess(taskId);
  const role=String((session!.user as any).role);
  const isManager=["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role);
  if(role==="ACCOUNT_MANAGER") await requireClientAccess(session,taskBefore.clientId,true);

  const safeFileUrl=sanitize(fileUrl,2000);
  const safeFileName=sanitize(fileName,180)||"file";
  const safeNotes=sanitize(notes,1000);
  if(!safeFileUrl||!validateUrl(safeFileUrl)) throw new Error("A valid http or https file URL is required");

  const allowedStatuses=role==="SUPER_ADMIN"
    ? ["PENDING","IN_PROGRESS","REVIEW","REVISION","APPROVED","COMPLETED"]
    : role==="ACCOUNT_MANAGER"
      ? ["PENDING","IN_PROGRESS","REVIEW","REVISION"]
      : ["IN_PROGRESS","REVISION"];
  if((!isManager&&taskBefore.assignedToId!==session!.user!.id)||!allowedStatuses.includes(taskBefore.status))throw new Error("Forbidden");

  const [task] = await db.update(creativeTasks)
    .set({ status: "REVIEW", fileUrl: safeFileUrl, updatedAt: new Date() } as any)
    .where(eq(creativeTasks.id, taskId))
    .returning();

  if (task) {
    await db.insert(notifications).values({
      userId: task.createdById, type: "APPROVAL_REQUESTED",
      title: \`📤 "\${task.title}" submitted for review\`,
      message: \`\${session.user.name} submitted. File: \${safeFileName}. \${safeNotes}\`,
      link: \`/dashboard/creative/\${taskId}\`,
    } as any);

    const [client] = await db.select({ userId: clients.userId }).from(clients).where(eq(clients.id, task.clientId));
    if (client?.userId) {
      await db.insert(notifications).values({
        userId: client.userId, type: "APPROVAL_REQUESTED",
        title: "🎨 New creative ready for review",
        message: \`\${task.title} is ready. Please review and approve.\`,
        link: "/dashboard/portal",
      } as any);
    }
  }

  await db.insert(auditLogs).values({
    userId: session!.user!.id!, action: "task_file_submitted",
    entity: "CreativeTask", entityId: taskId,
    newValues: JSON.stringify({ fileUrl: safeFileUrl }),
  } as any);
  revalidatePath(\`/dashboard/creative/\${taskId}\`);
}

`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source);
fs.unlinkSync("scripts/deep-qa-actions-patch.mjs");
fs.unlinkSync(".github/workflows/deep-qa-actions-patch.yml");
