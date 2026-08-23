export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, users } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { Role } from "@/lib/types";
import { createTask } from "@/lib/actions/create-task";
import Link from "next/link";
import { TASK_TEMPLATES } from "@/lib/task-templates";

export default async function NewTaskPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER].includes(role)) redirect("/dashboard/creative");

  const userId = String((session.user as any).id);
  const clientScope = role === Role.ACCOUNT_MANAGER
    ? and(eq(clients.workspaceId, "default"), eq(clients.isActive, true), eq(clients.accountManagerId, userId))
    : and(eq(clients.workspaceId, "default"), eq(clients.isActive, true));

  const [allClients, creators] = await Promise.all([
    db.select({ id: clients.id, companyName: clients.companyName })
      .from(clients)
      .where(clientScope)
      .orderBy(clients.companyName),
    db.select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.role, "CREATOR"), eq(users.isActive, true)))
      .orderBy(users.name),
  ]);

  const types = ["REEL", "GRAPHIC", "CAROUSEL", "MOTION_GRAPHIC", "VIDEO_EDIT", "PHOTO_SESSION", "STORY", "UGC"];
  const typeLabels: Record<string, string> = {
    REEL: "🎬 Reel",
    GRAPHIC: "🎨 Graphic",
    CAROUSEL: "📊 Carousel",
    MOTION_GRAPHIC: "✨ Motion Graphic",
    VIDEO_EDIT: "🎥 Video Edit",
    PHOTO_SESSION: "📸 Photo Session",
    STORY: "📱 Story",
    UGC: "👤 UGC",
  };

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/creative" className="text-[#6B8FAF] text-xl" aria-label="Back to creative tasks">←</Link>
        <div>
          <h1 className="page-title">🎨 New Creative Task</h1>
          <p className="text-sm text-[#6B8FAF] mt-1">Brief a creator with full details</p>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider mb-3">⚡ Quick Templates — click to auto-fill</h2>
        <div className="flex flex-wrap gap-2">
          {TASK_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              data-template={JSON.stringify(template)}
              className="template-btn text-xs px-3 py-2 rounded-xl border border-white/10 text-[#6B8FAF] hover:border-[#244D87] hover:text-[#00B4D8] hover:bg-[#244D87]/10 transition-all cursor-pointer"
            >
              {template.name}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#3D5577] mt-2">Click any template to auto-fill the form below, then customize as needed.</p>
      </div>

      {allClients.length === 0 && (
        <div className="card-vivit" role="status">
          <p className="font-semibold text-[#244D87]">No clients are available for task creation.</p>
          <p className="text-sm text-[#6B8FAF] mt-1">Assign an active client to this account manager first, then create the task.</p>
        </div>
      )}

      <form action={createTask} style={{ display: "flex", flexDirection: "column", gap: "20px" }} id="taskForm">
        <div className="card-vivit space-y-4">
          <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider">Task Details</h2>
          <div>
            <label htmlFor="f_title" className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Task Title *</label>
            <input name="title" id="f_title" required minLength={2} placeholder="e.g. Summer Campaign Reel — West Court" className="form-input" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="f_client" className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Client *</label>
              <select name="clientId" id="f_client" required className="form-input" disabled={allClients.length === 0}>
                <option value="">Select client…</option>
                {allClients.map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f_type" className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Creative Type *</label>
              <select name="type" id="f_type" required className="form-input">
                <option value="">Select type…</option>
                {types.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="f_assignee" className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Assign To</label>
              <select name="assignedToId" id="f_assignee" className="form-input">
                <option value="">Unassigned</option>
                {creators.map((creator) => <option key={creator.id} value={creator.id}>{creator.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f_priority" className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Priority *</label>
              <select name="priority" id="f_priority" required defaultValue="MEDIUM" className="form-input">
                <option value="URGENT">🔴 Urgent</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">⚪ Low</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="f_deadline" className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Deadline *</label>
            <input name="deadline" id="f_deadline" type="date" required min={new Date().toISOString().slice(0, 10)} className="form-input" />
          </div>
        </div>

        <div className="card-vivit space-y-4">
          <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider">Creative Brief</h2>
          <div>
            <label htmlFor="f_brief" className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Brief *</label>
            <textarea name="brief" id="f_brief" required minLength={5} rows={6} placeholder="Describe the goal, key messages, target audience, platforms, deliverables…" className="vivit-input resize-none" />
          </div>
          <div>
            <label htmlFor="f_tov" className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Tone of Voice</label>
            <textarea name="tov" id="f_tov" rows={2} placeholder="e.g. Professional, energetic, luxury, playful…" className="vivit-input resize-none" />
          </div>
          <div>
            <label htmlFor="f_caption" className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Caption / Copy</label>
            <textarea name="caption" id="f_caption" rows={3} placeholder="Social media caption…" className="vivit-input resize-none" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard/creative" className="flex-1 py-3 rounded-xl text-center text-sm font-semibold border border-white/10 text-[#6B8FAF] hover:bg-white/5 transition-colors" style={{ textDecoration: "none" }}>Cancel</Link>
          <button type="submit" disabled={allClients.length === 0} className="btn-grad flex-1 justify-center py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">Create Task →</button>
        </div>
      </form>

      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelectorAll('.template-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const t = JSON.parse(this.dataset.template);
            document.getElementById('f_title').value = t.name.replace(/^[^\\s]+ /, '');
            document.getElementById('f_brief').value = t.brief;
            document.getElementById('f_tov').value = t.tov;
            document.getElementById('f_priority').value = t.priority;
            document.getElementById('f_type').value = t.type;
            const d = new Date(); d.setDate(d.getDate() + t.daysToDeadline);
            document.getElementById('f_deadline').value = d.toISOString().split('T')[0];
            document.querySelectorAll('.template-btn').forEach(b => { b.style.borderColor = ''; b.style.color = ''; });
            this.style.borderColor = '#244D87';
            this.style.color = '#00B4D8';
            document.getElementById('taskForm').scrollIntoView({behavior:'smooth'});
          });
        });
      ` }} />
    </div>
  );
}
