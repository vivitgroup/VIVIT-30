type ExpenseRow={
  invoice_number:string|null;issued_at:string;category_name:string|null;vendor_name:string|null;
  invoice_type:string;currency:string;subtotal:number|string;tax:number|string;total:number|string;notes:string|null;receipt_count:number;
};

type ExpenseReportInput={propertyName:string;from:string;to:string;rows:ExpenseRow[]};

const GOLD="#D6AD5B";
const NAVY="#0C1B2A";
const esc=(value:unknown)=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const n=(value:number|string)=>Number(value||0);

export function buildHospitalityExpenseExcel(input:ExpenseReportInput){
  const total=input.rows.reduce((sum,row)=>sum+n(row.total),0);
  const rows=input.rows.map(row=>`<Row><Cell><Data ss:Type="String">${esc(row.issued_at)}</Data></Cell><Cell><Data ss:Type="String">${esc(row.invoice_number||"-")}</Data></Cell><Cell><Data ss:Type="String">${esc(row.category_name||"-")}</Data></Cell><Cell><Data ss:Type="String">${esc(row.vendor_name||"-")}</Data></Cell><Cell><Data ss:Type="String">${esc(row.invoice_type)}</Data></Cell><Cell><Data ss:Type="String">${esc(row.currency)}</Data></Cell><Cell><Data ss:Type="Number">${n(row.subtotal)}</Data></Cell><Cell><Data ss:Type="Number">${n(row.tax)}</Data></Cell><Cell><Data ss:Type="Number">${n(row.total)}</Data></Cell><Cell><Data ss:Type="Number">${row.receipt_count}</Data></Cell><Cell><Data ss:Type="String">${esc(row.notes||"")}</Data></Cell></Row>`).join("");
  return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Brand"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="${NAVY}" ss:Pattern="Solid"/></Style><Style ss:ID="Gold"><Font ss:Bold="1" ss:Color="${NAVY}"/><Interior ss:Color="${GOLD}" ss:Pattern="Solid"/></Style><Style ss:ID="Money"><NumberFormat ss:Format="#,##0.00"/></Style></Styles><Worksheet ss:Name="Property Expenses"><Table><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="120"/><Column ss:Width="120"/><Column ss:Width="90"/><Column ss:Width="60"/><Column ss:Width="90"/><Column ss:Width="70"/><Column ss:Width="90"/><Column ss:Width="70"/><Column ss:Width="180"/><Row ss:StyleID="Brand"><Cell ss:MergeAcross="10"><Data ss:Type="String">VIVIT HOSPITALITY</Data></Cell></Row><Row ss:StyleID="Gold"><Cell ss:MergeAcross="10"><Data ss:Type="String">PROPERTY EXPENSE STATEMENT — ${esc(input.propertyName)}</Data></Cell></Row><Row><Cell ss:MergeAcross="10"><Data ss:Type="String">Period: ${esc(input.from)} to ${esc(input.to)}</Data></Cell></Row><Row/><Row ss:StyleID="Brand"><Cell><Data ss:Type="String">Date</Data></Cell><Cell><Data ss:Type="String">Invoice #</Data></Cell><Cell><Data ss:Type="String">Category</Data></Cell><Cell><Data ss:Type="String">Vendor</Data></Cell><Cell><Data ss:Type="String">Type</Data></Cell><Cell><Data ss:Type="String">Currency</Data></Cell><Cell><Data ss:Type="String">Subtotal</Data></Cell><Cell><Data ss:Type="String">Tax</Data></Cell><Cell><Data ss:Type="String">Total</Data></Cell><Cell><Data ss:Type="String">Receipts</Data></Cell><Cell><Data ss:Type="String">Notes</Data></Cell></Row>${rows}<Row/><Row ss:StyleID="Gold"><Cell ss:MergeAcross="7"><Data ss:Type="String">TOTAL PROPERTY EXPENSES</Data></Cell><Cell><Data ss:Type="Number">${total}</Data></Cell></Row></Table></Worksheet></Workbook>`;
}

function pdfHex(value:string){return Buffer.from(`\ufeff${value}`,"utf16le").swap16().toString("hex").toUpperCase()}
function money(value:number|string){return n(value).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
function clip(value:string,max:number){return value.length>max?`${value.slice(0,max-1)}…`:value}

export function buildHospitalityExpensePdf(input:ExpenseReportInput){
  const lines:string[]=[];
  const total=input.rows.reduce((sum,row)=>sum+n(row.total),0);
  lines.push("VIVIT HOSPITALITY",`Property Expense Statement`,input.propertyName,`${input.from}  →  ${input.to}`,"");
  lines.push("DATE | INVOICE | CATEGORY | VENDOR | TOTAL | RECEIPT");
  for(const row of input.rows.slice(0,120))lines.push(`${row.issued_at} | ${clip(row.invoice_number||"-",14)} | ${clip(row.category_name||"-",18)} | ${clip(row.vendor_name||"-",18)} | ${row.currency} ${money(row.total)} | ${row.receipt_count?"YES":"NO"}`);
  lines.push("",`TOTAL PROPERTY EXPENSES: ${money(total)}`);
  const content=["q","0.047 0.106 0.165 rg","0 770 595 72 re f","0.839 0.678 0.357 rg","0 754 595 16 re f","Q","BT","/F1 18 Tf","1 1 1 rg","36 810 Td",`<${pdfHex(lines[0])}> Tj`,`0 -38 Td`,`/F1 14 Tf`,`0.047 0.106 0.165 rg`,...lines.slice(1).flatMap((line,index)=>[index===0?"0 -18 Td":"0 -15 Td",`<${pdfHex(line)}> Tj`]),"ET"].join("\n");
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type0 /BaseFont /ArialUnicodeMS /Encoding /Identity-H /DescendantFonts [5 0 R] >>",
    "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /ArialUnicodeMS /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 1000 >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf="%PDF-1.7\n";const offsets=[0];
  objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`});
  const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<offsets.length;i++)pdf+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;
  pdf+=`trailer << /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
