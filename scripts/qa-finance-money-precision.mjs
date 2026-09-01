import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(root, "drizzle/20260901_finance_fixed_precision_candidate.sql");
if (!fs.existsSync(migrationPath)) {
  console.error("FAIL  finance fixed-precision candidate migration is missing");
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, "utf8");
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

check("Migration is explicitly non-production-auto-run", sql.includes("DO NOT auto-run on Production"));
check("Migration aborts when duplicate invoice periods exist", sql.includes("HAVING COUNT(*) > 1") && sql.includes("RAISE EXCEPTION"));
check("Finance records money uses numeric(18,2)", ["retainer","media_buying_fee","extra_services","total_revenue","paid","outstanding","commission_paid"].every(c => sql.includes(`ALTER COLUMN ${c} TYPE numeric(18,2)`)));
check("Company expenses use numeric(18,2)", sql.includes("ALTER TABLE company_expenses") && sql.includes("ALTER COLUMN amount TYPE numeric(18,2)"));
check("Payment records use numeric(18,2)", sql.includes("ALTER TABLE payment_records") && sql.includes("ALTER COLUMN amount TYPE numeric(18,2)"));
check("Client payment profile amounts use numeric(18,2)", sql.includes("ALTER TABLE client_payment_profiles") && ["amount_due","amount_paid","amount_remaining"].every(c => sql.includes(`ALTER COLUMN ${c} TYPE numeric(18,2)`)));
check("Client payment profile ratio uses numeric(9,4)", sql.includes("ALTER TABLE client_payment_profiles") && sql.includes("ALTER COLUMN payment_ratio TYPE numeric(9,4)"));
check("Payroll money uses numeric(18,2)", ["base_salary","bonus","deductions","net_pay"].every(c => sql.includes(`ALTER COLUMN ${c} TYPE numeric(18,2)`)));
check("Journal totals and lines use numeric(18,2)", ["total_debit","total_credit","debit","credit"].every(c => sql.includes(`ALTER COLUMN ${c} TYPE numeric(18,2)`)));
check("Accounts payable money uses numeric(18,2)", ["amount","tax","total"].every(c => sql.includes(`ALTER COLUMN ${c} TYPE numeric(18,2)`)) && sql.includes("ALTER TABLE purchase_orders"));
check("Expense claims use numeric(18,2)", sql.includes("ALTER TABLE expense_claims") && sql.includes("ALTER COLUMN amount TYPE numeric(18,2)"));
check("Project budgets use numeric(18,2)", sql.includes("ALTER COLUMN total_budget TYPE numeric(18,2)") && sql.includes("ALTER COLUMN spent_budget TYPE numeric(18,2)"));
check("Invoice period uniqueness is enforced", sql.includes("CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_records_workspace_client_period") && sql.includes("workspace_id, client_id, year, month"));
check("Migration contains no destructive DROP statements", !/\bDROP\b/i.test(sql));
check("Migration is transaction wrapped", sql.includes("BEGIN;") && sql.includes("COMMIT;"));

const failed = checks.filter(c => !c.ok);
for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} finance money-precision migration checks passed.`);
if (failed.length) process.exit(1);
