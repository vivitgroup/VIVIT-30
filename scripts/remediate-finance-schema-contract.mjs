import fs from "node:fs";

const path = "db/schema.ts";
let source = fs.readFileSync(path, "utf8");

function updateTable(exportName, mutator) {
  const startToken = `export const ${exportName} = pgTable(`;
  const start = source.indexOf(startToken);
  if (start === -1) throw new Error(`Table ${exportName} not found`);
  const next = source.indexOf("export const ", start + startToken.length);
  const end = next === -1 ? source.length : next;
  const before = source.slice(0, start);
  const body = source.slice(start, end);
  const after = source.slice(end);
  const updated = mutator(body);
  source = before + updated + after;
}

function numericColumn(body, property, dbName, precision = 18, scale = 2, { nullable = false, defaultValue = "0" } = {}) {
  const realPattern = new RegExp(`${property}:\\s*real\\("${dbName}"\\)(\\.notNull\\(\\))?(\\.default\\([^)]*\\))?`);
  const numericPattern = new RegExp(`${property}:\\s*numeric\\("${dbName}",\\s*\\{[^}]*precision:\\s*${precision},\\s*scale:\\s*${scale}[^}]*\\}\\)(\\.notNull\\(\\))?(\\.default\\([^)]*\\))?`);
  const existing = body.match(realPattern) || body.match(numericPattern);
  if (!existing) throw new Error(`Expected finance numeric column ${property}/${dbName} not found`);
  let replacement = `${property}:     numeric("${dbName}", { precision: ${precision}, scale: ${scale}, mode: "number" })`;
  if (!nullable) replacement += `.notNull()`;
  if (defaultValue !== null) replacement += `.default(${JSON.stringify(defaultValue === "0" ? 0 : defaultValue)})`;
  return body.replace(existing[0], replacement);
}

function applyColumns(table, columns) {
  updateTable(table, body => {
    let next = body;
    for (const col of columns) next = numericColumn(next, ...col);
    return next;
  });
}

applyColumns("financeRecords", [
  ["retainer", "retainer"],
  ["mediaBuyingFee", "media_buying_fee"],
  ["extraServices", "extra_services"],
  ["totalRevenue", "total_revenue"],
  ["paid", "paid"],
  ["outstanding", "outstanding"],
  ["commissionRate", "commission_rate", 9, 4, { nullable: true, defaultValue: null }],
  ["commissionPaid", "commission_paid", 18, 2, { nullable: true, defaultValue: "0" }],
]);

if (!source.includes('unique("uq_finance_records_workspace_client_period")')) {
  updateTable("financeRecords", body => {
    const closingIndex = body.indexOf("\n});");
    if (closingIndex === -1) throw new Error("financeRecords closing marker not found");
    return `${body.slice(0, closingIndex)}\n}, t=>[unique("uq_finance_records_workspace_client_period").on(t.workspaceId,t.clientId,t.year,t.month)]);${body.slice(closingIndex + 4)}`;
  });
}

applyColumns("companyExpenses", [["amount", "amount", 18, 2, { nullable: false, defaultValue: null }]]);
applyColumns("paymentRecords", [["amount", "amount", 18, 2, { nullable: false, defaultValue: null }]]);
applyColumns("payroll", [
  ["baseSalary", "base_salary"],
  ["bonus", "bonus"],
  ["deductions", "deductions"],
  ["netPay", "net_pay"],
]);
applyColumns("chartOfAccounts", [["balance", "balance"]]);
applyColumns("journalEntries", [["totalDebit", "total_debit"], ["totalCredit", "total_credit"]]);
applyColumns("journalLines", [["debit", "debit"], ["credit", "credit"]]);
applyColumns("purchaseOrders", [["amount", "amount"], ["tax", "tax"], ["total", "total"]]);
applyColumns("expenseClaims", [["amount", "amount"]]);
applyColumns("projectBudgets", [["totalBudget", "total_budget"], ["spentBudget", "spent_budget"]]);

fs.writeFileSync(path, source);
console.log("Finance schema fixed-precision number-mode contract remediated.");
// Re-run marker: number-mode gate synchronized with schema contract.
