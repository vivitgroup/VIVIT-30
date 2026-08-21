export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Role } from "@/lib/types";
import { createTask } from "@/lib/actions";
import Link from "next/link";
import { TASK_TEMPLATES } from "@/lib/task-templates";


// ── Feature 2: Smart Deadline Calculator ─────────────────────
// Egyptian business days (Sat-Sun off), common holidays
function addBusinessDays(date: Date, days: number): string {
  const EG_HOLIDAYS_2025 = [
    "2025-01-07","2025-04-25","2025-04-28","2025-05-01",
    "2025-06-05","2025-06-30","2025-07-23","2025-10-06",
  ];
  let count = 0, d = new Date(date);
  while (count < days) {
    d.setDate(d.getDate() + 1);
    const dow  = d.getDay();
    const ds   = d.toISOString().slice(0,10);
    if (dow !== 5 && dow !== 6 && !EG_HOLIDAYS_2025.includes(ds)) count++;
  }
  return d.toISOString().slice(0,10);
}

const SMART_DEADLINES: Record<string,number> = {
  REEL:8, VIDEO:10, GRAPHIC:3, CAROUSEL:4, STORY:2,
  COPY:2, STRATEGY:7, UGC:12, MOTION:10,
};

// ── Feature 11: Brief Template Library ───────────────────────
const BRIEF_TEMPLATES: Record<string,{brief:string;tov:string;dimensions:string}> = {
  REEL: {
    brief: "Objective: [Goal — awareness/engagement/conversion]. Scene 1 (0-3s): Hook — [Opening line or visual]. Scene 2 (3-12s): Main message — [Key benefit]. Scene 3 (12-20s): CTA — [Action to take]. Music: [Upbeat/Chill/Trending]. On-screen text: [Brand name + tagline]. Voiceover: [Yes/No].",
    tov: "Energetic · Relatable · Local Egyptian tone · Direct CTA",
    dimensions: "1080×1920 (9:16) · MP4 · 15-60 seconds · <50MB"
  },
  GRAPHIC: {
    brief: "Visual concept: [Main visual idea]. Headline: [Primary text, max 6 words]. Sub-headline: [Secondary message]. Background: [Color/pattern/image]. Brand elements: Logo (position: [corner]), brand colors. CTA text: [Button/text overlay].",
    tov: "Clean · Professional · On-brand colors · Minimal text",
    dimensions: "1080×1080 (1:1) · PNG/JPG · 72dpi minimum · <5MB"
  },
  CAROUSEL: {
    brief: "Slides (4-7 recommended): Slide 1: Hook/Problem statement. Slides 2-5: Solution/Benefits (one per slide). Last slide: CTA + contact. Style: Consistent template across all slides. Swipe prompt: Include on slide 1.",
    tov: "Educational · Value-driven · Step-by-step clarity",
    dimensions: "1080×1080 per slide · consistent design · max 10 slides"
  },
  STORY: {
    brief: "Format: Vertical story. Frame 1 (tap): Attention grabber. Frame 2: Core message in 3-5 words. Frame 3: CTA with link/swipe-up. Sticker: [Poll/Question/Countdown if relevant].",
    tov: "Casual · Fast · FOMO-driven",
    dimensions: "1080×1920 (9:16) · 5-15 seconds · Story-safe zones top/bottom"
  },
  UGC: {
    brief: "Talent: [Profile type — Egyptian creator/user type]. Hook: [Natural/authentic opening]. Demo: [Show product/service in use]. Testimonial: [Natural first-person benefit statement]. CTA: [What to do after watching]. No: Hard sell, overly polished, brand logo overuse.",
    tov: "Authentic · Natural · First-person · Relatable",
    dimensions: "1080×1920 vertical preferred · raw feel acceptable"
  },
};


export default async function NewTaskPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN, Role.ACCOUNT_MANAGER].includes(role)) redirect("/dashboard/creative");

  const [allClients, creators] = await Promise.all([
    db.select({ id: clients.id, companyName: clients.companyName }).from(clients).where(eq(clients.isActive, true)).orderBy(clients.companyName),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "CREATOR")),
  ]);

  const types = ["REEL","GRAPHIC","CAROUSEL","MOTION_GRAPHIC","VIDEO_EDIT","PHOTO_SESSION","STORY","UGC"];
  const typeLabels: Record<string,string> = {REEL:"🎬 Reel",GRAPHIC:"🎨 Graphic",CAROUSEL:"📊 Carousel",MOTION_GRAPHIC:"✨ Motion Graphic",VIDEO_EDIT:"🎥 Video Edit",PHOTO_SESSION:"📸 Photo Session",STORY:"📱 Story",UGC:"👤 UGC"};

  return (
    <div className=" animate-fade-up">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/creative" className="text-[#6B8FAF]  text-xl">←</Link>
        <div>
          <h1 className="page-title">🎨 New Creative Task</h1>
          <p className="text-sm text-[#6B8FAF] mt-1">Brief a creator with full details</p>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="card">
        <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider mb-3">⚡ Quick Templates — click to auto-fill</h2>
        <div className="flex flex-wrap gap-2">
          {TASK_TEMPLATES.map(t=>(
            <button key={t.id} type="button"
              onClick={undefined}
              data-template={JSON.stringify(t)}
              className="template-btn text-xs px-3 py-2 rounded-xl border border-white/10 text-[#6B8FAF] hover:border-[#244D87] hover:text-[#00B4D8] hover:bg-[#244D87]/10 transition-all cursor-pointer">
              {t.name}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#3D5577] mt-2">Click any template to auto-fill the form below, then customize as needed.</p>
      </div>

      <form action={createTask} style={{display:"flex",flexDirection:"column",gap:"20px"}} id="taskForm">
        <div className="card-vivit space-y-4">
          <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider">Task Details</h2>
          <div>
            <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Task Title *</label>
            <input name="title" id="f_title" required placeholder="e.g. Summer Campaign Reel — West Court" className="form-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Client *</label>
              <select name="clientId" required className="form-input">
                <option value="">Select client…</option>
                {allClients.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Creative Type *</label>
              <select name="type" id="f_type" required className="form-input">
                <option value="">Select type…</option>
                {types.map(t=><option key={t} value={t}>{typeLabels[t]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Assign To</label>
              <select name="assignedToId" className="form-input">
                <option value="">Unassigned</option>
                {creators.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Priority *</label>
              <select name="priority" id="f_priority" required className="form-input">
                <option value="URGENT">🔴 Urgent</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM" selected>🟡 Medium</option>
                <option value="LOW">⚪ Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Deadline *</label>
            <input name="deadline" id="f_deadline" type="date" required className="form-input" />
          </div>
        </div>

        <div className="card-vivit space-y-4">
          <h2 className="font-semibold text-[#244D87] text-xs uppercase tracking-wider">Creative Brief</h2>
          <div>
            <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Brief *</label>
            <textarea name="brief" id="f_brief" required rows={6} placeholder="Describe the goal, key messages, target audience, platforms, deliverables…" className="vivit-input resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Tone of Voice</label>
            <textarea name="tov" id="f_tov" rows={2} placeholder="e.g. Professional, energetic, luxury, playful…" className="vivit-input resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B8FAF] mb-1.5 uppercase tracking-wider">Caption / Copy</label>
            <textarea name="caption" rows={3} placeholder="Social media caption…" className="vivit-input resize-none" />
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard/creative" className="flex-1 py-3 rounded-xl text-center text-sm font-semibold border border-white/10 text-[#6B8FAF] hover:bg-white/5 transition-colors" style={{textDecoration:"none"}}>Cancel</Link>
          <button type="submit" className="btn-grad flex-1 justify-center py-3 text-sm font-bold">Create Task →</button>
        </div>
      </form>

      {/* Template auto-fill script */}
      <script dangerouslySetInnerHTML={{__html:`
        document.querySelectorAll('.template-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const t = JSON.parse(this.dataset.template);
            document.getElementById('f_title').value = t.name.replace(/^[^\s]+ /, '');
            document.getElementById('f_brief').value = t.brief;
            document.getElementById('f_tov').value = t.tov;
            document.getElementById('f_priority').value = t.priority;
            const typeEl = document.getElementById('f_type');
            Array.from(typeEl.options).forEach(o => { if(o.value === t.type) o.selected = true; });
            const d = new Date(); d.setDate(d.getDate() + t.daysToDeadline);
            document.getElementById('f_deadline').value = d.toISOString().split('T')[0];
            document.querySelectorAll('.template-btn').forEach(b => b.style.borderColor = '');
            this.style.borderColor = '#244D87';
            this.style.color = '#00B4D8';
            document.getElementById('taskForm').scrollIntoView({behavior:'smooth'});
          });
        });
      `}} />
    </div>
  );
}
