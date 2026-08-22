export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, aiGenerations } from "@/lib/db";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(prompt: string, system: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key":process.env.ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Claude request failed");
  return data.content?.[0]?.text ?? "Unable to generate. Please try again.";
}

async function callGemini(prompt:string, system:string):Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
  const model=process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:.65,maxOutputTokens:2400}}),
  });
  const data=await res.json();
  if(!res.ok) throw new Error(data?.error?.message||"Gemini request failed");
  return data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text).join("\n")||"Unable to generate. Please try again.";
}

async function generate(prompt:string,system:string){
  if(process.env.GEMINI_API_KEY) return callGemini(prompt,system);
  if(process.env.ANTHROPIC_API_KEY) return callClaude(prompt,system);
  return `Smart draft (local mode)\n\n${prompt}\n\nRecommended execution:\n1. Confirm the audience, offer and measurable goal.\n2. Prepare three creative angles: proof, benefit and urgency.\n3. Launch a controlled test with clear naming and tracking.\n4. Review spend, leads, CPL and conversion quality every 48 hours.\n5. Keep the winner, pause weak variants and document the learning.\n\nNext action: assign an owner, deadline and approval checkpoint before publishing.`;
}

// ── In-Memory Rate Limiter ───────────────────────────────────
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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limiting: 10 AI calls per minute per user
  if (!checkRateLimit(`ai:${session.user.id}`, 10)) {
    return NextResponse.json({ error: "Rate limit exceeded. Max 10 AI requests per minute." }, { status: 429 });
  }

  const body = await req.json();
  // Support both {type, data} and flat {tool, ...params} formats
  const type = body.type ?? body.tool ?? "brief";
  const data = body.data ?? (() => {
    // Flat format from AI Studio: remove "tool" key, rest is data
    const { tool, ...rest } = body;
    return rest;
  })();
  let result = "";
  let prompt = "";

  switch (type) {
    case "brief": {
      const { taskTitle, clientName, industry, type: creativeType, platform } = data;
      const system = `You are an expert creative director at a digital marketing agency. Generate professional creative briefs in English. Be specific, actionable, and concise. Output structured markdown.`;
      prompt = `Generate a complete creative brief for:
Task: ${taskTitle}
Client: ${clientName} (${industry} industry)
Type: ${creativeType}
Platform: ${platform ?? "Instagram, TikTok"}

Include: Objective, Target Audience, Key Message, Tone of Voice, Visual Direction, Deliverables, Technical Specs, Do's & Don'ts.`;
      result = await generate(prompt, system);
      break;
    }

    case "caption": {
      const { taskTitle, postDesc, clientName, industry, tov, brandTone, platform } = data;
      const system = `You are a social media copywriter. Generate engaging captions with relevant emojis and hashtags. Be concise and platform-appropriate.`;
      prompt = `Write 3 caption options for:
Post: ${taskTitle ?? postDesc}
Brand: ${clientName} (${industry})
Tone: ${tov ?? brandTone ?? "Professional and engaging"}
Platform: ${platform ?? "Instagram"}

Format: Option 1 (short), Option 2 (medium with CTAs), Option 3 (story format). Include relevant hashtags.`;
      result = await generate(prompt, system);
      break;
    }

    case "budget_optimizer":
    case "budget": {
      const { platforms } = data; // array of {platform, spend, leads, revenue, roas}
      const system = `You are a media buying expert. Analyze performance data and give specific, actionable budget reallocation advice. Be direct and data-driven.`;
      prompt = platforms ? `Analyze this ad performance data and recommend budget reallocation:

${platforms.map((p: any) => `${p.platform}: Spend $${p.spend}, Leads: ${p.leads}, Revenue: $${p.revenue}, ROAS: ${p.roas}x, CPL: $${p.cpl}`).join("\n")}

Provide:
1. Which platform(s) to increase budget (with exact %)
2. Which platform(s) to reduce (with exact %)
3. Expected improvement in leads/ROAS
4. One specific optimization tip per platform` : `Create a practical media budget allocation for a total budget of ${data.totalBudget}, goal ${data.objective}. Give percentage and amount per Meta, TikTok and Google, expected leads, risks and weekly optimization rules.`;
      result = await generate(prompt, system);
      break;
    }

    case "churn_prediction":
    case "churn": {
      const { clientName, paymentHistory, roasHistory, taskCompletion, npsScore, contractDaysLeft } = data;
      const system = `You are a customer success analyst. Predict churn risk based on signals and give specific retention recommendations.`;
      prompt = `Analyze churn risk for client: ${clientName}

Signals:
- Payment: ${paymentHistory} (on-time/late/missed)
- ROAS trend: ${roasHistory} (improving/stable/declining)
- Task completion: ${taskCompletion}% approved
- NPS Score: ${npsScore ?? "not collected"}/10
- Contract days left: ${contractDaysLeft}

Provide:
1. Churn probability (0-100%)
2. Risk level (Low/Medium/High/Critical)
3. Top 3 warning signals
4. 3 specific retention actions to take THIS WEEK
5. One relationship-building message to send`;
      result = await generate(prompt, system);
      break;
    }

    case "performance_summary":
    case "summary": {
      const { clientName, spend, leads, roas, tasksCompleted, nps, outstanding } = data;
      const system = `You are an account manager at a top marketing agency. Write professional, positive client summaries. Highlight wins, address concerns diplomatically.`;
      prompt = `Write a brief executive summary for ${clientName}:
Ad Spend: $${spend} | Leads: ${leads} | ROAS: ${roas}x
Tasks Completed: ${tasksCompleted} | NPS: ${nps ?? "N/A"} | Outstanding: $${outstanding}

Write 3 paragraphs: Performance highlights, areas for improvement, next month recommendations.`;
      result = await generate(prompt, system);
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown AI type" }, { status: 400 });
  }

  // Log AI generation
  await db.insert(aiGenerations).values({
    workspaceId: "default",
    userId:      session.user.id!,
    type,
    prompt:      prompt.slice(0, 500),
    result:      result.slice(0, 2000),
    tokensUsed:  Math.floor(result.length / 4),
  } as any);

  return NextResponse.json({ result, content:result, type, provider:process.env.GEMINI_API_KEY?"gemini":process.env.ANTHROPIC_API_KEY?"anthropic":"smart-local" });
}
