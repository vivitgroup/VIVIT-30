// @ts-nocheck -- Drizzle's generated creative shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db, creativeTasks, clients, users, auditLogs, taskComments , calendarEvents } from "@/lib/db";
import { eq, desc , notInArray , and, gte } from "drizzle-orm";
import { Role } from "@/lib/types";
import { updateTaskStatus, submitTaskFile, updateTaskCaption, markTaskPosted } from "@/lib/actions";

const TYPE_ICON: Record<string,string> = {REEL:"🎬",GRAPHIC:"🎨",CAROUSEL:"📊",MOTION_GRAPHIC:"✨",VIDEO_EDIT:"🎥",PHOTO_SESSION:"📸",STORY:"📱",UGC:"👤"};
const STATUS_COLOR: Record<string,string> = {PENDING:"text-gray-400 bg-gray-500/10",IN_PROGRESS:"text-blue-400 bg-blue-500/10",REVIEW:"text-yellow-400 bg-yellow-500/10",APPROVED:"text-green-400 bg-green-500/10",COMPLETED:"text-cyan-400 bg-cyan-500/10",REJECTED:"text-red-400 bg-red-500/10",REVISION:"text-orange-400 bg-orange-500/10"};
const PRIORITY_COLOR: Record<string,string> = {URGENT:"#ef4444",HIGH:"#f97316",MEDIUM:"#f59e0b",LOW:"#6b7280"};
const STATUS_BTN: Record<string,string> = {APPROVED:"bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20",REVISION:"bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20",REJECTED:"bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20",IN_PROGRESS:"bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20",REVIEW:"bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20",COMPLETED:"bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20"};
const STATUS_LABEL: Record<string,string> = {IN_PROGRESS:"▶ Start Working",REVIEW:"👀 Submit for Review",APPROVED:"✅ Approve",REVISION:"↩ Request Revision",REJECTED:"✗ Reject",COMPLETED:"🏁 Mark Complete"};

async function addComment(taskId: string, fd: FormData) {
  "use server";
  const { auth: getAuth } = await import("@/lib/auth");
  const { db, taskComments } = await import("@/lib/db");
  const session = await getAuth();
  if (!session?.user) throw new Error("Unauthorized");
  const [task]=await db.select().from(creativeTasks).where(eq(creativeTasks.id,taskId)).limit(1);
  if(!task)throw new Error("Task not found");
  const role=(session.user as any).role as Role,userId=session.user.id!;
  const [client]=await db.select({userId:clients.userId,accountManagerId:clients.accountManagerId}).from(clients).where(eq(clients.id,task.clientId)).limit(1);
  const allowed=role===Role.SUPER_ADMIN||(role===Role.ACCOUNT_MANAGER&&client?.accountManagerId===userId)||(role===Role.CREATOR&&task.assignedToId===userId)||(role===Role.CLIENT&&client?.userId===userId);
  if(!allowed)throw new Error("Forbidden");
  const comment=String(fd.get("comment")||"").trim().slice(0,1000);
  if(!comment)throw new Error("Comment is required");
  await db.insert(taskComments).values({
    taskId, userId: session.user.id!,
    comment,
    isInternal: role!==Role.CLIENT && fd.get("isInternal") === "true",
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/dashboard/creative/${taskId}`);
}

export default async function TaskDetailPage({ params }: { params: Promise<{id:string}> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const role = (session.user as any).role as Role;

  const [task] = await db.select().from(creativeTasks).where(eq(creativeTasks.id, id));
  if (!task) notFound();

  const [accessClient]=await db.select({userId:clients.userId,accountManagerId:clients.accountManagerId}).from(clients).where(eq(clients.id,task.clientId)).limit(1);
  const userId=session.user.id!;
  const canOpen = role===Role.SUPER_ADMIN
    || (role===Role.ACCOUNT_MANAGER && accessClient?.accountManagerId===userId)
    || (role===Role.CREATOR && task.assignedToId===userId)
    || (role===Role.CLIENT && accessClient?.userId===userId);
  if(!canOpen) redirect("/dashboard");

  // Past approved briefs for reference + engagement data
  const [pastBriefs, calEvent] = await Promise.all([
    db.select({ id:creativeTasks.id, title:creativeTasks.title, type:creativeTasks.type, brief:creativeTasks.brief, tov:creativeTasks.tov, createdAt:creativeTasks.createdAt })
      .from(creativeTasks).where(and(eq(creativeTasks.clientId, task.clientId), eq(creativeTasks.status,"APPROVED" as any), notInArray(creativeTasks.id,[task.id])))
      .orderBy(desc(creativeTasks.createdAt)).limit(4),
    task.isPosted ? db.select().from(calendarEvents).where(eq(calendarEvents.taskId,task.id)).then(r=>r[0]||null) : Promise.resolve(null),
  ]);

  const [[client], [creator], [createdBy], logs, comments] = await Promise.all([
    db.select({ id: clients.id, companyName: clients.companyName, colorPalette: clients.colorPalette }).from(clients).where(eq(clients.id, task.clientId)),
    task.assignedToId ? db.select({ name: users.name, id: users.id }).from(users).where(eq(users.id, task.assignedToId)) : [null],
    db.select({ name: users.name }).from(users).where(eq(users.id, task.createdById)),
    db.select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt, userId: auditLogs.userId })
      .from(auditLogs).where(eq(auditLogs.entityId, id)).orderBy(desc(auditLogs.createdAt)).limit(10),
    // Task comments
    db.select({ id: taskComments.id, comment: taskComments.comment, isInternal: taskComments.isInternal, createdAt: taskComments.createdAt, userId: taskComments.userId })
      .from(taskComments).where(role===Role.CLIENT?and(eq(taskComments.taskId,id),eq(taskComments.isInternal,false)):eq(taskComments.taskId, id)).orderBy(taskComments.createdAt).limit(20),
  ]);
  const brandColors=(()=>{try{const parsed=JSON.parse(client?.colorPalette||"[]");return Array.isArray(parsed)?parsed.filter((x):x is string=>typeof x==="string"):[]}catch{return []}})();

  // Get commenter names
  const commenterIds = [...new Set(comments.map(c=>c.userId))];
  const commenters = commenterIds.length > 0 ? await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, commenterIds[0])) : [];
  const commenterMap = Object.fromEntries(commenters.map(u=>[u.id,u.name]));

  const isCreator   = task.assignedToId === session.user.id;
  const isManager   = [Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER].includes(role);
  const canApprove  = isManager;

  const statusFlow: Record<string,string[]> = {
    PENDING:     (isCreator||isManager) ? ["IN_PROGRESS"] : [],
    IN_PROGRESS: (isCreator||isManager) ? ["REVIEW"] : [],
    REVIEW:      canApprove ? ["APPROVED","REVISION","REJECTED"] : [],
    REVISION:    (isCreator||isManager) ? ["IN_PROGRESS"] : [],
    APPROVED:    isManager ? ["COMPLETED"] : [],
  };
  const nextStatuses = statusFlow[task.status] ?? [];

  const daysUntilDeadline = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000);
  const isOverdue = daysUntilDeadline < 0 && !["APPROVED","COMPLETED"].includes(task.status);

  return (
    <div className="max-w-4xl space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/creative" className="text-[#6B8FAF]  text-2xl mt-1">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl">{TYPE_ICON[task.type]??"📁"}</span>
            <h1 className="card-title">{task.title}</h1>
            <span className={`badge text-xs ${STATUS_COLOR[task.status]}`}>{task.status.replace("_"," ")}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:PRIORITY_COLOR[task.priority]+"20",color:PRIORITY_COLOR[task.priority]}}>{task.priority}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <p className="text-sm text-[#6B8FAF]">{client?.companyName} · by {createdBy?.name}</p>
            {task.revisionCount > 0 && (
              <span className="badge bg-orange-500/10 text-orange-400 text-[10px]">↩ {task.revisionCount} revision{task.revisionCount>1?"s":""}</span>
            )}
            {isOverdue && <span className="badge bg-red-500/10 text-red-400 text-[10px]">⚠️ OVERDUE</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Brief */}
          <div className="card-vivit space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider">📝 Creative Brief</h2>
              <button data-copy-text={task.brief} className="copy-brief-btn text-[10px] px-2 py-1 rounded-lg border border-white/10 text-[#6B8FAF] hover:text-[#244D87] hover:border-[#244D87]/40 transition-colors">📋 Copy Brief</button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#E8F4FD]">{task.brief}</p>
            {task.tov && (
              <div className="border-t border-white/5 pt-3">
                <p className="text-xs text-[#3D5577] font-semibold uppercase tracking-wider mb-1">Tone of Voice</p>
                <p className="text-sm">{task.tov}</p>
              </div>
            )}
            {task.revisionNotes && (
              <div className="border-t border-orange-500/20 pt-3" style={{background:"rgba(249,115,22,0.04)",borderRadius:"8px",padding:"10px"}}>
                <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-1">⚠️ Latest Revision Notes</p>
                <p className="text-sm text-orange-300">{task.revisionNotes}</p>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="card-vivit space-y-3">
            <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider">Caption / Copy</h2>
            {isManager ? (
              <form action={async(fd:FormData)=>{"use server"; await updateTaskCaption(task.id, fd.get("caption") as string);}}>
                <textarea name="caption" rows={4} defaultValue={task.caption??""} placeholder="Write caption here…" className="vivit-input resize-none w-full mb-3" />
                <button type="submit" className="btn-grad text-xs py-2">Save Caption</button>
              </form>
            ) : (
              <p className="text-sm leading-relaxed text-[#6B8FAF]">{task.caption || "No caption written yet."}</p>
            )}
          </div>

          {/* File Link (if submitted) */}
          {task.fileUrl && (
            <div className="card" style={{border:"1px solid rgba(0,119,182,0.3)"}}>
              <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider mb-3">📎 Submitted File</h2>
              <a href={task.fileUrl} target="_blank" className="flex items-center gap-2 text-sm text-[#00B4D8] hover:underline font-medium">
                🔗 View File / Google Drive Link →
              </a>
            </div>
          )}

          {/* Final delivery can be submitted by the assigned creator or a manager. */}
          {(isCreator || isManager) && ["PENDING","IN_PROGRESS","REVISION",...(isManager?["APPROVED","COMPLETED"]:[])].includes(task.status) && (
            <div className="card-vivit space-y-3">
              <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider">📤 Submit Final File</h2>
              <form action={async(fd:FormData)=>{"use server"; await submitTaskFile(task.id, fd.get("fileName") as string||"file", fd.get("fileUrl") as string||"", fd.get("notes") as string||"");}} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#6B8FAF] uppercase tracking-wider block mb-1.5">File URL / Google Drive Link *</label>
                  <input name="fileUrl" required placeholder="https://drive.google.com/…" className="form-input" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B8FAF] uppercase tracking-wider block mb-1.5">Notes for reviewer</label>
                  <textarea name="notes" rows={2} placeholder="Any notes about the file…" className="vivit-input resize-none" />
                </div>
                <button type="submit" className="btn btn-primary">Submit for Review →</button>
              </form>
            </div>
          )}

          {/* Action Buttons */}
          {nextStatuses.length > 0 && (
            <div className="card-vivit space-y-3">
              <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider">Actions</h2>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.filter(s=>s!=="REVISION").map(s=>(
                  <form key={s} action={async()=>{"use server"; await updateTaskStatus(task.id, s);}}>
                    <button type="submit" className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${STATUS_BTN[s]??""}`}>
                      {STATUS_LABEL[s]??s}
                    </button>
                  </form>
                ))}
              </div>
              {task.status==="REVIEW" && isManager && nextStatuses.includes("REVISION") && (
                <form action={async(fd:FormData)=>{"use server";await updateTaskStatus(task.id,"REVISION",String(fd.get("revisionNotes")||""));}} className="approval-box approval-box--reject">
                  <strong>↩ Request a revision</strong>
                  <p>Explain the exact changes required so the creator can act without another clarification round.</p>
                  <label className="text-xs font-semibold text-[#6B8FAF] uppercase tracking-wider block mb-1.5">Revision notes (if requesting changes)</label>
                  <textarea name="revisionNotes" required minLength={3} rows={3} placeholder="Describe what needs to change…" className="vivit-input resize-none w-full" />
                  <button type="submit" className="btn btn-danger">Send revision request</button>
                </form>
              )}
            </div>
          )}

          {/* Past Briefs Reference */}
          {pastBriefs.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider mb-3">📚 Past Approved Briefs (Reference)</h2>
              <div className="space-y-2">
                {pastBriefs.map(pb=>(
                  <details key={pb.id} className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
                    <summary className="cursor-pointer px-3 py-2 flex items-center gap-2 text-xs font-semibold text-[#6B8FAF]">
                      <span className="text-sm">{TYPE_ICON[pb.type]??""}</span>
                      <span className="flex-1 truncate">{pb.title}</span>
                      <span className="text-[10px] text-[#3D5577]">{new Date(pb.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</span>
                    </summary>
                    <div className="px-3 pb-3">
                      {pb.tov&&<p className="text-[10px] text-[#244D87] mb-1">TOV: {pb.tov}</p>}
                      <p className="text-xs text-[#6B8FAF] leading-relaxed line-clamp-3">{pb.brief}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Engagement after posting */}
          {calEvent && (
            <div className="card" style={{border:"1px solid rgba(16,185,129,0.2)"}}>
              <h2 className="font-semibold text-green-400 text-xs uppercase tracking-wider mb-3">📊 Post Performance</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-xl bg-white/[0.03]">
                  <p className="text-2xl font-black text-green-400">{(calEvent.engagements||0).toLocaleString()}</p>
                  <p className="text-xs text-[#6B8FAF] mt-0.5">Total Engagements</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/[0.03]">
                  <p className="text-2xl font-black text-[#244D87]">{calEvent.platform||"—"}</p>
                  <p className="text-xs text-[#6B8FAF] mt-0.5">Platform</p>
                </div>
              </div>
            </div>
          )}

          {/* Send Approval Link via Email */}
          {task.status==="REVIEW" && isManager && (
            <div className="card-vivit space-y-3">
              <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider">📧 Email Approval Link</h2>
              <p className="text-xs text-[#6B8FAF]">Send a one-click approval link to the client — no login required. Link expires in 48 hours.</p>
              <form action={async()=>{
                "use server";
                await fetch(`${process.env.NEXTAUTH_URL??""}/api/approve-token`,{
                  method:"POST",headers:{"Content-Type":"application/json"},
                  body:JSON.stringify({taskId:task.id})
                });
              }}>
                <button type="submit" className="btn-grad text-sm">📧 Send Approval Email →</button>
              </form>
            </div>
          )}

          {/* Mark Posted */}
          {task.status==="APPROVED" && isManager && (
            <div className="card">
              <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider mb-3">📅 Posting</h2>
              <form action={async()=>{"use server"; await markTaskPosted(task.id);}}>
                <button type="submit" className="btn btn-primary">✅ Mark as Posted</button>
              </form>
            </div>
          )}

          {/* Comments */}
          <div className="card-vivit space-y-4">
            <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider">💬 Comments</h2>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.length===0 && <p className="text-sm text-[#3D5577]">No comments yet.</p>}
              {comments.map(c=>(
                <div key={c.id} className={`flex gap-3 ${c.isInternal?"opacity-70":""}`}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{background:"linear-gradient(135deg,#244D87,#00B4D8)"}}>
                    {(commenterMap[c.userId]??"?").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold">{commenterMap[c.userId]??"User"}</span>
                      {c.isInternal && <span className="badge bg-yellow-500/10 text-yellow-400 text-[9px]">Internal</span>}
                      <span className="text-xs text-[#3D5577]">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-[#6B8FAF]">{c.comment}</p>
                  </div>
                </div>
              ))}
            </div>
            <form action={async(fd:FormData)=>{"use server"; await addComment(id,fd);}} className="flex gap-2">
              <input name="comment" required placeholder="Add a comment…" className="vivit-input flex-1" />
              {isManager && (
                <select name="isInternal" className="form-input" style={{width:"120px"}}>
                  <option value="false">Public</option>
                  <option value="true">Internal</option>
                </select>
              )}
              <button type="submit" className="btn-grad flex-shrink-0">Send</button>
            </form>
          </div>

          {/* Activity Log */}
          <div className="card">
            <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider mb-4">Activity Log</h2>
            <div className="space-y-3">
              {logs.length===0 && <p className="text-sm text-[#3D5577]">No activity yet.</p>}
              {logs.map(log=>(
                <div key={log.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{background:"#244D87"}} />
                  <div>
                    <p className="text-sm">{log.action.replace(/_/g," ")}</p>
                    <p className="text-xs text-[#3D5577]">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <div className="card-vivit space-y-0">
            <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider mb-3">Details</h2>
            {[
              ["Client",   client?.companyName],
              ["Assigned", creator?.name??"Unassigned"],
              ["Type",     task.type.replace(/_/g," ")],
              ["Deadline", new Date(task.deadline).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})],
              ["Revisions",task.revisionCount > 0 ? `${task.revisionCount}x` : "None"],
              ["Posted",   task.isPosted?"✅ Yes":"❌ Not yet"],
            ].map(([l,v])=>(
              <div key={l as string} className="flex justify-between items-start py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-[#3D5577] font-semibold uppercase tracking-wider">{l}</span>
                <span className="text-sm text-right max-w-[60%] break-words">{v}</span>
              </div>
            ))}
          </div>

          {/* Deadline urgency */}
          <div className="card" style={{border:`1px solid ${isOverdue?"rgba(239,68,68,0.3)":daysUntilDeadline<=3?"rgba(249,115,22,0.3)":"rgba(0,119,182,0.15)"}`}}>
            <h2 className="font-semibold text-xs uppercase tracking-wider mb-2" style={{color:isOverdue?"#ef4444":daysUntilDeadline<=3?"#f97316":"#244D87"}}>
              {isOverdue?"🚨 Overdue":daysUntilDeadline<=3?"⚠️ Due Soon":"📅 Deadline"}
            </h2>
            <p className="text-lg font-bold">{isOverdue?`${Math.abs(daysUntilDeadline)} days ago`:daysUntilDeadline===0?"Today":`${daysUntilDeadline} days left`}</p>
            <p className="text-xs text-[#6B8FAF] mt-0.5">{new Date(task.deadline).toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short"})}</p>
          </div>

          {/* Brand Colors */}
          {brandColors.length>0 && (
            <div className="card">
              <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider mb-3">Brand Colors</h2>
              <div className="flex flex-wrap gap-2">
                {brandColors.map((hex:string)=>(
                  <div key={hex} className="group relative w-9 h-9 rounded-lg border border-white/10 cursor-pointer" style={{background:hex}} title={hex}>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] bg-black/80 text-white px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">{hex}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider mb-3">Quick Links</h2>
            <div className="space-y-2">
              <Link href={`/dashboard/clients/${task.clientId}`} className="flex items-center gap-2 text-sm text-[#6B8FAF]  py-1">🏢 View Client</Link>
              <Link href="/dashboard/creative" className="flex items-center gap-2 text-sm text-[#6B8FAF]  py-1">🎨 All Tasks</Link>
              <Link href="/dashboard/calendar" className="flex items-center gap-2 text-sm text-[#6B8FAF]  py-1">📅 Calendar</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
<script dangerouslySetInnerHTML={{__html:`
  document.querySelectorAll('.copy-brief-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const text = this.dataset.copyText;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        this.textContent = '✅ Copied!';
        setTimeout(() => this.textContent = '📋 Copy', 2000);
      });
    });
  });
`}}/>
}
