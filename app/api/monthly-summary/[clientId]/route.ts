export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, mediaMetrics, creativeTasks, financeRecords, calendarEvents, contacts } from "@/lib/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { canAccessClient } from "@/lib/client-access";

const MONTH_NAMES = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
const money=(n:number)=>new Intl.NumberFormat("en-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(Number(n||0));

export async function GET(req: NextRequest, context: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await context.params;
  if(!(await canAccessClient(session,clientId)))return NextResponse.json({error:"Forbidden"},{status:403});
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1),10);
  const year  = parseInt(searchParams.get("year")  ?? String(new Date().getFullYear()),10);
  if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<2020||year>2100){
    return NextResponse.json({error:"Invalid report period"},{status:400});
  }
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0,23,59,59,999);

  const [client, metrics, tasks, invoice, posts, primaryContact] = await Promise.all([
    db.select().from(clients).where(eq(clients.id, clientId)).then(r=>r[0]),
    db.select().from(mediaMetrics).where(and(eq(mediaMetrics.clientId, clientId), gte(mediaMetrics.date, monthStart), lte(mediaMetrics.date, monthEnd))),
    db.select().from(creativeTasks).where(and(eq(creativeTasks.clientId, clientId), gte(creativeTasks.createdAt, monthStart), lte(creativeTasks.createdAt,monthEnd))),
    db.select().from(financeRecords).where(and(eq(financeRecords.clientId, clientId), eq(financeRecords.month, month), eq(financeRecords.year, year))).then(r=>r[0]),
    db.select().from(calendarEvents).where(and(eq(calendarEvents.clientId, clientId), gte(calendarEvents.date, monthStart), lte(calendarEvents.date, monthEnd))),
    db.select().from(contacts).where(and(eq(contacts.clientId, clientId), eq(contacts.isPrimary, true))).then(r=>r[0]),
  ]);

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const spend  = metrics.reduce((s,m)=>s+Number(m.adSpend||0),0);
  const rev    = metrics.reduce((s,m)=>s+Number(m.revenue||0),0);
  const leads  = metrics.reduce((s,m)=>s+Number(m.leads||0),0);
  const purch  = metrics.reduce((s,m)=>s+Number(m.purchases||0),0);
  const roas   = spend>0?(rev/spend).toFixed(2):"0";
  const cpl    = leads>0?(spend/leads).toFixed(2):"0";
  const fee    = spend*0.2;

  const byPlatform = metrics.reduce((acc,m)=>{
    if(!acc[m.platform]) acc[m.platform]={spend:0,leads:0,revenue:0};
    acc[m.platform].spend+=Number(m.adSpend||0); acc[m.platform].leads+=Number(m.leads||0); acc[m.platform].revenue+=Number(m.revenue||0);
    return acc;
  }, {} as Record<string,{spend:number;leads:number;revenue:number}>);

  const done   = tasks.filter(t=>["APPROVED","COMPLETED"].includes(t.status));
  const posted = posts.filter(p=>p.status==="posted");

  const waText = `📊 *${client.companyName} — ${MONTH_NAMES[month]} ${year} Report*\n\n📣 *Media*\n💰 Spend: ${money(spend)}\n🎯 Leads: ${leads}\n📈 Revenue: ${money(rev)}\n🔄 ROAS: ${roas}x\n💵 CPL: ${money(Number(cpl))}\n${purch>0?`🛒 Purchases: ${purch}\n`:""}\n*By Platform:*\n${Object.entries(byPlatform).map(([p,d])=>`• ${p}: ${money(d.spend)} → ${d.leads} leads`).join("\n")}\n\n🎨 *Creative*\n✅ Completed: ${done.length}/${tasks.length}\n📅 Posted: ${posted.length}\n\n💳 *Finance*\n${invoice?`Total: ${money(invoice.totalRevenue)}\n${invoice.outstanding===0?"✅ PAID":"⏳ Outstanding: "+money(invoice.outstanding)}`:"No invoice yet"}\n\n_VIVIT GROUP — ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}_`;

  return NextResponse.json({
    client: { name: client.companyName, contact: primaryContact?.name, email: primaryContact?.email },
    period: { month, year, label: `${MONTH_NAMES[month]} ${year}` },
    media: { spend, rev, leads, purch, roas: parseFloat(roas), cpl: parseFloat(cpl), fee, byPlatform },
    creative: { total: tasks.length, completed: done.length, posted: posted.length },
    finance: invoice ? { total: invoice.totalRevenue, paid: invoice.paid, outstanding: invoice.outstanding } : null,
    whatsappText: waText,
  });
}
