export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, clientFeedback } from "@/lib/db";
import {  desc } from "drizzle-orm";
import { Role } from "@/lib/types";

export default async function NPSPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role as Role;
  if (role !== Role.SUPER_ADMIN) redirect("/dashboard");

  const allFeedback = await db.select({
    id:clientFeedback.id, clientId:clientFeedback.clientId,
    score:clientFeedback.score, comment:clientFeedback.comment,
    createdAt:clientFeedback.createdAt,
  }).from(clientFeedback).orderBy(desc(clientFeedback.createdAt));

  const allClients = await db.select({id:clients.id,companyName:clients.companyName}).from(clients);
  const clientMap  = Object.fromEntries(allClients.map(c=>[c.id,c.companyName]));

  // Real NPS: % Promoters (9-10) - % Detractors (0-6)
  const total      = allFeedback.length;
  const promoters  = allFeedback.filter(f=>Number(f.score)>=9).length;
  const passives   = allFeedback.filter(f=>Number(f.score)>=7&&Number(f.score)<=8).length;
  const detractors = allFeedback.filter(f=>Number(f.score)<=6).length;
  const nps        = total>0 ? Math.round((promoters-detractors)/total*100) : 0;
  const avgScore   = total>0 ? (allFeedback.reduce((s,f)=>s+Number(f.score),0)/total).toFixed(1) : "0.0";
  const npsColor   = nps>=50?"var(--green)":nps>=0?"var(--amber)":"var(--red)";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px",maxWidth:"800px"}}>
      <div>
        <h1 className="page-title">NPS Dashboard</h1>
        <p className="page-subtitle">Net Promoter Score · {total} responses total</p>
      </div>

      {/* NPS Score big display */}
      <div className="card" style={{background:"var(--vivit-gradient)",border:"none"}}>
        <div className="card-body" style={{padding:"32px",textAlign:"center"}}>
          <p style={{fontSize:"12px",fontWeight:700,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"12px"}}>Net Promoter Score</p>
          <p style={{fontSize:"80px",fontWeight:900,color:"#fff",fontFamily:"Sora,sans-serif",lineHeight:1,marginBottom:"8px"}}>{nps}</p>
          <p style={{fontSize:"14px",color:"rgba(255,255,255,0.8)"}}>
            {nps>=50?"Excellent 🚀":nps>=30?"Good 👍":nps>=0?"Fair ⚠️":"Needs attention ❌"}
          </p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px",marginTop:"24px"}}>
            {[
              {label:"Promoters",  value:promoters, pct:Math.round(promoters/total*100)||0,  color:"rgba(16,185,129,0.9)"},
              {label:"Passives",   value:passives,  pct:Math.round(passives/total*100)||0,   color:"rgba(245,158,11,0.9)"},
              {label:"Detractors", value:detractors,pct:Math.round(detractors/total*100)||0, color:"rgba(239,68,68,0.9)"},
            ].map(g=>(
              <div key={g.label} style={{background:"rgba(255,255,255,0.12)",borderRadius:"12px",padding:"14px"}}>
                <p style={{fontSize:"22px",fontWeight:800,color:"#fff",fontFamily:"Sora,sans-serif"}}>{g.value}</p>
                <p style={{fontSize:"12px",fontWeight:700,color:"rgba(255,255,255,0.85)",marginTop:"2px"}}>{g.label}</p>
                <p style={{fontSize:"11px",color:"rgba(255,255,255,0.6)"}}>{g.pct}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="card">
        <div className="card-header"><p className="card-title">Score Distribution</p></div>
        <div className="card-body">
          {Array.from({length:11},(_,i)=>{
            const cnt = allFeedback.filter(f=>Number(f.score)===i).length;
            const pct = total>0 ? cnt/total*100 : 0;
            const color = i>=9?"var(--green)":i>=7?"var(--amber)":"var(--red)";
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>
                <span style={{fontSize:"12px",fontWeight:700,width:"16px",color,textAlign:"right"}}>{i}</span>
                <div className="progress-bar" style={{flex:1}}>
                  <div className="progress-fill" style={{width:`${pct}%`,background:color}}/>
                </div>
                <span style={{fontSize:"12px",color:"var(--text-muted)",width:"40px",textAlign:"right"}}>{cnt} ({Math.round(pct)}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent feedback */}
      <div className="card">
        <div className="card-header"><p className="card-title">Recent Responses</p></div>
        <div className="card-body-flush">
          <table className="data-table">
            <thead><tr><th>Client</th><th>Score</th><th>Comment</th><th>Date</th></tr></thead>
            <tbody>
              {allFeedback.slice(0,20).map(f=>{
                const s = Number(f.score);
                const c = s>=9?"var(--green)":s>=7?"var(--amber)":"var(--red)";
                return (
                  <tr key={f.id}>
                    <td style={{fontWeight:600}}>{clientMap[f.clientId]??f.clientId.slice(0,12)}</td>
                    <td>
                      <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:"32px",height:"32px",borderRadius:"50%",background:`${c}15`,color:c,fontWeight:800,fontFamily:"Sora,sans-serif",fontSize:"14px"}}>{s}</span>
                    </td>
                    <td style={{fontSize:"12.5px",color:"var(--text-secondary)",maxWidth:"320px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.comment??<span style={{color:"var(--text-dim)"}}>No comment</span>}</td>
                    <td style={{fontSize:"12px",color:"var(--text-muted)",whiteSpace:"nowrap"}}>
                      {new Date(f.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {allFeedback.length===0&&(
            <div className="empty-state">
              <p className="empty-state-icon">⭐</p>
              <p className="empty-state-title">No NPS responses yet</p>
              <p className="empty-state-desc">Clients submit NPS scores from their portal. Invite them to rate their experience.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
