export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ═══════════════════════════════════════════════════════════════
// Feature 11: Brief Templates Library — 12 Templates
// Covers all major content types + industry-specific variants
// ═══════════════════════════════════════════════════════════════

const BRIEF_TEMPLATES = [
  {
    id:"reel_hero", type:"REEL", label:"🎬 Hero Reel (Brand Story)", platform:"Meta",
    estimatedDays:7, dimensions:"1080×1920 / 9:16", duration:"15-30 sec",
    brief:`OBJECTIVE: Introduce the brand and create emotional connection.
TOV: Inspiring, authentic, warm.
HOOK (0-3s): Start with a bold statement or surprising visual — NO logo first.
STRUCTURE:
- 0-3s: Hook / Problem statement
- 3-15s: Story / Solution
- 15-25s: Social proof / results
- 25-30s: CTA
DO: Show real people, behind-the-scenes, transformation.
DON'T: Watermarks, stock footage feel, text-heavy.
MUSIC: Trending audio from Meta Sound Collection.
SUBTITLES: Arabic + English required.`,
  },
  {
    id:"reel_product", type:"REEL", label:"🛍️ Product Showcase Reel", platform:"Meta/TikTok",
    estimatedDays:5, dimensions:"1080×1920 / 9:16", duration:"10-15 sec",
    brief:`OBJECTIVE: Showcase product features and drive purchase intent.
TOV: Energetic, confident, direct.
HOOK (0-3s): Product in action — no intro needed.
STRUCTURE:
- 0-3s: Product closeup / hero shot
- 3-10s: 3 key features (quick cuts)
- 10-15s: Price + CTA
DO: Fast cuts, trending sounds, bright colors.
DON'T: Long explanations, boring backgrounds.
TEXT OVERLAY: Feature callouts + price.`,
  },
  {
    id:"carousel_edu", type:"CAROUSEL", label:"📚 Educational Carousel", platform:"Instagram",
    estimatedDays:3, dimensions:"1080×1080 / 1:1", slides:8,
    brief:`OBJECTIVE: Educate audience and establish brand as expert.
TOV: Informative, trustworthy, clear.
STRUCTURE:
- Slide 1: Hook question or bold statistic
- Slides 2-6: One tip/point per slide
- Slide 7: Summary / recap
- Slide 8: CTA + website/DM prompt
DESIGN: Consistent color palette, max 30 words per slide.
FONT: Brand font, readable at small size.
DO: Data points, icons, numbered steps.
DON'T: Walls of text, inconsistent design.`,
  },
  {
    id:"graphic_offer", type:"GRAPHIC", label:"💰 Offer / Promotion Graphic", platform:"All",
    estimatedDays:2, dimensions:"1080×1080 / 1:1 + 1080×1920",
    brief:`OBJECTIVE: Drive immediate action — purchase, signup, or inquiry.
TOV: Urgent, exciting, clear.
MUST INCLUDE: Offer % or amount, deadline, CTA button, logo.
HIERARCHY: 1) Offer → 2) What they get → 3) How to get it
COLOR: Use contrast — offer should pop on background.
TEXT: Arabic headline + English subtext (or vice versa based on audience).
DO: Countdown feel, scarcity language ("Limited time").
DON'T: Too many elements, hard-to-read fonts.`,
  },
  {
    id:"ugc_review", type:"REEL", label:"⭐ UGC / Testimonial Reel", platform:"Meta/TikTok",
    estimatedDays:3, dimensions:"1080×1920 / 9:16", duration:"15-45 sec",
    brief:`OBJECTIVE: Build social proof through authentic customer stories.
TOV: Genuine, conversational, relatable.
FORMAT: Real person talking to camera OR text overlay on lifestyle footage.
STRUCTURE:
- 0-5s: Who they are + brief intro
- 5-30s: Their problem and how brand solved it
- 30-45s: Results + recommendation
DO: Natural lighting, real environments, unscripted feel.
DON'T: Rehearsed scripts, studio look, obvious ads.
TEXT: Name + tagline overlay. No heavy graphics.`,
  },
  {
    id:"story_poll", type:"STORY", label:"📊 Interactive Story (Poll/Quiz)", platform:"Instagram",
    estimatedDays:1, dimensions:"1080×1920 / 9:16", duration:"24h",
    brief:`OBJECTIVE: Increase engagement + gather audience insights.
FORMAT: 3-slide story sequence.
Slide 1: Question / poll sticker
Slide 2: "If you answered X, here's why..."
Slide 3: CTA — DM for more info / link in bio
STICKER: Poll or emoji slider
TOV: Playful, conversational.
DO: Brand colors, swipe-up to story if over 10k followers.`,
  },
  {
    id:"reel_fb", type:"REEL", label:"🍔 F&B Reel Template", platform:"Meta/TikTok",
    estimatedDays:5, dimensions:"1080×1920 / 9:16", duration:"15-30 sec",
    brief:`OBJECTIVE: Make audience hungry and drive reservations/orders.
TOV: Mouth-watering, warm, inviting.
HOOK: Food reveal or chef's hands in action — NO talking heads first.
STRUCTURE:
- 0-3s: Close-up food shot (steam, pour, cut)
- 3-15s: Prep process or dish story
- 15-25s: Final presentation + people enjoying
- 25-30s: Restaurant location + booking CTA
MUST: Natural sound (sizzle, crunch, pour) — don't always use music.
LIGHTING: Warm, golden hour, appetizing.`,
  },
  {
    id:"reel_realestate", type:"REEL", label:"🏠 Real Estate Property Tour", platform:"Meta",
    estimatedDays:7, dimensions:"1080×1920 / 9:16", duration:"30-60 sec",
    brief:`OBJECTIVE: Showcase property and generate serious inquiries.
TOV: Premium, aspirational, trustworthy.
STRUCTURE:
- 0-5s: Exterior hero shot or best feature
- 5-30s: Room-by-room tour (key selling points)
- 30-50s: Lifestyle shots (pool, view, amenities)
- 50-60s: Price + CTA
DO: Stabilizer required, golden hour, drone if available.
DON'T: Shaky camera, cluttered spaces, no lights.
CALLOUTS: Sqm, bedrooms, key features as text overlay.`,
  },
  {
    id:"monthly_package", type:"BULK", label:"📦 Monthly Package (Auto-Generate)", platform:"All",
    estimatedDays:30, isPackage:true,
    taskList:[
      {type:"REEL",    count:4, title:"Monthly Reel"},
      {type:"GRAPHIC", count:8, title:"Monthly Graphic"},
      {type:"STORY",   count:4, title:"Monthly Story"},
      {type:"CAROUSEL",count:2, title:"Monthly Carousel"},
    ],
    brief:"Auto-generate all monthly content tasks for this client. Tasks will be created with smart deadlines spread across the month.",
  },
  {
    id:"graphic_quote", type:"GRAPHIC", label:"💬 Quote / Tip Graphic", platform:"Instagram",
    estimatedDays:1, dimensions:"1080×1080",
    brief:`OBJECTIVE: Inspire, educate, or entertain to drive saves/shares.
TOV: Match brand voice (inspire / educate / entertain).
FORMAT: Quote prominently placed, attribution below, logo small.
DO: High contrast, beautiful typography, minimal design.
DON'T: Long quotes (max 15 words), busy backgrounds.
CONTENT: Source quote from client's industry expertise or brand values.`,
  },
  {
    id:"reel_ecom", type:"REEL", label:"🛒 E-commerce Product Reel", platform:"Meta/TikTok",
    estimatedDays:4, dimensions:"1080×1920 / 9:16", duration:"10-20 sec",
    brief:`OBJECTIVE: Drive clicks to product page or direct purchase.
TOV: Trendy, aspirational, direct.
HOOK: Product being unboxed or used in real life.
STRUCTURE:
- 0-3s: Product in best light / unboxing
- 3-12s: 3 key benefits (quick problem→solution)
- 12-20s: Price, link in bio, shop now
TRENDING: Use trending audio, duet-friendly format.
TEXT: Keep to 3-5 words per card, big readable font.`,
  },
  {
    id:"story_cta", type:"STORY", label:"📣 Swipe-Up / Link CTA Story", platform:"Instagram",
    estimatedDays:1, dimensions:"1080×1920",
    brief:`OBJECTIVE: Drive traffic to link / landing page.
FORMAT: 2-slide sequence.
Slide 1: Teaser / problem agitation
Slide 2: Solution + swipe-up or link in bio CTA
DESIGN: Bold arrows pointing down, animated sticker.
COLOR: High contrast on CTA button.
TEXT: 5-7 words max per slide. Arabic + English.`,
  },
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  const filtered = type ? BRIEF_TEMPLATES.filter(t=>t.type===type||t.id===type) : BRIEF_TEMPLATES;

  return NextResponse.json({
    templates: filtered,
    types: [...new Set(BRIEF_TEMPLATES.map(t=>t.type))],
    count: BRIEF_TEMPLATES.length,
  });
}
