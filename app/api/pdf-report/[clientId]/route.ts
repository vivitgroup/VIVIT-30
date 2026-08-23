export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, clients, financeRecords, mediaMetrics, contacts } from "@/lib/db";
import { eq, and, gte, lte, sum } from "drizzle-orm";
import { canAccessClient } from "@/lib/client-access";

export async function GET(req: NextRequest, context: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { clientId } = await context.params;
  if(!(await canAccessClient(session,clientId)))return new NextResponse("Forbidden",{status:403});
  const month = parseInt(req.nextUrl.searchParams.get("month") ?? String(new Date().getMonth() + 1),10);
  const year  = parseInt(req.nextUrl.searchParams.get("year")  ?? String(new Date().getFullYear()),10);
  if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<2020||year>2100) return new NextResponse("Invalid report period",{status:400});

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) return new NextResponse("Client not found", { status: 404 });

  const [invoice] = await db.select().from(financeRecords)
    .where(and(eq(financeRecords.clientId, clientId), eq(financeRecords.month, month), eq(financeRecords.year, year)));

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const [mAgg] = await db.select({
    spend: sum(mediaMetrics.adSpend), leads: sum(mediaMetrics.leads),
    revenue: sum(mediaMetrics.revenue), roas: sum(mediaMetrics.roas),
  }).from(mediaMetrics).where(and(eq(mediaMetrics.clientId, clientId), gte(mediaMetrics.date, monthStart), lte(mediaMetrics.date, monthEnd)));

  const [primaryContact] = await db.select().from(contacts)
    .where(and(eq(contacts.clientId, clientId), eq(contacts.isPrimary, true)));

  const spend   = Number(mAgg?.spend   ?? 0);
  const leads   = Number(mAgg?.leads   ?? 0);
  const revenue = Number(mAgg?.revenue ?? 0);
  const roas    = spend > 0 ? (revenue / spend).toFixed(2) : "—";
  const MONTHS  = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${client.companyName} — ${MONTHS[month]} ${year} Performance Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',sans-serif;color:#1A2A3A;background:#fff;font-size:13px;}
    .page{max-width:800px;margin:0 auto;padding:0;}
    .header{background:linear-gradient(135deg,#17345F,#244D87);color:white;padding:32px 40px;}
    .header h1{font-size:28px;font-weight:800;margin-bottom:4px;}
    .header p{opacity:0.85;font-size:14px;}
    .content{padding:32px 40px;}
    .client-info{display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #E8F0F8;}
    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;}
    .kpi-card{background:#F0F4F8;border-radius:12px;padding:16px;text-align:center;}
    .kpi-val{font-size:24px;font-weight:800;color:#244D87;margin-bottom:4px;}
    .kpi-label{font-size:11px;color:#6A8AA0;text-transform:uppercase;letter-spacing:0.05em;}
    .section{margin-bottom:24px;}
    .section h3{font-size:14px;font-weight:700;color:#17345F;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #D0DCE8;}
    table{width:100%;border-collapse:collapse;margin-top:8px;}
    th{background:#17345F;color:white;padding:10px 14px;text-align:left;font-size:12px;}
    td{padding:10px 14px;border-bottom:1px solid #E8F0F8;font-size:13px;}
    tr:nth-child(even) td{background:#F8FAFC;}
    .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;}
    .badge-green{background:#D1FAE5;color:#065F46;}
    .badge-amber{background:#FEF3C7;color:#92400E;}
    .badge-blue{background:#DBEAFE;color:#1E40AF;}
    .footer{background:#F0F4F8;padding:20px 40px;display:flex;justify-content:space-between;align-items:center;margin-top:40px;}
    .footer p{font-size:11px;color:#6A8AA0;}
    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .header{-webkit-print-color-adjust:exact;}
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <h1>${client.companyName}</h1>
        <p>${MONTHS[month]} ${year} — Performance Report</p>
        <p style="margin-top:8px;opacity:0.7;font-size:12px;">Generated: ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:22px;font-weight:800;letter-spacing:2px;">VIVIT GROUP</p>
      <p style="opacity:0.8;font-size:11px;">Digital Marketing Agency</p>
      <p style="opacity:0.7;font-size:10px;margin-top:4px;">Tax Reg: ${process.env.AGENCY_TAX_REG ?? "——"}</p>
      <p style="opacity:0.7;font-size:10px;">Comm. Reg: ${process.env.AGENCY_COMM_REG ?? "——"}</p>
      <p style="opacity:0.7;font-size:10px;">${process.env.AGENCY_ADDRESS ?? "Cairo, Egypt"}</p>
        <p style="opacity:0.8;font-size:11px;">MARKETING AGENCY ERP</p>
      </div>
    </div>
  </div>

  <div class="content">
    <div class="client-info">
      <div>
        <p style="font-weight:700;font-size:16px;">${client.companyName}</p>
        <p style="color:#6A8AA0;">${client.industry ?? "Digital Marketing"}</p>
        ${primaryContact ? `<p style="color:#6A8AA0;margin-top:4px;">${primaryContact.name} · ${primaryContact.email ?? ""}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <p style="font-weight:600;color:#244D87;">Health Score: ${Math.round(client.healthScore)}%</p>
        <span class="badge ${client.churnRisk==="LOW"?"badge-green":client.churnRisk==="MEDIUM"?"badge-amber":"badge-red"}">${client.churnRisk} Risk</span>
        <p style="color:#6A8AA0;margin-top:4px;font-size:11px;">LTV: ${(client.lifetimeValue??0).toLocaleString()} EGP</p>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-val">${spend.toLocaleString()} EGP</div><div class="kpi-label">Ad Spend</div></div>
      <div class="kpi-card"><div class="kpi-val">${leads}</div><div class="kpi-label">Leads</div></div>
      <div class="kpi-card"><div class="kpi-val">${roas}×</div><div class="kpi-label">ROAS</div></div>
      <div class="kpi-card"><div class="kpi-val">${revenue.toLocaleString()} EGP</div><div class="kpi-label">Revenue</div></div>
    </div>

    ${invoice ? `
    <div class="section">
      <h3>💰 Invoice Details</h3>
      <table>
        <tr><th>Item</th><th>Amount</th></tr>
        <tr><td>Monthly Retainer</td><td>${(invoice.retainer??0).toLocaleString()} EGP</td></tr>
        <tr><td>Total Invoice</td><td><strong>${(invoice.totalRevenue??0).toLocaleString()} EGP</strong></td></tr>
        <tr><td>Amount Paid</td><td style="color:#10b981;font-weight:600;">${(invoice.paid??0).toLocaleString()} EGP</td></tr>
        <tr><td>Outstanding</td><td style="color:${(invoice.outstanding??0)>0?"#ef4444":"#10b981"};font-weight:600;">${(invoice.outstanding??0).toLocaleString()} EGP</td></tr>
        <tr><td>Status</td><td><span class="badge ${invoice.invoiceStatus==="PAID"?"badge-green":"badge-amber"}">${invoice.invoiceStatus}</span></td></tr>
      </table>
    </div>` : ""}

    <div class="section">
      <h3>📊 Campaign Performance</h3>
      <table>
        <tr><th>Metric</th><th>This Month</th><th>Target</th><th>Status</th></tr>
        <tr><td>ROAS</td><td>${roas}×</td><td>3.0×</td><td><span class="badge ${parseFloat(roas)>=3?"badge-green":"badge-amber"}">${parseFloat(roas)>=3?"On Target":"Below Target"}</span></td></tr>
        <tr><td>CPL</td><td>${spend>0&&leads>0?`${(spend/leads).toFixed(0)} EGP`:"—"}</td><td>—</td><td>—</td></tr>
        <tr><td>Total Leads</td><td>${leads}</td><td>—</td><td><span class="badge badge-blue">In Progress</span></td></tr>
      </table>
    </div>

    <div style="margin-top:28px;padding:16px;background:#F0F8FF;border-left:4px solid #244D87;border-radius:4px;">
      <p style="font-weight:600;color:#17345F;margin-bottom:6px;">📌 Account Manager Notes</p>
      <p style="color:#4A6A8A;line-height:1.6;">Campaign performance is calculated from the connected media data for this reporting period.</p>
    </div>
  </div>

  <div class="footer">
    <p>VIVIT GROUP · ${new Date().getFullYear()} · Confidential</p>
    <p>Generated by Vivit ERP · ${new Date().toLocaleDateString()}</p>
    <p style="font-style:italic;">Technology builds the future, Marketing brings it to the world.</p>
  </div>
</div>
<script>
  // Auto-open print dialog for PDF generation
  window.onload = () => {
    document.title = '${client.companyName} — ${MONTHS[month]} ${year} Report';
    // Auto-show print dialog after 500ms
    setTimeout(() => {
      // Add print button
      const btn = document.createElement('button');
      btn.textContent = '🖨️ Print / Save as PDF';
      btn.style.cssText = 'position:fixed;top:16px;right:16px;padding:10px 20px;background:#244D87;color:white;border:none;border-radius:8px;cursor:pointer;font-family:Inter,sans-serif;font-size:14px;font-weight:600;z-index:999;box-shadow:0 4px 12px rgba(0,119,182,0.4)';
      btn.onclick = () => window.print();
      document.body.appendChild(btn);
    }, 300);
  };
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "no-store",
      "X-Report-Client": client.companyName,
      "X-Report-Period": `${MONTHS[month]} ${year}`,
    },
  });
}
