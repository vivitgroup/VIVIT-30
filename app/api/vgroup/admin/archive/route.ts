import {NextResponse} from "next/server";
import {requireGroupSuperAdmin} from "@/lib/vgroup/access";
import {getVGroupSql} from "@/lib/vgroup/db";

export const dynamic="force-dynamic";

export async function GET(){
  await requireGroupSuperAdmin();
  const sql=getVGroupSql();
  const [employees,properties,clients,workOrders]=await Promise.all([
    sql`select e.id::text,'employee' entity_type,u.full_name label,u.email subtitle,e.updated_at archived_at from vgroup.employees e join vgroup.users u on u.id=e.user_id where e.status='archived' order by e.updated_at desc limit 100`,
    sql`select p.id::text,'property' entity_type,p.name label,coalesce(p.city,'') subtitle,p.archived_at from hospitality.properties p where p.archived_at is not null order by p.archived_at desc limit 100`,
    sql`select c.id::text,'tech_client' entity_type,c.company_name label,coalesce(c.email,'') subtitle,c.archived_at from tech.clients c where c.archived_at is not null order by c.archived_at desc limit 100`,
    sql`select w.id::text,'work_order' entity_type,w.title label,coalesce(w.status,'') subtitle,w.archived_at from hospitality.work_orders w where w.archived_at is not null order by w.archived_at desc limit 100`,
  ]);
  return NextResponse.json({archive:[...Array.from(employees),...Array.from(properties),...Array.from(clients),...Array.from(workOrders)]},{headers:{"Cache-Control":"private, no-store"}});
}
