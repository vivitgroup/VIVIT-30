export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, financeRecords, clients, contacts } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const [record] = await db.select().from(financeRecords).where(eq(financeRecords.id, id));
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [client] = await db.select().from(clients).where(eq(clients.id, record.clientId));
  const [contact] = await db.select().from(contacts).where(and(eq(contacts.clientId, record.clientId), eq(contacts.isPrimary, true)));

  const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

  const invoiceData = {
    invoiceNumber: record.invoiceNumber ?? `INV-${record.year}-${String(record.month).padStart(2,"0")}-${client?.companyName?.slice(0,3).toUpperCase()}`,
    date: new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" }),
    dueDate: record.dueDate ? new Date(record.dueDate).toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" }) : "Upon receipt",
    period: `${MONTHS[record.month]} ${record.year}`,
    client: { name: client?.companyName ?? "Client", contact: contact?.name ?? "", email: contact?.email ?? "" },
    items: [
      { desc: "Monthly Retainer", amount: record.retainer },
      ...(record.mediaBuyingFee > 0 ? [{ desc: "Media Buying Management Fee (20%)", amount: record.mediaBuyingFee }] : []),
      ...(record.extraServices > 0 ? [{ desc: "Additional Services", amount: record.extraServices }] : []),
    ],
    subtotal: record.totalRevenue,
    paid: record.paid,
    outstanding: record.outstanding,
    status: record.outstanding === 0 ? "PAID" : "OUTSTANDING",
    notes: record.notes ?? "",
  };

  return NextResponse.json(invoiceData);
}
