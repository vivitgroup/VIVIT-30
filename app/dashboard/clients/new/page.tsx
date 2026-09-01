export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {db,users,clients,sql} from "@/lib/db";
import {and,eq} from "drizzle-orm";
import Link from "next/link";
import {NewClientForm} from "@/components/clients/NewClientForm";
import {effectiveRoles,hasEffectiveRole} from "@/lib/session-access";

type TeamRoleRow={id:string;name:string;role:string};

export default async function NewClientPage(){
  const session=await auth();
  if(!session?.user)redirect("/login");
  if(!hasEffectiveRole(session.user,["SUPER_ADMIN","ACCOUNT_MANAGER","ACCOUNTANT"]))redirect("/dashboard/clients");
  const workspaceId=String(session.user.workspaceId||"");
  if(!workspaceId)redirect("/login");
  const roles=effectiveRoles(session.user),primaryRole=String(session.user.role||"");
  const isSuper=roles.includes("SUPER_ADMIN"),isAccountManager=roles.includes("ACCOUNT_MANAGER")&&!isSuper,isAccountant=roles.includes("ACCOUNTANT")&&!isSuper&&!roles.includes("ACCOUNT_MANAGER");
  const [teamRows,portalUsers,linked]=await Promise.all([
    db.execute(sql`
      select distinct u.id,u.name,r.role
      from users u
      join lateral (
        select u.role::text as role
        union
        select ura.role::text as role from user_role_assignments ura where ura.user_id=u.id and ura.workspace_id=u.workspace_id
      ) r on true
      where u.is_active=true and u.workspace_id=${workspaceId} and r.role in ('ACCOUNT_MANAGER','MEDIA_BUYER')
      order by u.name asc
    `),
    db.select({id:users.id,name:users.name,email:users.email}).from(users).where(and(eq(users.workspaceId,workspaceId),eq(users.isActive,true),eq(users.role,"CLIENT"))),
    db.select({userId:clients.userId}).from(clients).where(eq(clients.workspaceId,workspaceId)),
  ]);
  const team=Array.from(teamRows) as TeamRoleRow[];
  const linkedIds=new Set(linked.map(x=>x.userId).filter(Boolean));
  return <div className="client-new-page"><div className="page-heading"><Link href="/dashboard/clients" className="back-link">←</Link><div><h1 className="page-title">New Client</h1><p className="page-subtitle">{isAccountant?"Create the commercial and billing profile. Marketing ownership is assigned by management.":"Create the client profile, assign its portal account, then add campaigns and tasks."}</p></div></div><NewClientForm managers={team.filter(x=>x.role==="ACCOUNT_MANAGER")} buyers={team.filter(x=>x.role==="MEDIA_BUYER")} portalUsers={portalUsers.filter(x=>!linkedIds.has(x.id))} isAccountManager={isAccountManager} isAccountant={isAccountant}/></div>;
}
