import type {ReactNode} from "react";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {Role} from "@/lib/types";

export const dynamic="force-dynamic";

export default async function TaskDetailGuard({children,params}:{children:ReactNode;params:Promise<{id:string}>}){
  const session=await auth();
  if(!session?.user)redirect("/login");
  const role=String(session.user.role) as Role;
  const userId=String(session.user.id);
  const {id}=await params;
  const rows=Array.from(await db.execute(sql`
    select t.id,t.client_id,t.assigned_to_id,c.account_manager_id,c.user_id as client_user_id,c.is_active as client_active
    from creative_tasks t
    left join clients c on c.id=t.client_id
    where t.id=${id} and t.archived_at is null
    limit 1
  `)) as any[];
  const task=rows[0];
  if(!task)redirect("/dashboard/creative");
  if(task.client_active===false)redirect("/dashboard/creative");
  const allowed=role===Role.SUPER_ADMIN||
    (role===Role.ACCOUNT_MANAGER&&task.account_manager_id===userId)||
    (role===Role.CREATOR&&task.assigned_to_id===userId)||
    (role===Role.CLIENT&&task.client_user_id===userId);
  if(!allowed)redirect("/dashboard");
  return children;
}
