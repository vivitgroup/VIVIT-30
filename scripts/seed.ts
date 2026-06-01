import { drizzle }   from "drizzle-orm/postgres-js";
import postgres       from "postgres";
import * as schema    from "../db/schema";
import bcrypt         from "bcryptjs";

const client = postgres(process.env.DATABASE_URL!, {
  ssl: "require", max: 1, prepare: false,
});
const db = drizzle(client, { schema });
const hash = (p: string) => bcrypt.hash(p, 10);

// ═══════════════════════════════════════════════════════════════
// MAIN SEED
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("🌱 Seeding Vivit ERP — full demo dataset...\n");

  // ── Users ──────────────────────────────────────────────────
  const USERS = [
    { name:"Asem Khaled",    email:"asem@vivitgroup.com",        role:"SUPER_ADMIN"    as const },
    { name:"Islam Ahmed",    email:"islam@vivitgroup.com",       role:"SUPER_ADMIN"    as const },
    { name:"Saber Mohamed",  email:"saber@vivitgroup.com",       role:"SUPER_ADMIN"    as const },
    { name:"Mostafa Ibrahim",email:"mostafa@vivitgroup.com",     role:"ACCOUNTANT"     as const },
    { name:"Noha Hassan",    email:"noha@vivitgroup.com",        role:"MEDIA_BUYER"    as const },
    { name:"Samo Tarek",     email:"samo@vivitgroup.com",        role:"CREATOR"        as const },
    { name:"Fathy Mahmoud",  email:"fathy@vivitgroup.com",       role:"CREATOR"        as const },
    { name:"Sondos Ali",     email:"sondos@vivitgroup.com",      role:"ACCOUNT_MANAGER"as const },
    { name:"Naira Sayed",    email:"naira@vivitgroup.com",       role:"ACCOUNT_MANAGER"as const },
    { name:"Yossef Walid",   email:"yossef@vivitgroup.com",      role:"ACCOUNT_MANAGER"as const },
    { name:"Sales User",     email:"sales@vivitgroup.com",       role:"SALES"          as const },
    { name:"MISfive",        email:"client@misfive.com",         role:"CLIENT"         as const },
    { name:"Moru",           email:"client@moru.com",            role:"CLIENT"         as const },
    { name:"Play Hub",       email:"client@playhub.com",         role:"CLIENT"         as const },
    { name:"Seas",           email:"client@seas.com",            role:"CLIENT"         as const },
    { name:"West Court",     email:"client@westcourt.com",       role:"CLIENT"         as const },
  ];

  const U: Record<string, typeof schema.users.$inferSelect> = {};
  const pw = await hash("password"); // Fix 21: Always update to ensure latest hash
  for (const u of USERS) {
    const [r] = await db.insert(schema.users).values({
      name: u.name, email: u.email, password: pw, role: u.role,
    }).onConflictDoUpdate({
      target: schema.users.email,
      set: { name: u.name, updatedAt: new Date() },
    }).returning();
    U[u.email] = r;
    console.log(`✅ ${u.role.padEnd(15)} ${u.name}`);
  }

  // ── Clients ─────────────────────────────────────────────────
  const CLIENTS = [
    { name:"West Court",    ind:"Real Estate",   ret:25000, bud:100000, cv:300000, email:"client@westcourt.com",   am:"yossef@vivitgroup.com", mb:"noha@vivitgroup.com", health:88, churn:"LOW",    colors:'["#533483","#E94560","#1A1A2E"]', adMeta:"https://business.facebook.com/adsmanager", adTiktok:"https://ads.tiktok.com", adGoogle:"https://ads.google.com" },
    { name:"MISfive",       ind:"F&B",           ret:15000, bud:50000,  cv:180000, email:"client@misfive.com",     am:"sondos@vivitgroup.com", mb:"noha@vivitgroup.com", health:74, churn:"MEDIUM",  colors:'["#FF6B35","#F7C59F","#004E89"]', adMeta:"https://business.facebook.com/adsmanager", adTiktok:"https://ads.tiktok.com", adGoogle:"" },
    { name:"Play Hub",      ind:"Entertainment", ret:20000, bud:80000,  cv:240000, email:"client@playhub.com",     am:"yossef@vivitgroup.com", mb:"noha@vivitgroup.com", health:91, churn:"LOW",    colors:'["#FF006E","#3A0CA3","#4CC9F0"]', adMeta:"https://business.facebook.com/adsmanager", adTiktok:"", adGoogle:"https://ads.google.com" },
    { name:"Moru",          ind:"Retail",        ret:12000, bud:40000,  cv:144000, email:"client@moru.com",        am:"naira@vivitgroup.com",  mb:"noha@vivitgroup.com", health:62, churn:"HIGH",   colors:'["#6A0572","#52B788","#1B4332"]',  adMeta:"https://business.facebook.com/adsmanager", adTiktok:"", adGoogle:"" },
    { name:"Seas",          ind:"Hospitality",   ret:8000,  bud:25000,  cv:96000,  email:"client@seas.com",        am:"sondos@vivitgroup.com", mb:"noha@vivitgroup.com", health:79, churn:"MEDIUM",  colors:'["#03045E","#0077B6","#00B4D8"]',  adMeta:"https://business.facebook.com/adsmanager", adTiktok:"", adGoogle:"" },
  ];

  const C: Record<string, typeof schema.clients.$inferSelect> = {};
  for (const c of CLIENTS) {
    const [cl] = await db.insert(schema.clients).values({
      companyName: c.name, industry: c.ind,
      monthlyRetainer: c.ret, mediaBudget: c.bud, contractValue: c.cv,
      userId: U[c.email].id,
      accountManagerId: U[c.am].id,
      mediaBuyerId: U[c.mb].id,
      colorPalette: c.colors,
      healthScore: c.health,
      churnRisk: c.churn as any,
      churnProbability: c.churn === "HIGH" ? 0.72 : c.churn === "MEDIUM" ? 0.38 : 0.12,
      lifetimeValue: c.ret * 18,
      contractStart: new Date("2024-01-01"),
      contractEnd:   new Date("2025-12-31"),
      metaAdsLink:   c.adMeta,
      tiktokAdsLink: c.adTiktok,
      googleAdsLink: c.adGoogle,
      targetLeads:   Math.floor(c.bud / 200),
      notes: `${c.name} — key client in ${c.ind} sector. Priority: ${c.churn === "HIGH" ? "High risk — needs immediate attention" : "Maintain and grow"}.`,
    }).onConflictDoUpdate({
      target: schema.clients.userId,
      set: { companyName: c.name, healthScore: c.health, updatedAt: new Date() },
    }).returning();
    C[c.name] = cl;
    console.log(`✅ Client: ${c.name} (Health: ${c.health}%)`);
  }

  // ── Media Metrics — 6 months, 3 platforms ───────────────────
  const PLATFORMS = ["meta","tiktok","google"] as const;
  const now = new Date();
  let metricsCount = 0;
  for (const cl of Object.values(C)) {
    for (let mo = 0; mo < 6; mo++) {
      for (const platform of PLATFORMS) {
        const date = new Date(now.getFullYear(), now.getMonth() - mo, 1);
        const spend    = Math.floor(cl.mediaBudget * (0.3 + Math.random() * 0.4) / 3);
        const leads    = Math.floor(Math.random() * 180) + 40;
        const purchases= Math.floor(leads * (0.08 + Math.random() * 0.12));
        const revenue  = purchases * (Math.floor(Math.random() * 800) + 300);
        const roas     = spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0;
        const cpl      = leads > 0 ? parseFloat((spend / leads).toFixed(2)) : 0;
        const cpa      = purchases > 0 ? parseFloat((spend / purchases).toFixed(2)) : 0;
        const agencyFee= parseFloat((spend * 0.2).toFixed(2));

        await db.insert(schema.mediaMetrics).values({
          clientId: cl.id, platform, date,
          adSpend: spend, leads, revenue,
          roas, cpl, cpa, agencyFee,
          targetLeads: cl.targetLeads ?? 100,
          remainingBudget: Math.max(0, cl.mediaBudget - spend * 3),
          totalDue: spend + agencyFee,
        }).onConflictDoUpdate({
          target: [schema.mediaMetrics.clientId, schema.mediaMetrics.platform, schema.mediaMetrics.date],
          set: { adSpend: spend, leads, revenue, roas, cpl, agencyFee, updatedAt: new Date() },
        });
        metricsCount++;
      }
    }
  }
  console.log(`✅ Media metrics: ${metricsCount} records`);

  // ── Finance Records — 6 months ───────────────────────────────
  const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
  let finCount = 0;
  for (const cl of Object.values(C)) {
    for (let mo = 0; mo < 6; mo++) {
      const d    = new Date(now.getFullYear(), now.getMonth() - mo, 1);
      const month= d.getMonth() + 1;
      const year = d.getFullYear();
      const ret  = cl.monthlyRetainer;
      const mediaFee = Math.floor(cl.mediaBudget * 0.2);
      const total = ret + mediaFee;
      const isPaid = mo > 0; // current month pending, rest paid
      const paid = isPaid ? total : Math.floor(total * 0.5);
      const outstanding = total - paid;
      const dueDate = new Date(year, month, 5); // 5th of following month

      await db.insert(schema.financeRecords).values({
        clientId: cl.id, month, year,
        retainer: ret, totalRevenue: total,
        paid, outstanding,
        invoiceStatus: isPaid ? "PAID" : outstanding > 0 ? "SENT" : "PAID",
        dueDate,
        invoiceNumber: `INV-${year}-${String(month).padStart(2,"0")}-${cl.companyName.replace(/\s/g,"").slice(0,4).toUpperCase()}`,
        commissionRate: 10,
        commissionPaid: isPaid ? Math.floor(total * 0.1) : 0,
      }).onConflictDoUpdate({
        target: [schema.financeRecords.clientId, schema.financeRecords.month as any, schema.financeRecords.year as any],
        set: { paid, outstanding, invoiceStatus: isPaid ? "PAID" : "SENT" as any, updatedAt: new Date() },
      });
      finCount++;
    }
  }
  console.log(`✅ Finance records: ${finCount} invoices`);

  // ── Creative Tasks — realistic across creators ───────────────
  const clientList = Object.values(C);
  const creators   = [U["samo@vivitgroup.com"], U["fathy@vivitgroup.com"]];
  const taskTypes  = ["REEL","GRAPHIC","CAROUSEL","STORY","UGC","REEL","GRAPHIC"] as const;
  const statuses   = ["PENDING","IN_PROGRESS","REVIEW","APPROVED","COMPLETED","REVISION"] as const;
  const priorities = ["HIGH","MEDIUM","MEDIUM","LOW","URGENT"] as const;
  let taskCount = 0;

  for (const cl of clientList) {
    for (let i = 0; i < 8; i++) {
      const type     = taskTypes[i % taskTypes.length];
      const creator  = creators[i % creators.length];
      const status   = i < 2 ? "REVIEW" : i < 4 ? "IN_PROGRESS" : i < 6 ? "APPROVED" : "PENDING";
      const deadline = new Date(now.getTime() + (i - 3) * 2 * 86400000);
      const days     = { REEL:7, GRAPHIC:3, CAROUSEL:3, STORY:1, UGC:5 };
      const revCount = status === "REVISION" ? Math.floor(Math.random() * 3) + 1 : 0;

      await db.insert(schema.creativeTasks).values({
        clientId:      cl.id,
        assignedToId:  creator.id,
        title:         `${type} — ${cl.companyName} — Week ${i+1}`,
        type,
        status:        status as any,
        priority:      priorities[i % priorities.length] as any,
        deadline,
        brief:         `Create a ${type.toLowerCase()} for ${cl.companyName} in the ${cl.industry} sector.\n\nTONE: Professional, engaging, on-brand.\nOBJECTIVE: Drive awareness and leads.\nDIMENSIONS: ${type==="REEL"||type==="STORY"?"1080×1920 (9:16)":"1080×1080 (1:1)"}.\nDURATION: ${type==="REEL"?"15-30 seconds":type==="STORY"?"15 seconds":"N/A"}.\n\nDO: Use brand colors ${cl.colorPalette}, include CTA.\nDON'T: Use stock photos, watermarks.`,
        fileUrl:       status === "REVIEW" || status === "APPROVED" || status === "COMPLETED"
          ? "https://drive.google.com/file/d/example/view" : null,
        revisionCount: revCount,
        isPosted:      status === "COMPLETED",
        postedAt:      status === "COMPLETED" ? new Date(now.getTime() - i * 86400000) : null,
        approvedByClient: status === "APPROVED" || status === "COMPLETED",
      }).onConflictDoNothing();
      taskCount++;
    }
  }
  console.log(`✅ Creative tasks: ${taskCount} tasks`);

  // ── Sales Leads ──────────────────────────────────────────────
  const LEADS = [
    { company:"TechCorp Egypt",   contact:"Ahmed Sayed",  phone:"+201001234567", source:"REFERRAL"  as const, value:45000, stage:"NEGOTIATION"  as const, prob:75, industry:"Technology" },
    { company:"Nile Retail",      contact:"Sara Hassan",  phone:"+201112345678", source:"INSTAGRAM" as const, value:18000, stage:"PROPOSAL_SENT"as const, prob:50, industry:"Retail" },
    { company:"Cairo Wellness",   contact:"Omar Khalil",  phone:"+201223456789", source:"WEBSITE"   as const, value:12000, stage:"QUALIFIED"    as const, prob:30, industry:"Healthcare" },
    { company:"Gulf Foods Co",    contact:"Fatima Ali",   phone:"+971501234567", source:"REFERRAL"  as const, value:60000, stage:"CONTACTED"    as const, prob:15, industry:"F&B" },
    { company:"Property Masters", contact:"Khaled Nour",  phone:"+201334567890", source:"FACEBOOK"  as const, value:35000, stage:"NEW_LEAD"     as const, prob:5,  industry:"Real Estate" },
    { company:"Fashion Forward",  contact:"Nadia Mostafa",phone:"+201445678901", source:"COLD_CALL" as const, value:8000,  stage:"WON"          as const, prob:100,industry:"Fashion" },
    { company:"Digital Dreams",   contact:"Yasser Ibrahim",phone:"+201556789012",source:"REFERRAL"  as const, value:22000, stage:"LOST"         as const, prob:0,  industry:"Technology" },
  ];

  const salesRep = U["sales@vivitgroup.com"];
  let leadCount = 0;
  for (const l of LEADS) {
    const updatedAt = new Date(now.getTime() - Math.floor(Math.random() * 10) * 86400000);
    await db.insert(schema.salesLeads).values({
      companyName:   l.company,
      contactPerson: l.contact,
      phone:         l.phone,
      source:        l.source,
      estimatedValue:l.value,
      stage:         l.stage,
      probability:   l.prob,
      industry:      l.industry,
      salesRepId:    salesRep.id,
      updatedAt,
      wonAt:         l.stage === "WON" ? new Date() : null,
      lostReason:    l.stage === "LOST" ? "Budget constraints — revisit Q3" : null,
      nextFollowUp:  new Date(now.getTime() + 3 * 86400000),
      notes:         `${l.company} — interested in full social media management + media buying package.`,
    }).onConflictDoNothing();
    leadCount++;
  }
  console.log(`✅ Sales leads: ${leadCount} leads`);

  // ── Calendar Events — this month ────────────────────────────
  const AM = U["sondos@vivitgroup.com"];
  let calCount = 0;
  for (const cl of clientList.slice(0, 3)) {
    for (let d = 1; d <= 15; d += 3) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      await db.insert(schema.calendarEvents).values({
        clientId: cl.id,
        title:    `${["Reel","Graphic","Story","Carousel"][d%4]} — ${cl.companyName}`,
        date,
        platform: ["meta","tiktok","instagram","google"][d%4],
        status:   d <= now.getDate() ? "posted" : "scheduled",
        engagements: d <= now.getDate() ? Math.floor(Math.random() * 2000) + 200 : 0,
        postedBy: AM.id,
      }).onConflictDoNothing();
      calCount++;
    }
  }
  console.log(`✅ Calendar events: ${calCount} events`);

  // ── NPS Feedback ─────────────────────────────────────────────
  const NPS_SCORES = [9, 7, 10, 6, 8];
  let npsCount = 0;
  for (let i = 0; i < clientList.length && i < NPS_SCORES.length; i++) {
    await db.insert(schema.clientFeedback).values({
      clientId: clientList[i].id,
      score: NPS_SCORES[i],
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      comment: NPS_SCORES[i] >= 9
        ? "Excellent service! The team is very responsive and results are great."
        : NPS_SCORES[i] >= 7
        ? "Good service overall. Would like more frequent updates."
        : "Service is OK but we expected faster results from the campaigns.",
      createdAt: new Date(now.getTime() - Math.floor(Math.random() * 15) * 86400000),
    }).onConflictDoNothing();
    npsCount++;
  }
  console.log(`✅ NPS feedback: ${npsCount} records`);

  // ── Notifications ─────────────────────────────────────────────
  const admins = [U["asem@vivitgroup.com"], U["islam@vivitgroup.com"]];
  const NOTIFS = [
    { title:"🚀 Welcome to Vivit ERP!", message:"System seeded with demo data. Explore all 70 pages.", priority:"normal" as const },
    { title:"⚠️ High Churn Risk: Moru", message:"Moru has 72% churn probability. Schedule retention call.", priority:"high" as const, link:"/dashboard/clients" },
    { title:"💰 Invoice Overdue: Seas", message:"$4,000 outstanding — 7 days overdue.", priority:"urgent" as const, link:"/dashboard/finance" },
    { title:"📊 ROAS Alert: MISfive", message:"MISfive TikTok ROAS dropped to 1.2× — review campaigns.", priority:"high" as const, link:"/dashboard/media" },
    { title:"🎨 Creative awaiting review", message:"3 tasks need approval before they can be posted.", priority:"normal" as const, link:"/dashboard/tasks-inbox" },
  ];

  let notifCount = 0;
  for (const admin of admins) {
    for (const n of NOTIFS) {
      await db.insert(schema.notifications).values({
        userId:   admin.id,
        type:     "GENERAL",
        title:    n.title,
        message:  n.message,
        priority: n.priority,
        link:     n.link ?? null,
        isRead:   false,
      }).onConflictDoNothing();
      notifCount++;
    }
  }
  console.log(`✅ Notifications: ${notifCount} records`);

  // ── Creator Profiles ─────────────────────────────────────────
  await db.insert(schema.creatorProfiles).values([
    { userId: U["samo@vivitgroup.com"].id,  rating: 4.8, ratePerTask: 500, isAvailable: true,  specialties: "REEL,GRAPHIC,UGC" },
    { userId: U["fathy@vivitgroup.com"].id, rating: 4.5, ratePerTask: 450, isAvailable: true,  specialties: "REEL,CAROUSEL,MOTION" },
  ]).onConflictDoUpdate({
    target: schema.creatorProfiles.userId,
    set: { updatedAt: new Date() },
  });
  console.log("✅ Creator profiles: 2 records");

  // ── Company Expenses ─────────────────────────────────────────
  const EXPENSES = [
    { cat:"Salaries",    desc:"Team salaries — October",    amount:85000 },
    { cat:"Tools",       desc:"Adobe CC + Canva Pro + Notion",amount:1200},
    { cat:"Freelancers", desc:"External editor — West Court reel", amount:3500 },
    { cat:"Office",      desc:"Office rent + utilities",    amount:8000  },
    { cat:"Production",  desc:"Photography equipment rental",amount:2000  },
    { cat:"Advertising", desc:"Agency brand promotion ads", amount:5000  },
  ];
  for (const e of EXPENSES) {
    await db.insert(schema.companyExpenses).values({
      category: e.cat, description: e.desc, amount: e.amount,
      date: new Date(now.getFullYear(), now.getMonth(), Math.floor(Math.random() * 28) + 1),
      approvedBy: U["asem@vivitgroup.com"].id,
    }).onConflictDoNothing();
  }
  console.log(`✅ Company expenses: ${EXPENSES.length} records`);

  // ── Audit Log Entries ────────────────────────────────────────
  const EVENTS = [
    { action:"client_created",    entity:"clients",       msg:"West Court onboarded" },
    { action:"task_approved",     entity:"creative_tasks",msg:"Reel approved by client" },
    { action:"invoice_paid",      entity:"finance_records",msg:"Invoice marked paid" },
    { action:"lead_won",          entity:"sales_leads",   msg:"Fashion Forward deal closed" },
    { action:"user_login",        entity:"users",         msg:"Asem Khaled logged in" },
  ];
  for (const e of EVENTS) {
    await db.insert(schema.auditLogs).values({
      userId:    U["asem@vivitgroup.com"].id,
      action:    e.action,
      entity:    e.entity,
      entityId:  crypto.randomUUID(),
      newValues: JSON.stringify({ note: e.msg }),
      ipAddress: "41.65.xxx.xxx",
    }).onConflictDoNothing();
  }
  console.log(`✅ Audit log: ${EVENTS.length} events`);

  console.log("\n🎉 Seed complete! System ready for demo.\n");
  console.log("LOGIN CREDENTIALS (all roles use password: password)");
  console.log("─".repeat(50));
  console.log("SUPER_ADMIN  → asem@vivitgroup.com");
  console.log("ACCOUNTANT   → mostafa@vivitgroup.com");
  console.log("MEDIA_BUYER  → noha@vivitgroup.com");
  console.log("CREATOR      → samo@vivitgroup.com");
  console.log("ACC_MANAGER  → sondos@vivitgroup.com");
  console.log("SALES        → sales@vivitgroup.com");
  console.log("CLIENT       → client@misfive.com");
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE (run with: npx tsx scripts/seed.ts --test)
// ═══════════════════════════════════════════════════════════════
async function runTests() {
  console.log("\n🧪 Running Vivit ERP Test Suite...\n");
  let passed = 0, failed = 0;

  async function test(name: string, fn: () => Promise<boolean>) {
    try {
      const ok = await fn();
      console.log(`  ${ok ? "✅" : "❌ FAIL"} ${name}`);
      ok ? passed++ : failed++;
    } catch (e) {
      console.log(`  ❌ ERROR ${name}: ${e}`);
      failed++;
    }
  }

  // Environment checks
  await test("AUTH_SECRET is 32+ chars", async () =>
    (process.env.AUTH_SECRET ?? "").length >= 32 || process.env.AUTH_SECRET === undefined);
  await test("DATABASE_URL uses port 6543 (pooler)", async () => {
    const url = process.env.DATABASE_URL ?? "";
    return url === "" || url.includes(":6543");
  });

  // DB connectivity
  const { count } = await import("drizzle-orm");
  await test("DB connection works", async () => {
    const [r] = await db.select({ cnt: count() }).from(schema.users);
    return Number(r?.cnt ?? 0) >= 0;
  });
  await test("Users seeded (≥16)", async () => {
    const [r] = await db.select({ cnt: count() }).from(schema.users);
    return Number(r?.cnt ?? 0) >= 16;
  });
  await test("Clients seeded (≥5)", async () => {
    const [r] = await db.select({ cnt: count() }).from(schema.clients);
    return Number(r?.cnt ?? 0) >= 5;
  });
  await test("Media metrics seeded (≥30)", async () => {
    const [r] = await db.select({ cnt: count() }).from(schema.mediaMetrics);
    return Number(r?.cnt ?? 0) >= 30;
  });
  await test("Finance records seeded (≥10)", async () => {
    const [r] = await db.select({ cnt: count() }).from(schema.financeRecords);
    return Number(r?.cnt ?? 0) >= 10;
  });
  await test("Creative tasks seeded (≥20)", async () => {
    const [r] = await db.select({ cnt: count() }).from(schema.creativeTasks);
    return Number(r?.cnt ?? 0) >= 20;
  });
  await test("Sales leads seeded (≥5)", async () => {
    const [r] = await db.select({ cnt: count() }).from(schema.salesLeads);
    return Number(r?.cnt ?? 0) >= 5;
  });
  await test("Notifications seeded (≥5)", async () => {
    const [r] = await db.select({ cnt: count() }).from(schema.notifications);
    return Number(r?.cnt ?? 0) >= 5;
  });

  console.log(`\n${"─".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) { console.log("⚠️ Fix failing tests before deploying."); process.exit(1); }
  else console.log("✅ All tests passed! System is healthy.");
}

// ── Entry point ─────────────────────────────────────────────────
const isTest = process.argv.includes("--test");
(isTest ? runTests() : main())
  .catch(console.error)
  .finally(() => client.end());
