import type {ReactNode} from "react";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {db,sql} from "@/lib/db";
import {Role} from "@/lib/types";

type TaskGuardRow={
  id:string;
  client_id:string;
  assigned_to_id?:string|null;
  account_manager_id?:string|null;
  media_buyer_id?:string|null;
  client_user_id?:string|null;
  client_active?:boolean|null;
};

export const dynamic="force-dynamic";

export default async function TaskDetailGuard({children,params}:{children:ReactNode;params:Promise<{id:string}>}){
  const session=await auth();
  if(!session?.user)redirect("/login");

  const role=String(session.user.role) as Role;
  const userId=String(session.user.id||"");
  const workspaceId=String(session.user.workspaceId||"");
  if(!userId||!workspaceId)redirect("/login");

  const {id}=await params;
  const rows=Array.from(await db.execute(sql`
    select
      t.id,
      t.client_id,
      t.assigned_to_id,
      c.account_manager_id,
      c.media_buyer_id,
      c.user_id as client_user_id,
      c.is_active as client_active
    from creative_tasks t
    left join clients c
      on c.id=t.client_id
      and c.workspace_id=${workspaceId}
    where t.id=${id}
      and t.workspace_id=${workspaceId}
      and t.archived_at is null
      and t.deleted_at is null
    limit 1
  `)) as TaskGuardRow[];

  const task=rows[0];
  const fallback=role===Role.CLIENT?"/dashboard/portal":"/dashboard/creative";
  if(!task)redirect(fallback);
  if(task.client_active===false||task.client_active==null)redirect(fallback);

  const allowed=role===Role.SUPER_ADMIN
    ||(role===Role.ACCOUNT_MANAGER&&task.account_manager_id===userId)
    ||(role===Role.MEDIA_BUYER&&task.media_buyer_id===userId)
    ||(role===Role.CREATOR&&task.assigned_to_id===userId)
    ||(role===Role.CLIENT&&task.client_user_id===userId);

  if(!allowed)redirect("/dashboard");
  return children;
}
