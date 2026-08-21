export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, aiGenerations } from "@/lib/db";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(prompt: string, system: string): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? "Unable to generate. Please try again.";
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
      result = await callClaude(prompt, system);
      break;
    }

    case "caption": {
      const { taskTitle, clientName, industry, tov, platform } = data;
      const system = `You are a social media copywriter. Generate engaging captions with relevant emojis and hashtags. Be concise and platform-appropriate.`;
      prompt = `Write 3 caption options for:
Post: ${taskTitle}
Brand: ${clientName} (${industry})
Tone: ${tov ?? "Professional and engaging"}
Platform: ${platform ?? "Instagram"}

Format: Option 1 (short), Option 2 (medium with CTAs), Option 3 (story format). Include relevant hashtags.`;
      result = await callClaude(prompt, system);
      break;
    }

    case "budget_optimizer": {
      const { platforms } = data; // array of {platform, spend, leads, revenue, roas}
      const system = `You are a media buying expert. Analyze performance data and give specific, actionable budget reallocation advice. Be direct and data-driven.`;
      prompt = `Analyze this ad performance data and recommend budget reallocation:

${platforms.map((p: any) => `${p.platform}: Spend $${p.spend}, Leads: ${p.leads}, Revenue: $${p.revenue}, ROAS: ${p.roas}x, CPL: $${p.cpl}`).join("\n")}

Provide:
1. Which platform(s) to increase budget (with exact %)
2. Which platform(s) to reduce (with exact %)
3. Expected improvement in leads/ROAS
4. One specific optimization tip per platform`;
      result = await callClaude(prompt, system);
      break;
    }

    case "churn_prediction": {
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
      result = await callClaude(prompt, system);
      break;
    }

    case "performance_summary": {
      const { clientName, spend, leads, roas, tasksCompleted, nps, outstanding } = data;
      const system = `You are an account manager at a top marketing agency. Write professional, positive client summaries. Highlight wins, address concerns diplomatically.`;
      prompt = `Write a brief executive summary for ${clientName}:
Ad Spend: $${spend} | Leads: ${leads} | ROAS: ${roas}x
Tasks Completed: ${tasksCompleted} | NPS: ${nps ?? "N/A"} | Outstanding: $${outstanding}

Write 3 paragraphs: Performance highlights, areas for improvement, next month recommendations.`;
      result = await callClaude(prompt, system);
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

  return NextResponse.json({ result, type });
}
