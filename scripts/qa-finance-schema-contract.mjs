import fs from "node:fs";
import process from "node:process";

const schemaPath = "db/schema.ts";
const migrationPath = "drizzle/20260901_finance_fixed_precision_candidate.sql";

const schema = fs.readFileSync(schemaPath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");

const failures = [];
const passes = [];

function section(source, exportName, nextMarker = "export const ") {
  const startToken = `export const ${exportName} = pgTable(`;
  const start = source.indexOf(startToken);
  if (start === -1) return "";
  const next = source.indexOf(nextMarker, start + startToken.length);
  return source.slice(start, next === -1 ? source.length : next);
}

function requirePattern(label, source, pattern) {
  if (!pattern.test(source)) failures.push(`${label}: missing ${pattern}`);
  else passes.push(label);
}

function forbidPattern(label, source, pattern) {
  if (pattern.test(source)) failures.push(`${label}: forbidden ${pattern}`);
  else passes.push(label);
}

const moneyColumns = {
  financeRecords: [
    ["retainer", "18, 2"],
    ["mediaBuyingFee", "18, 2"],
    ["extraServices", "18, 2"],
    ["totalRevenue", "18, 2"],
    ["paid", "18, 2"],
    ["outstanding", "18, 2"],
    ["commissionPaid", "18, 2"],
  ],
  companyExpenses: [["amount", "18, 2"]],
  paymentRecords: [["amount", "18, 2"]],
  payroll: [
    ["baseSalary", "18, 2"],
    ["bonus", "18, 2"],
    ["deductions", "18, 2"],
    ["netPay", "18, 2"],
  ],
  chartOfAccounts: [["balance", "18, 2"]],
  journalEntries: [["totalDebit", "18, 2"], ["totalCredit", "18, 2"]],
  journalLines: [["debit", "18, 2"], ["credit", "18, 2"]],
  purchaseOrders: [["amount", "18, 2"], ["tax", "18, 2"], ["total", "18, 2"]],
  expenseClaims: [["amount", "18, 2"]],
  projectBudgets: [["totalBudget", "18, 2"], ["spentBudget", "18, 2"]],
};

for (const [table, columns] of Object.entries(moneyColumns)) {
  const body = section(schema, table);
  if (!body) {
    failures.push(`${table}: table definition not found`);
    continue;
  }
  for (const [column, precision] of columns) {
    const escaped = column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    forbidPattern(`${table}.${column} is not REAL`, body, new RegExp(`${escaped}\\s*:\\s*real\\(`));
    const [p, s] = precision.split(", ");
    requirePattern(
      `${table}.${column} is NUMERIC(${precision})`,
      body,
      new RegExp(`${escaped}\\s*:\\s*numeric\\([^)]*\\{\\s*precision:\\s*${p},\\s*scale:\\s*${s}\\s*\\}`),
    );
  }
}

const finance = section(schema, "financeRecords");
forbidPattern("financeRecords.commissionRate is not REAL", finance, /commissionRate\s*:\s*real\(/);
requirePattern(
  "financeRecords.commissionRate is NUMERIC(9,4)",
  finance,
  /commissionRate\s*:\s*numeric\([^)]*\{\s*precision:\s*9,\s*scale:\s*4\s*\}/,
);
requirePattern(
  "Drizzle invoice period unique contract",
  finance,
  /unique\("uq_finance_records_workspace_client_period"\)\.on\(t\.workspaceId,t\.clientId,t\.year,t\.month\)/,
);

requirePattern(
  "Migration invoice duplicate preflight",
  migration,
  /GROUP BY workspace_id, client_id, year, month[\s\S]*HAVING COUNT\(\*\) > 1/,
);
requirePattern(
  "Migration invoice period unique index",
  migration,
  /CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_records_workspace_client_period/,
);
requirePattern("Migration is transactional", migration, /BEGIN;[\s\S]*COMMIT;/);
requirePattern("Migration production warning", migration, /DO NOT auto-run on Production/i);

console.log(`Finance schema contract: ${passes.length} checks passed`);
if (failures.length) {
  console.error(`Finance schema contract: ${failures.length} checks failed`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("Finance schema contract: PASS");
// Exact-head certification trigger: keep this check coupled to schema remediation commits.
