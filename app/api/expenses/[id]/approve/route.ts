export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { auditLogs, companyExpenses, db, sql } from "@/lib/db";

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = String(session.user.workspaceId || "").trim();
  const userId = String(session.user.id || "").trim();
  const role = String(session.user.role || "");
  if (!workspaceId || !userId) return NextResponse.json({ error: "Workspace unavailable" }, { status: 403 });
  if (role !== "SUPER_ADMIN") return NextResponse.json({ error: "Only Super Admin can approve expenses." }, { status: 403 });

  const { id } = await context.params;
  const result = await db.transaction(async (tx) => {
    const [expense] = await tx
      .select({ id: companyExpenses.id, approvedBy: companyExpenses.approvedBy })
      .from(companyExpenses)
      .where(and(eq(companyExpenses.id, id), eq(companyExpenses.workspaceId, workspaceId)))
      .limit(1);

    if (!expense) return { kind: "missing" as const };
    if (expense.approvedBy) return { kind: "already" as const, approvedBy: expense.approvedBy };

    const [updated] = await tx
      .update(companyExpenses)
      .set({ approvedBy: userId })
      .where(and(eq(companyExpenses.id, id), eq(companyExpenses.workspaceId, workspaceId), isNull(companyExpenses.approvedBy)))
      .returning({ id: companyExpenses.id, approvedBy: companyExpenses.approvedBy });

    if (!updated) return { kind: "changed" as const };

    await tx.execute(sql`
      update financial_ledger_entries
      set approved_by=${userId}
      where workspace_id=${workspaceId}
        and source_sheet='ERP Manual Expense'
        and source_ref=${id}
    `);

    await tx.insert(auditLogs).values({
      workspaceId,
      userId,
      action: "expense_approved",
      entity: "CompanyExpense",
      entityId: id,
      oldValues: JSON.stringify({ approvedBy: null }),
      newValues: JSON.stringify({ approvedBy: userId }),
    });

    return { kind: "ok" as const, expense: updated };
  });

  if (result.kind === "missing") return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  if (result.kind === "already") return NextResponse.json({ error: "Expense is already approved." }, { status: 409 });
  if (result.kind === "changed") return NextResponse.json({ error: "Expense state changed. Refresh and try again." }, { status: 409 });
  return NextResponse.json({ success: true, expense: result.expense }, { headers: { "Cache-Control": "private, no-store" } });
}
