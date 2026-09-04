import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";
export async function GET(){try{await requireApiPermission("hospitality","inventory:view");const sql=getVGroupSql();const rows=await sql`select i.id::text,i.property_id::text,p.name property_name,i.sku,i.name,i.unit,i.quantity,i.reorder_level,i.unit_cost from hospitality.inventory_items i join hospitality.properties p on p.id=i.property_id where i.archived_at is null order by p.name,i.name`;return NextResponse.json({items:Array.from(rows)},{headers:{"Cache-Control":"private, no-store"}})}catch(e){return apiErrorResponse(e)}}
