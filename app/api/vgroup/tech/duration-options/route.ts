import {NextResponse} from "next/server";
import {getVGroupSql} from "@/lib/vgroup/db";
import {apiErrorResponse,requireApiPermission} from "@/lib/vgroup/api-access";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    await requireApiPermission("tech","projects:view");
    const sql=getVGroupSql();
    const rows=await sql`
      select o.id::text,o.project_id::text,p.name project_name,o.label,o.duration_days,o.total_price,o.is_selected,o.valid_until,o.created_at
      from tech.duration_price_options o
      join tech.projects p on p.id=o.project_id and p.archived_at is null
      order by o.created_at desc limit 250
    `;
    return NextResponse.json({options:Array.from(rows)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return apiErrorResponse(error)}
}
