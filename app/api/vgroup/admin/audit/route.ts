import {NextResponse} from "next/server";
import {requireGroupSuperAdmin} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";

export async function GET(){
  await requireGroupSuperAdmin();
  const sql=getVGroupSql();
  const rows=await sql`
    select a.id::text,a.action,a.entity_type,a.entity_id::text,a.old_value,a.new_value,a.request_id,a.created_at,
           u.email as actor_email,bu.code as business_unit
    from vgroup.audit_logs a
    left join vgroup.users u on u.id=a.user_id
    left join vgroup.business_units bu on bu.id=a.business_unit_id
    order by a.created_at desc limit 200
  `;
  return NextResponse.json({audit:Array.from(rows)},{headers:{"Cache-Control":"private, no-store"}});
}
