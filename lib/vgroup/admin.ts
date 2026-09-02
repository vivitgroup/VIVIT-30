import {getVGroupSql} from "@/lib/vgroup/db";

export async function listEmployees(){
  const sql=getVGroupSql();
  return sql<Record<string,unknown>[]>`
    select e.id::text,e.job_title,e.hire_date,e.status,u.id::text as user_id,u.email,u.full_name,
           bu.code as business_unit,
           coalesce(array_agg(distinct r.code) filter (where r.id is not null),'{}') as roles
    from vgroup.employees e
    join vgroup.users u on u.id=e.user_id
    join vgroup.business_units bu on bu.id=e.business_unit_id
    left join vgroup.user_business_unit_roles ubr on ubr.user_id=u.id and ubr.business_unit_id=bu.id
    left join vgroup.roles r on r.id=ubr.role_id
    group by e.id,u.id,bu.code
    order by u.full_name asc
  `;
}

export async function setEmployeeStatus(employeeId:string,status:"active"|"suspended"|"archived",actorId:string){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select (vgroup.set_employee_status(${employeeId}::uuid,${status},${actorId}::uuid)).*`;
  return row;
}

export async function restoreEmployee(employeeId:string,actorId:string){
  const sql=getVGroupSql();
  const [row]=await sql<Record<string,unknown>[]>`select (vgroup.restore_employee(${employeeId}::uuid,${actorId}::uuid)).*`;
  return row;
}

export async function listNotifications(userId:string){
  const sql=getVGroupSql();
  return sql<Record<string,unknown>[]>`
    select n.id::text,n.type,n.title,n.body,n.channel,n.is_read,n.created_at,bu.code as business_unit
    from vgroup.notifications n left join vgroup.business_units bu on bu.id=n.business_unit_id
    where n.user_id=${userId}::uuid
    order by n.created_at desc limit 100
  `;
}
