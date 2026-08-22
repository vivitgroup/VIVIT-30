// @ts-nocheck -- Drizzle's generated approval shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { db, approvalTokens, creativeTasks, clients } from "@/lib/db";
import { eq, and, gte } from "drizzle-orm";
import Link from "next/link";

export default async function ApproveTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [tokenRow] = await db.select().from(approvalTokens).where(
    and(eq(approvalTokens.token, token), gte(approvalTokens.expiresAt, new Date()))
  );

  if (!tokenRow) {
    return (
      <div style={{minHeight:"100vh",background:"#060D1A",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
        <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:"20px",padding:"40px",textAlign:"center",maxWidth:"420px"}}>
          <p style={{fontSize:"48px",marginBottom:"16px"}}>⏰</p>
          <h1 style={{fontSize:"22px",fontWeight:"700",color:"#FCA5A5",marginBottom:"8px"}}>Link Expired or Invalid</h1>
          <p style={{color:"#6B8FAF",fontSize:"14px"}}>This approval link has expired or already been used. Please contact your account manager for a new link.</p>
        </div>
      </div>
    );
  }

  if (tokenRow.usedAt) {
    return (
      <div style={{minHeight:"100vh",background:"#060D1A",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
        <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:"20px",padding:"40px",textAlign:"center",maxWidth:"420px"}}>
          <p style={{fontSize:"48px",marginBottom:"16px"}}>✅</p>
          <h1 style={{fontSize:"22px",fontWeight:"700",color:"#6EE7B7",marginBottom:"8px"}}>Already Processed</h1>
          <p style={{color:"#6B8FAF",fontSize:"14px"}}>This creative has already been {tokenRow.action}d. Thank you!</p>
        </div>
      </div>
    );
  }

  const [task] = await db.select().from(creativeTasks).where(eq(creativeTasks.id, tokenRow.taskId));
  const [client] = await db.select({ companyName: clients.companyName }).from(clients).where(eq(clients.id, tokenRow.clientId));

  const TYPE_ICON: Record<string,string> = {REEL:"🎬",GRAPHIC:"🎨",CAROUSEL:"📊",MOTION_GRAPHIC:"✨",VIDEO_EDIT:"🎥",STORY:"📱",UGC:"👤"};

  async function processApproval(action: "APPROVED" | "REVISION") {
    "use server";
    const { db, approvalTokens, creativeTasks } = await import("@/lib/db");
    const { eq, and, gte, isNull } = await import("drizzle-orm");
    const [freshToken] = await db.select().from(approvalTokens).where(and(
      eq(approvalTokens.token, token),
      gte(approvalTokens.expiresAt, new Date()),
      isNull(approvalTokens.usedAt),
    )).limit(1);
    if (!freshToken || freshToken.taskId !== tokenRow.taskId || freshToken.clientId !== tokenRow.clientId) {
      throw new Error("This approval link is invalid, expired, or already used");
    }
    const [freshTask] = await db.select().from(creativeTasks).where(eq(creativeTasks.id, freshToken.taskId)).limit(1);
    if (!freshTask || freshTask.clientId !== freshToken.clientId) throw new Error("Creative not found");

    await db.update(creativeTasks).set({
      status: action,
      ...(action === "APPROVED" ? {
        approvedByClient: true,
        clientApprovalAt: new Date(),
        clientApprovalName: "Client via email",
      } : {
        revisionCount: (freshTask.revisionCount ?? 0) + 1,
        revisionNotes: "Revision requested via email approval link",
      }),
      updatedAt: new Date(),
    }).where(eq(creativeTasks.id, freshToken.taskId));

    await db.update(approvalTokens).set({ usedAt: new Date(), action }).where(and(eq(approvalTokens.token, token), isNull(approvalTokens.usedAt)));
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/approve/${token}`);
  }

  return (
    <div style={{minHeight:"100vh",background:"#060D1A",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{width:"100%",maxWidth:"500px"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{width:"48px",height:"48px",borderRadius:"12px",background:"linear-gradient(135deg,#17345F,#244D87)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}>
            <svg width="22" height="22" viewBox="0 0 44 44" fill="none">
              <path d="M4 8 L22 36 L40 8" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{fontSize:"11px",color:"#244D87",fontWeight:"700",letterSpacing:"0.15em"}}>VIVIT GROUP</p>
        </div>

        <div style={{background:"rgba(10,20,40,0.95)",border:"1px solid rgba(0,119,182,0.2)",borderRadius:"20px",padding:"32px",backdropFilter:"blur(20px)"}}>
          <h1 style={{fontSize:"20px",fontWeight:"700",color:"#E8F4FD",marginBottom:"4px"}}>Creative Review Required</h1>
          <p style={{color:"#6B8FAF",fontSize:"13px",marginBottom:"24px"}}>{client?.companyName} — please review and take action</p>

          <div style={{background:"rgba(0,119,182,0.06)",border:"1px solid rgba(0,119,182,0.15)",borderRadius:"14px",padding:"18px",marginBottom:"24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
              <span style={{fontSize:"24px"}}>{TYPE_ICON[task?.type??""]??""}</span>
              <div>
                <p style={{fontWeight:"600",fontSize:"15px",color:"#E8F4FD"}}>{task?.title}</p>
                <p style={{fontSize:"12px",color:"#6B8FAF"}}>{task?.type?.replace(/_/g," ")} · Due {task ? new Date(task.deadline).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) : ""}</p>
              </div>
            </div>
            {task?.fileUrl && (
              <a href={task.fileUrl} target="_blank" style={{display:"inline-flex",alignItems:"center",gap:"6px",fontSize:"13px",color:"#00B4D8",fontWeight:"600",textDecoration:"none",background:"rgba(0,180,216,0.1)",padding:"8px 14px",borderRadius:"8px"}}>
                🔗 View File / Google Drive →
              </a>
            )}
            {!task?.fileUrl && (
              <p style={{fontSize:"12px",color:"#3D5577",fontStyle:"italic"}}>File not yet uploaded by creator</p>
            )}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
            <form action={async()=>{"use server"; await processApproval("APPROVED");}}>
              <button type="submit" style={{width:"100%",padding:"14px",borderRadius:"12px",border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"white",fontSize:"15px",fontWeight:"700",cursor:"pointer"}}>
                ✅ Approve
              </button>
            </form>
            <form action={async()=>{"use server"; await processApproval("REVISION");}}>
              <button type="submit" style={{width:"100%",padding:"14px",borderRadius:"12px",border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.08)",color:"#fbbf24",fontSize:"15px",fontWeight:"700",cursor:"pointer"}}>
                ↩ Request Changes
              </button>
            </form>
          </div>

          <p style={{textAlign:"center",color:"#2A3F5F",fontSize:"11px",marginTop:"20px"}}>This link expires 48 hours after it was sent · VIVIT GROUP</p>
        </div>
      </div>
    </div>
  );
}
