export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, clients, aiGenerations } from "@/lib/db";
import { eq, and, desc, count } from "drizzle-orm";
import { Role } from "@/lib/types";
import Link from "next/link";
import {AIStudioRuntime} from "@/components/ai/AIStudioRuntime";

export default async function AIStudioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.MEDIA_BUYER].includes(role)) redirect("/dashboard");

  const userId = String((session.user as any).id || "");
  const clientScope = role === Role.ACCOUNT_MANAGER
    ? and(eq(clients.isActive,true), eq(clients.accountManagerId,userId))
    : role === Role.MEDIA_BUYER
      ? and(eq(clients.isActive,true), eq(clients.mediaBuyerId,userId))
      : eq(clients.isActive,true);
  const [allClients, recentGens, genCount] = await Promise.all([
    db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(clientScope),
    role === Role.SUPER_ADMIN
      ? db.select().from(aiGenerations).orderBy(desc(aiGenerations.createdAt)).limit(10)
      : db.select().from(aiGenerations).where(eq(aiGenerations.userId,userId)).orderBy(desc(aiGenerations.createdAt)).limit(10),
    role === Role.SUPER_ADMIN
      ? db.select({cnt:count()}).from(aiGenerations)
      : db.select({cnt:count()}).from(aiGenerations).where(eq(aiGenerations.userId,userId)),
  ]);

  const TOOLS = [
    {
      id:"brief",icon:"📋",title:"Brief Generator",
      desc:"Generate a complete creative brief from task title and client context",
      color:"#C52A31",bg:"#EEF4FF",
      fields:[
        {name:"taskTitle",label:"Task Title",type:"text",placeholder:"Ramadan Campaign Reel — MISfive"},
        {name:"clientId", label:"Client",    type:"select"},
        {name:"taskType", label:"Task Type", type:"select",
         options:["REEL","GRAPHIC","CAROUSEL","STORY","UGC","MOTION","COPY"]},
        {name:"platform", label:"Platform",  type:"select",
         options:["Instagram","TikTok","Facebook","Snapchat","Google","LinkedIn"]},
      ],
    },
    {
      id:"caption",icon:"✍️",title:"Caption Writer",
      desc:"Write 3 caption variants with hashtags — short, medium, and story format",
      color:"#8B5CF6",bg:"#F5F3FF",
      fields:[
        {name:"postDesc",  label:"Post Description", type:"text",    placeholder:"Product launch for new summer collection"},
        {name:"brandTone", label:"Brand Tone",        type:"select",  options:["Professional","Playful","Luxury","Casual","Inspiring"]},
        {name:"clientId",  label:"Client",            type:"select"},
        {name:"platform",  label:"Platform",          type:"select",  options:["Instagram","TikTok","Facebook","LinkedIn"]},
      ],
    },
    {
      id:"budget",icon:"💰",title:"Budget Optimizer",
      desc:"Analyze your platform mix and get AI-powered budget reallocation recommendations",
      color:"#F59E0B",bg:"#FFFBEB",
      fields:[
        {name:"clientId",  label:"Client",        type:"select"},
        {name:"totalBudget",label:"Total Budget (EGP)",type:"number",placeholder:"50,000"},
        {name:"objective", label:"Campaign Goal",  type:"select",  options:["Lead Generation","Brand Awareness","Sales/Revenue","App Installs"]},
      ],
    },
    {
      id:"churn",icon:"📉",title:"Churn Predictor",
      desc:"Analyze client signals and get 3 specific retention actions for this week",
      color:"#EF4444",bg:"#FEF2F2",
      fields:[
        {name:"clientId",  label:"Client",        type:"select"},
      ],
    },
    {
      id:"summary",icon:"📊",title:"Performance Summary",
      desc:"Generate a polished executive summary ready to send to your client",
      color:"#10B981",bg:"#ECFDF5",
      fields:[
        {name:"clientId",  label:"Client",        type:"select"},
        {name:"period",    label:"Period",         type:"select",  options:["This Month","Last Month","Q1 2026","Q2 2026","Q3 2026","Q4 2026"]},
      ],
    },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 className="page-title">AI Studio</h1>
          <p className="page-subtitle">5 AI-powered tools · {Number(genCount[0]?.cnt??0)} total generations</p>
        </div>
        <div style={{
          padding:"8px 16px",borderRadius:"var(--radius-sm)",
          background:"linear-gradient(135deg,rgba(33,150,243,0.1),rgba(139,92,246,0.1))",
          border:"1px solid rgba(139,92,246,0.2)",
          display:"flex",alignItems:"center",gap:"8px"
        }}>
          <span style={{fontSize:"16px"}}>⚡</span>
          <span style={{fontSize:"12px",fontWeight:700,color:"var(--purple)"}}>Smart provider routing · Gemini Free / Claude</span>
        </div>
      </div>

      {/* Tool Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:"16px"}}>
        {TOOLS.map(tool=>(
          <div key={tool.id} className="card" style={{borderTop:`3px solid ${tool.color}`}}>
            <div className="card-header">
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{
                  width:"40px",height:"40px",borderRadius:"10px",
                  background:tool.bg,display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:"20px"
                }}>{tool.icon}</div>
                <div>
                  <p className="card-title">{tool.title}</p>
                  <p style={{fontSize:"11.5px",color:"var(--text-muted)",marginTop:"1px"}}>{tool.desc}</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"12px"}}>
                {tool.fields.map(f=>(
                  <div key={f.name}>
                    <label className="form-label">{f.label}</label>
                    {f.type==="select"&&f.name==="clientId" ? (
                      <select id={`${tool.id}-${f.name}`} className="form-select">
                        <option value="">Select client...</option>
                        {allClients.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}
                      </select>
                    ) : f.type==="select" ? (
                      <select id={`${tool.id}-${f.name}`} className="form-select">
                        {(f as any).options?.map((o:string)=><option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input id={`${tool.id}-${f.name}`} type={f.type}
                        placeholder={(f as any).placeholder} className="form-input"/>
                    )}
                  </div>
                ))}
              </div>

              {/* Output area */}
              <div id={`${tool.id}-output`} style={{
                minHeight:"80px",background:"var(--bg-tertiary)",
                borderRadius:"var(--radius-sm)",border:"1px solid var(--card-border)",
                padding:"12px",fontSize:"13px",lineHeight:1.7,
                color:"var(--text-muted)",display:"none",whiteSpace:"pre-wrap",
                maxHeight:"200px",overflowY:"auto"
              }}/>
              <div id={`${tool.id}-placeholder`} style={{
                minHeight:"80px",background:"var(--bg-tertiary)",
                borderRadius:"var(--radius-sm)",border:"1px dashed var(--card-border)",
                padding:"16px",display:"flex",alignItems:"center",justifyContent:"center",
                color:"var(--text-dim)",fontSize:"12px",textAlign:"center"
              }}>
                AI output will appear here<br/>
                <span style={{fontSize:"11px",opacity:0.6}}>Fill the form above and click Generate</span>
              </div>

              <button
                style={{
                  marginTop:"12px",width:"100%",padding:"10px",
                  background:`linear-gradient(135deg,${tool.color},${tool.color}CC)`,
                  color:"#fff",border:"none",borderRadius:"var(--radius-sm)",
                  fontSize:"13.5px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",
                  transition:"all 0.2s ease",
                }}
                id={`${tool.id}-btn`}>
                ✨ Generate with AI
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Generations */}
      {recentGens.length>0&&(
        <div className="card">
          <div className="card-header">
            <p className="card-title">Recent Generations</p>
          </div>
          <div className="card-body-flush">
            <table className="data-table">
              <thead><tr><th>Tool</th><th>Prompt</th><th>When</th></tr></thead>
              <tbody>
                {recentGens.map(g=>(
                  <tr key={g.id}>
                    <td><span className="badge badge-purple" style={{fontSize:"11px"}}>{g.type}</span></td>
                    <td style={{fontSize:"12.5px",color:"var(--text-secondary)",maxWidth:"400px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {g.prompt?.slice(0,80)??""}{(g.prompt?.length??0)>80?"...":""}
                    </td>
                    <td style={{fontSize:"12px",color:"var(--text-muted)",whiteSpace:"nowrap"}}>
                      {new Date(g.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AIStudioRuntime/>
      {/* Legacy inline runtime removed: React navigation does not execute injected scripts reliably. */}
      {/* <script dangerouslySetInnerHTML={{__html:`
        document.querySelectorAll('[id$="-btn"]').forEach(function(btn) {
          btn.addEventListener('click', async function() {
            var toolId = this.id.replace('-btn','');
            var output = document.getElementById(toolId+'-output');
            var placeholder = document.getElementById(toolId+'-placeholder');
            var originalText = this.textContent;
            this.textContent = '⏳ Generating...';
            this.disabled = true;

            // Collect form values
            var data = { tool: toolId };
            document.querySelectorAll('[id^="'+toolId+'-"]').forEach(function(el) {
              if (el.id !== toolId+'-btn' && el.id !== toolId+'-output' && el.id !== toolId+'-placeholder') {
                var field = el.id.replace(toolId+'-','');
                data[field] = el.value;
              }
            });

            try {
              var res = await fetch('/api/ai', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify(data)
              });
              var result = await res.json();
              if (result.content) {
                output.textContent = result.content;
                output.style.display = 'block';
                placeholder.style.display = 'none';
                output.style.color = 'var(--text-primary)';
              }
            } catch(e) {
              output.textContent = 'Error: ' + e.message + '. Ask the Super Admin to configure GEMINI_API_KEY or ANTHROPIC_API_KEY.';
              output.style.display = 'block';
              placeholder.style.display = 'none';
              output.style.color = 'var(--red)';
            }
            this.textContent = originalText;
            this.disabled = false;
          });
        });
      `}}/> */}

    </div>
  );
}
