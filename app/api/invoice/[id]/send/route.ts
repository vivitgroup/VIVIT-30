export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { auditLogs, db, financeRecords } from "@/lib/db";

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = String(session.user.workspaceId || "").trim();
  const userId = String(session.user.id || "").trim();
  const role = String(session.user.role || "");
  if (!workspaceId || !userId) return NextResponse.json({ error: "Workspace unavailable" }, { status: 403 });
  if (role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only Super Admin can approve and send invoices." }, { status: 403 });

  const { id } = await context.params;
  const [invoice] = await db
    .select({ id: financeRecords.id, status: financeRecords.invoiceStatus })
    .from(financeRecords)
    .where(and(eq(financeRecords.id, id), eq(financeRecords.workspaceId, workspaceId)))
    .limit(1);

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft invoices can be approved and sent.", status: invoice.status }, { status: 409 });
  }

  const [updated] = await db
    .update(financeRecords)
    .set({ invoiceStatus: "SENT", updatedAt: new Date() })
    .where(and(eq(financeRecords.id, id), eq(financeRecords.workspaceId, workspaceId), eq(financeRecords.invoiceStatus, "DRAFT")))
    .returning({ id: financeRecords.id, status: financeRecords.invoiceStatus });

  if (!updated) return NextResponse.json({ error: "Invoice state changed. Refresh and try again." }, { status: 409 });

  await db.insert(auditLogs).values({
    workspaceId,
    userId,
    action: "invoice_approved_sent",
    entity: "FinanceRecord",
    entityId: id,
    oldValues: JSON.stringify({ invoiceStatus: "DRAFT" }),
    newValues: JSON.stringify({ invoiceStatus: "SENT" }),
  });

  return NextResponse.json({ success: true, invoice: updated }, { headers: { "Cache-Control": "private, no-store" } });
}
