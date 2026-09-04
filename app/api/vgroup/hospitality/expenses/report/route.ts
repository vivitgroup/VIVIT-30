import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
import {buildHospitalityExpenseExcel,buildHospitalityExpensePdf} from "@/lib/vgroup/hospitality-expense-report";
import {getHospitalityOwnerScope,ownerCanAccessProperty} from "@/lib/vgroup/hospitality-owner-scope";

const uuid=/^[0-9a-f-]{36}$/i;
const date=/^\d{4}-\d{2}-\d{2}$/;
const safe=(v:string)=>v.replace(/[^a-z0-9-_]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,80)||"property";

export async function GET(request:Request){
  try{
    const session=await requireApiPermission("hospitality","finance:export");
    const url=new URL(request.url);
    const propertyId=url.searchParams.get("propertyId")??"";
    const from=url.searchParams.get("from")??"";
    const to=url.searchParams.get("to")??"";
    const format=(url.searchParams.get("format")??"xls").toLowerCase();
    if(!uuid.test(propertyId)||!date.test(from)||!date.test(to)||from>to)return NextResponse.json({error:{code:"INVALID_REPORT_FILTER",message:"Valid property, from and to dates are required"}},{status:400,headers:{"Cache-Control":"no-store"}});
    if(!["xls","pdf"].includes(format))return NextResponse.json({error:{code:"INVALID_REPORT_FORMAT",message:"Use xls or pdf"}},{status:400,headers:{"Cache-Control":"no-store"}});
    const ownerScope=await getHospitalityOwnerScope(session);
    if(!ownerCanAccessProperty(ownerScope,propertyId))return NextResponse.json({error:{code:"PROPERTY_NOT_FOUND",message:"Property not found"}},{status:404,headers:{"Cache-Control":"no-store"}});
    const sql=getVGroupSql();
    const [property]=await sql`select p.id::text,p.name from hospitality.properties p join vgroup.business_units bu on bu.id=p.business_unit_id where p.id=${propertyId}::uuid and p.archived_at is null and bu.code='hospitality' and bu.status='active' limit 1`;
    if(!property)return NextResponse.json({error:{code:"PROPERTY_NOT_FOUND",message:"Property not found"}},{status:404,headers:{"Cache-Control":"no-store"}});
    const rows=await sql`select i.invoice_number,i.issued_at::text,c.name category_name,v.name vendor_name,i.invoice_type,i.currency,i.subtotal,i.tax,i.total,i.notes,(select count(*)::int from hospitality.invoice_receipts r where r.invoice_id=i.id and r.archived_at is null) receipt_count from hospitality.invoices i left join hospitality.expense_categories c on c.id=i.expense_category_id left join hospitality.vendors v on v.id=i.vendor_id where i.property_id=${propertyId}::uuid and i.archived_at is null and i.issued_at between ${from}::date and ${to}::date order by i.issued_at,i.created_at`;
    const input={propertyName:String(property.name),from,to,rows:Array.from(rows) as never[]};
    const filename=`Vivit-Hospitality-${safe(String(property.name))}-Expenses-${from}-to-${to}`;
    if(format==="pdf"){
      const body=buildHospitalityExpensePdf(input);
      return new NextResponse(body,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${filename}.pdf"`,"Cache-Control":"private, no-store"}});
    }
    const body=buildHospitalityExpenseExcel(input);
    return new NextResponse(body,{headers:{"Content-Type":"application/vnd.ms-excel; charset=utf-8","Content-Disposition":`attachment; filename="${filename}.xls"`,"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
