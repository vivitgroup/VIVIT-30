// @ts-nocheck -- Drizzle's generated recurring shapes are narrower than the live schema.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, financeRecords, recurringInvoices, notifications, users } from "@/lib/db";
import { eq, and } from "drizzle-orm";

// POST /api/recurring — Generate this month's invoices for all clients with recurring setup
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if(!["SUPER_ADMIN","ACCOUNTANT"].includes(String((session.user as any).role)))return NextResponse.json({error:"Forbidden"},{status:403});

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const generated: string[] = [];

  // Get all active clients with monthly retainer
  const activeClients = await db.select().from(clients).where(eq(clients.isActive, true));

  for (const client of activeClients) {
    if (client.monthlyRetainer <= 0) continue;

    // Check if invoice already exists for this month
    const existing = await db.select().from(financeRecords)
      .where(and(eq(financeRecords.clientId, client.id), eq(financeRecords.month, month), eq(financeRecords.year, year)));
    
    if (existing.length > 0) continue; // Already generated

    const retainer = client.monthlyRetainer;
    const total    = retainer; // Media fee added separately when metrics are entered
    const dueDate  = new Date(year, month - 1, 15); // Due on 15th

    const [record] = await db.insert(financeRecords).values({
      clientId: client.id,
      month, year, retainer,
      mediaBuyingFee: 0, extraServices: 0,
      totalRevenue: total, paid: 0, outstanding: total,
      invoiceStatus: "SENT",
      invoiceNumber: `INV-${year}-${String(month).padStart(2,"0")}-${client.companyName.replace(/\s/g,"").slice(0,4).toUpperCase()}`,
      dueDate,
    }).returning();

    // Notify admins
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "SUPER_ADMIN"));
    for (const admin of admins) {
      await db.insert(notifications).values({
        userId: admin.id, type: "GENERAL", priority: "normal",
        title: `🧾 Invoice generated: ${client.companyName}`,
        message: `Monthly retainer invoice of $${retainer.toLocaleString()} for ${month}/${year} created.`,
        link: `/dashboard/finance`,
      });
    }

    generated.push(client.companyName);
  }

  return NextResponse.json({
    success: true,
    generated: generated.length,
    clients: generated,
    month, year,
  });
}

// GET — Preview which clients would get invoices
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if(!["SUPER_ADMIN","ACCOUNTANT"].includes(String((session.user as any).role)))return NextResponse.json({error:"Forbidden"},{status:403});

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const activeClients = await db.select({ id:clients.id, companyName:clients.companyName, monthlyRetainer:clients.monthlyRetainer })
    .from(clients).where(eq(clients.isActive, true));

  const pending: typeof activeClients = [];
  for (const c of activeClients) {
    if (c.monthlyRetainer <= 0) continue;
    const existing = await db.select().from(financeRecords)
      .where(and(eq(financeRecords.clientId, c.id), eq(financeRecords.month, month), eq(financeRecords.year, year)));
    if (existing.length === 0) pending.push(c);
  }

  // Feature 12: Preview — show what will and won't be generated
  const preview = pending.map(c => ({
    clientId:    c.id,
    clientName:  c.companyName,
    retainer:    c.monthlyRetainer,
    willGenerate:true,
    alreadyDone: false,
    dueDate:     new Date(year, month, 5).toLocaleDateString("en-GB"),
  }));

  return NextResponse.json({
    pending, preview,
    count:       pending.length,
    month, year,
    totalAmount: pending.reduce((s,c)=>s+Number(c.monthlyRetainer||0),0),
    message:     `${pending.length} invoice(s) ready to generate for ${new Date(year,month-1,1).toLocaleDateString("en-US",{month:"long",year:"numeric"})}`,
  });
}
