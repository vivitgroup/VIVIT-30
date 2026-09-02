import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {getVGroupRuntimeConfig} from "@/lib/vgroup/env";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

const BUCKET="vgroup-hospitality";
const allowedReceipts=new Set(["image/jpeg","image/png","image/webp","application/pdf"]);
const ext=(type:string)=>type==="image/png"?"png":type==="image/webp"?"webp":type==="application/pdf"?"pdf":"jpg";
const headers=(key:string)=>({Authorization:`Bearer ${key}`,apikey:key});
const uuid=/^[0-9a-f-]{36}$/i;

async function signedUrl(objectPath:string){
  const config=getVGroupRuntimeConfig();
  const response=await fetch(`${config.supabaseUrl}/storage/v1/object/sign/${BUCKET}/${objectPath}`,{method:"POST",headers:{...headers(config.serviceKey),"Content-Type":"application/json"},body:JSON.stringify({expiresIn:3600}),cache:"no-store"});
  if(!response.ok)return null;
  const data=await response.json() as {signedURL?:string;signedUrl?:string};
  const value=data.signedURL??data.signedUrl;
  return value?`${config.supabaseUrl}/storage/v1${value}`:null;
}

export async function GET(request:Request){
  try{
    await requireApiPermission("hospitality","finance:view");
    const propertyId=new URL(request.url).searchParams.get("propertyId")?.trim()||null;
    if(propertyId&&!uuid.test(propertyId))return NextResponse.json({error:{code:"INVALID_PROPERTY",message:"Invalid property context"}},{status:400,headers:{"Cache-Control":"no-store"}});
    const sql=getVGroupSql();
    if(propertyId){
      const [property]=await sql`select id::text from hospitality.properties where id=${propertyId}::uuid and archived_at is null limit 1`;
      if(!property)return NextResponse.json({error:{code:"PROPERTY_NOT_FOUND",message:"Property not found"}},{status:404,headers:{"Cache-Control":"no-store"}});
    }
    const [expenses,properties,categories,vendors]=await Promise.all([
      propertyId
        ?sql`select i.id::text,i.property_id::text,p.name property_name,i.vendor_id::text,v.name vendor_name,i.expense_category_id::text,c.name category_name,i.invoice_number,i.invoice_type,i.currency,i.subtotal,i.tax,i.total,i.issued_at,i.due_at,i.status,i.notes,i.created_at,(select count(*)::int from hospitality.invoice_receipts r where r.invoice_id=i.id and r.archived_at is null) receipt_count from hospitality.invoices i join hospitality.properties p on p.id=i.property_id left join hospitality.vendors v on v.id=i.vendor_id left join hospitality.expense_categories c on c.id=i.expense_category_id where i.archived_at is null and i.property_id=${propertyId}::uuid order by i.issued_at desc,i.created_at desc limit 250`
        :sql`select i.id::text,i.property_id::text,p.name property_name,i.vendor_id::text,v.name vendor_name,i.expense_category_id::text,c.name category_name,i.invoice_number,i.invoice_type,i.currency,i.subtotal,i.tax,i.total,i.issued_at,i.due_at,i.status,i.notes,i.created_at,(select count(*)::int from hospitality.invoice_receipts r where r.invoice_id=i.id and r.archived_at is null) receipt_count from hospitality.invoices i join hospitality.properties p on p.id=i.property_id left join hospitality.vendors v on v.id=i.vendor_id left join hospitality.expense_categories c on c.id=i.expense_category_id where i.archived_at is null order by i.issued_at desc,i.created_at desc limit 250`,
      propertyId
        ?sql`select id::text,name from hospitality.properties where id=${propertyId}::uuid and archived_at is null order by name`
        :sql`select id::text,name from hospitality.properties where archived_at is null order by name`,
      sql`select id::text,name from hospitality.expense_categories where active order by name`,
      sql`select id::text,name from hospitality.vendors where archived_at is null order by name`,
    ]);
    return NextResponse.json({expenses:Array.from(expenses),properties:Array.from(properties),categories:Array.from(categories),vendors:Array.from(vendors),propertyContext:propertyId},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}

export async function POST(request:Request){
  try{
    const session=await requireApiPermission("hospitality","finance:create");
    const form=await request.formData();
    const propertyId=String(form.get("propertyId")??"");
    const categoryId=String(form.get("categoryId")??"");
    const vendorId=String(form.get("vendorId")??"");
    const invoiceNumber=String(form.get("invoiceNumber")??"").trim();
    const invoiceType=String(form.get("invoiceType")??"vendor_bill");
    const currency=String(form.get("currency")??"EGP").trim().toUpperCase();
    const subtotal=Number(form.get("subtotal")??0),tax=Number(form.get("tax")??0);
    const issuedAt=String(form.get("issuedAt")??"");
    const dueAt=String(form.get("dueAt")??"");
    const notes=String(form.get("notes")??"").trim();
    if(!uuid.test(propertyId))return NextResponse.json({error:{code:"PROPERTY_REQUIRED",message:"Every hospitality expense must be linked to a property"}},{status:400,headers:{"Cache-Control":"no-store"}});
    if(categoryId&&!uuid.test(categoryId))return NextResponse.json({error:{code:"INVALID_CATEGORY",message:"Invalid expense category"}},{status:400,headers:{"Cache-Control":"no-store"}});
    if(vendorId&&!uuid.test(vendorId))return NextResponse.json({error:{code:"INVALID_VENDOR",message:"Invalid vendor"}},{status:400,headers:{"Cache-Control":"no-store"}});
    if(!Number.isFinite(subtotal)||subtotal<0||!Number.isFinite(tax)||tax<0)return NextResponse.json({error:{code:"INVALID_AMOUNT",message:"Subtotal and tax must be valid non-negative numbers"}},{status:400,headers:{"Cache-Control":"no-store"}});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(issuedAt))return NextResponse.json({error:{code:"INVALID_DATE",message:"Issue date is required"}},{status:400,headers:{"Cache-Control":"no-store"}});
    const sql=getVGroupSql();
    const [property]=await sql`select p.id::text,p.business_unit_id::text,p.name from hospitality.properties p join vgroup.business_units bu on bu.id=p.business_unit_id where p.id=${propertyId}::uuid and p.archived_at is null and bu.code='hospitality' and bu.status='active' limit 1`;
    if(!property)return NextResponse.json({error:{code:"PROPERTY_NOT_FOUND",message:"Property not found"}},{status:404,headers:{"Cache-Control":"no-store"}});
    const total=subtotal+tax;
    const [invoice]=await sql`insert into hospitality.invoices(business_unit_id,property_id,vendor_id,expense_category_id,invoice_number,invoice_type,currency,subtotal,tax,total,issued_at,due_at,status,notes,created_by) values(${property.business_unit_id}::uuid,${propertyId}::uuid,${vendorId||null}::uuid,${categoryId||null}::uuid,${invoiceNumber||null},${invoiceType},${currency||"EGP"},${subtotal},${tax},${total},${issuedAt}::date,${dueAt||null}::date,'draft',${notes||null},${session.userId}::uuid) returning id::text,property_id::text,total,currency,status`;
    const file=form.get("receipt");
    let receipt:null|{id:string;file_name:string;url:string|null}=null;
    if(file instanceof File&&file.size>0){
      if(!allowedReceipts.has(file.type)||file.size>20*1024*1024){await sql`delete from hospitality.invoices where id=${invoice.id}::uuid`;return NextResponse.json({error:{code:"INVALID_RECEIPT",message:"Receipt must be JPG, PNG, WEBP or PDF up to 20MB"}},{status:400,headers:{"Cache-Control":"no-store"}})}
      const config=getVGroupRuntimeConfig();
      const objectPath=`expenses/${property.business_unit_id}/${propertyId}/${invoice.id}/${crypto.randomUUID()}.${ext(file.type)}`;
      const upload=await fetch(`${config.supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`,{method:"POST",headers:{...headers(config.serviceKey),"Content-Type":file.type,"x-upsert":"false"},body:Buffer.from(await file.arrayBuffer())});
      if(!upload.ok){await sql`delete from hospitality.invoices where id=${invoice.id}::uuid`;return NextResponse.json({error:{code:"RECEIPT_UPLOAD_FAILED",message:"Receipt upload failed"}},{status:502,headers:{"Cache-Control":"no-store"}})}
      try{
        const [row]=await sql`insert into hospitality.invoice_receipts(invoice_id,object_path,file_name,mime_type,byte_size,created_by) values(${invoice.id}::uuid,${objectPath},${file.name.slice(0,250)},${file.type},${file.size},${session.userId}::uuid) returning id::text,file_name`;
        receipt={...row,url:await signedUrl(objectPath)} as {id:string;file_name:string;url:string|null};
      }catch(error){await fetch(`${config.supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath}`,{method:"DELETE",headers:headers(config.serviceKey)}).catch(()=>undefined);await sql`delete from hospitality.invoices where id=${invoice.id}::uuid`;throw error}
    }
    await sql`insert into vgroup.audit_logs(business_unit_id,user_id,action,entity_type,entity_id,new_value) values(${property.business_unit_id}::uuid,${session.userId}::uuid,'hospitality.expense.create','hospitality_invoice',${invoice.id}::uuid,jsonb_build_object('property_id',${propertyId},'total',${total},'currency',${currency||"EGP"},'receipt_attached',${receipt!==null}))`;
    return NextResponse.json({expense:invoice,receipt},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
