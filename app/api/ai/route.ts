export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, aiGenerations, clients, mediaMetrics, financeRecords, creativeTasks, clientFeedback, eq, and, gte, desc, sum } from "@/lib/db";
import { canAccessClient } from "@/lib/client-access";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(prompt: string, system: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "Content-Type":"application/json", "x-api-key":process.env.ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:4000, system, messages:[{ role:"user", content:prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Claude request failed");
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Claude returned an empty response");
  return text;
}

async function callGemini(prompt:string, system:string):Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
  const model=process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:.65,maxOutputTokens:2400}}),
  });
  const data=await res.json();
  if(!res.ok) throw new Error(data?.error?.message||"Gemini request failed");
  const text=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text).join("\n");
  if(!text) throw new Error("Gemini returned an empty response");
  return text;
}

async function generate(prompt:string, system:string){
  if(process.env.GEMINI_API_KEY) return { content:await callGemini(prompt,system), provider:"gemini" };
  if(process.env.ANTHROPIC_API_KEY) return { content:await callClaude(prompt,system), provider:"anthropic" };
  throw new Error("AI provider is not configured");
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxPerMinute = 10): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

async function hydrateClientContext(session:any,data:any,type:string){
  const clientId=String(data?.clientId||"");
  if(!clientId) return {ok:true};
  if(!(await canAccessClient(session,clientId))) return {ok:false,status:403,error:"You cannot use this client in AI Studio."};
  const [client]=await db.select({companyName:clients.companyName,industry:clients.industry}).from(clients).where(eq(clients.id,clientId)).limit(1);
  if(!client) return {ok:false,status:404,error:"Client not found."};
  data.clientName=client.companyName;
  data.industry=client.industry||"unspecified";

  if(["churn","churn_prediction","summary","performance_summary"].includes(type)){
    const now=new Date(),monthStart=new Date(now.getFullYear(),now.getMonth(),1),month=now.getMonth()+1,year=now.getFullYear();
    const [metrics,finance,tasks,feedback]=await Promise.all([
      db.select({spend:sum(mediaMetrics.adSpend),leads:sum(mediaMetrics.leads),revenue:sum(mediaMetrics.revenue)}).from(mediaMetrics).where(and(eq(mediaMetrics.clientId,clientId),gte(mediaMetrics.date,monthStart))),
      db.select({outstanding:sum(financeRecords.outstanding),paid:sum(financeRecords.paid)}).from(financeRecords).where(and(eq(financeRecords.clientId,clientId),eq(financeRecords.month,month),eq(financeRecords.year,year))),
      db.select({status:creativeTasks.status}).from(creativeTasks).where(eq(creativeTasks.clientId,clientId)),
      db.select({score:clientFeedback.score}).from(clientFeedback).where(eq(clientFeedback.clientId,clientId)).orderBy(desc(clientFeedback.createdAt)).limit(1),
    ]);
    const spend=Number(metrics[0]?.spend||0),leads=Number(metrics[0]?.leads||0),revenue=Number(metrics[0]?.revenue||0),outstanding=Number(finance[0]?.outstanding||0);
    const completed=tasks.filter(t=>["APPROVED","COMPLETED"].includes(String(t.status))).length;
    const completion=tasks.length?Math.round(completed/tasks.length*100):0;
    data.spend=spend; data.leads=leads; data.revenue=revenue; data.roas=spend>0?Number((revenue/spend).toFixed(2)):0;
    data.tasksCompleted=completed; data.taskCompletion=completion; data.nps=feedback[0]?.score??null; data.npsScore=feedback[0]?.score??null;
    data.outstanding=outstanding; data.paymentHistory=outstanding>0?`Outstanding balance: ${outstanding.toLocaleString("en-EG")} EGP`:`No outstanding balance recorded for ${month}/${year}`;
    data.roasHistory=spend>0?`Current month ROAS: ${(revenue/spend).toFixed(2)}x`:`No current-month spend recorded`;
    data.contractDaysLeft="not available in this analysis";
  }
  return {ok:true};
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  const role=String((session.user as any).role);
  if(!["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER"].includes(role)) return NextResponse.json({error:"Your role cannot use AI Studio."},{status:403});
  if (!checkRateLimit(`ai:${session.user.id}`, 10)) return NextResponse.json({ error:"Rate limit exceeded. Max 10 AI requests per minute." }, { status:429 });

  let body:any;
  try{body=await req.json();}catch{return NextResponse.json({error:"Invalid JSON body"},{status:400});}
  const type = String(body.type ?? body.tool ?? "brief");
  const data:any = body.data ?? (() => { const { tool, ...rest } = body; return rest; })();
  const context=await hydrateClientContext(session,data,type);
  if(!context.ok) return NextResponse.json({error:context.error},{status:context.status});
  let result = "";
  let provider = "";
  let prompt = "";

  try {
    let generated:{content:string;provider:string};
    switch (type) {
      case "brief": {
        const { taskTitle, clientName, industry, type: creativeType, taskType, platform } = data;
        if(!String(taskTitle||"").trim()) return NextResponse.json({error:"Task title is required."},{status:400});
        const system = "You are an expert creative director at a digital marketing agency. Generate professional creative briefs in English. Be specific, actionable, and concise. Output structured markdown.";
        prompt = `Generate a complete creative brief for:\nTask: ${taskTitle}\nClient: ${clientName||"Unspecified client"} (${industry||"unspecified"} industry)\nType: ${creativeType||taskType||"Unspecified"}\nPlatform: ${platform ?? "Instagram, TikTok"}\n\nInclude: Objective, Target Audience, Key Message, Tone of Voice, Visual Direction, Deliverables, Technical Specs, Do's & Don'ts.`;
        generated = await generate(prompt,system); break;
      }
      case "caption": {
        const { taskTitle, postDesc, clientName, industry, tov, brandTone, platform } = data;
        if(!String(taskTitle||postDesc||"").trim()) return NextResponse.json({error:"Post description is required."},{status:400});
        const system = "You are a social media copywriter. Generate engaging captions with relevant emojis and hashtags. Be concise and platform-appropriate.";
        prompt = `Write 3 caption options for:\nPost: ${taskTitle ?? postDesc}\nBrand: ${clientName||"Unspecified brand"} (${industry||"unspecified"})\nTone: ${tov ?? brandTone ?? "Professional and engaging"}\nPlatform: ${platform ?? "Instagram"}\n\nFormat: Option 1 (short), Option 2 (medium with CTAs), Option 3 (story format). Include relevant hashtags.`;
        generated = await generate(prompt,system); break;
      }
      case "budget_optimizer":
      case "budget": {
        const { platforms } = data;
        const totalBudget=Number(data.totalBudget||0);
        if(!platforms&&(!Number.isFinite(totalBudget)||totalBudget<=0)) return NextResponse.json({error:"Enter a valid total budget."},{status:400});
        const system = "You are a media buying expert. Analyze performance data and give specific, actionable budget reallocation advice. Be direct and data-driven.";
        prompt = platforms ? `Analyze this ad performance data and recommend budget reallocation:\n\n${platforms.map((p:any)=>`${p.platform}: Spend ${p.spend} EGP, Leads: ${p.leads}, Revenue: ${p.revenue} EGP, ROAS: ${p.roas}x, CPL: ${p.cpl} EGP`).join("\n")}\n\nProvide:\n1. Which platform(s) to increase budget (with exact %)\n2. Which platform(s) to reduce (with exact %)\n3. Expected improvement in leads/ROAS\n4. One specific optimization tip per platform` : `Create a practical media budget allocation for ${data.clientName||"the selected client"} with a total budget of ${totalBudget.toLocaleString("en-EG")} EGP, goal ${data.objective||"not specified"}. Give percentage and amount per Meta, TikTok and Google, expected leads, risks and weekly optimization rules.`;
        generated = await generate(prompt,system); break;
      }
      case "churn_prediction":
      case "churn": {
        const { clientName, paymentHistory, roasHistory, taskCompletion, npsScore, contractDaysLeft } = data;
        if(!data.clientId) return NextResponse.json({error:"Select a client."},{status:400});
        const system = "You are a customer success analyst. Assess churn risk from supplied signals and give specific retention recommendations. Do not invent missing data.";
        prompt = `Assess churn risk for client: ${clientName}\n\nSignals:\n- Payment: ${paymentHistory}\n- ROAS trend: ${roasHistory}\n- Task completion: ${taskCompletion}% approved/completed\n- NPS Score: ${npsScore ?? "not collected"}/10\n- Contract days left: ${contractDaysLeft}\n\nProvide:\n1. Risk estimate with assumptions\n2. Risk level (Low/Medium/High/Critical)\n3. Top warning signals\n4. 3 specific retention actions to take this week\n5. One relationship-building message to send`;
        generated = await generate(prompt,system); break;
      }
      case "performance_summary":
      case "summary": {
        const { clientName, spend, leads, roas, tasksCompleted, nps, outstanding } = data;
        if(!data.clientId) return NextResponse.json({error:"Select a client."},{status:400});
        const system = "You are an account manager at a marketing agency. Write professional client summaries grounded only in the supplied data. Highlight wins and address concerns diplomatically.";
        prompt = `Write a brief executive summary for ${clientName} (${data.period||"current period"}):\nAd Spend: ${spend} EGP | Leads: ${leads} | ROAS: ${roas}x\nTasks Completed: ${tasksCompleted} | NPS: ${nps ?? "N/A"} | Outstanding: ${outstanding} EGP\n\nWrite 3 paragraphs: Performance highlights, areas for improvement, next month recommendations.`;
        generated = await generate(prompt,system); break;
      }
      default: return NextResponse.json({ error:"Unknown AI type" }, { status:400 });
    }
    result=generated.content; provider=generated.provider;
  } catch (error:any) {
    const message=error?.message || "AI generation failed";
    const configurationError=message.includes("not configured");
    return NextResponse.json({ error: configurationError ? "AI Studio is unavailable until an AI provider is configured." : message }, { status:configurationError?503:502 });
  }

  await db.insert(aiGenerations).values({
    workspaceId:"default", userId:session.user.id!, type,
    prompt:prompt.slice(0,500), result:result.slice(0,2000), tokensUsed:Math.floor(result.length/4),
  } as any);

  return NextResponse.json({ result, content:result, type, provider });
}
