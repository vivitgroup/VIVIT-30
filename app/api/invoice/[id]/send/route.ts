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
  const result = await db.transaction(async (tx) => {
    const [invoice] = await tx
      .select({ id: financeRecords.id, status: financeRecords.invoiceStatus })
      .from(financeRecords)
      .where(and(eq(financeRecords.id, id), eq(financeRecords.workspaceId, workspaceId)))
      .limit(1);

    if (!invoice) return { kind: "missing" as const };
    if (invoice.status !== "DRAFT") return { kind: "invalid" as const, status: invoice.status };

    const [updated] = await tx
      .update(financeRecords)
      .set({ invoiceStatus: "SENT", updatedAt: new Date() })
      .where(and(eq(financeRecords.id, id), eq(financeRecords.workspaceId, workspaceId), eq(financeRecords.invoiceStatus, "DRAFT")))
      .returning({ id: financeRecords.id, status: financeRecords.invoiceStatus });

    if (!updated) return { kind: "changed" as const };

    await tx.insert(auditLogs).values({
      workspaceId,
      userId,
      action: "invoice_approved_sent",
      entity: "FinanceRecord",
      entityId: id,
      oldValues: JSON.stringify({ invoiceStatus: "DRAFT" }),
      newValues: JSON.stringify({ invoiceStatus: "SENT" }),
    });

    return { kind: "ok" as const, invoice: updated };
  });

  if (result.kind === "missing") return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (result.kind === "invalid") return NextResponse.json({ error: "Only draft invoices can be approved and sent.", status: result.status }, { status: 409 });
  if (result.kind === "changed") return NextResponse.json({ error: "Invoice state changed. Refresh and try again." }, { status: 409 });
  return NextResponse.json({ success: true, invoice: result.invoice }, { headers: { "Cache-Control": "private, no-store" } });
}
