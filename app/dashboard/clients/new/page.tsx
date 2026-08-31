export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {db,users,clients} from "@/lib/db";
import {and,eq,inArray} from "drizzle-orm";
import Link from "next/link";
import {NewClientForm} from "@/components/clients/NewClientForm";

export default async function NewClientPage(){
  const session=await auth();
  if(!session?.user)redirect("/login");
  const role=String(session.user.role),workspaceId=String(session.user.workspaceId||"");
  if(!workspaceId)redirect("/login?reason=workspace_missing");
  if(!["SUPER_ADMIN","ACCOUNT_MANAGER","ACCOUNTANT"].includes(role))redirect("/dashboard/clients");
  const [team,portalUsers,linked]=await Promise.all([
    db.select({id:users.id,name:users.name,role:users.role}).from(users).where(and(eq(users.workspaceId,workspaceId),eq(users.isActive,true),inArray(users.role,["ACCOUNT_MANAGER","MEDIA_BUYER"]))),
    db.select({id:users.id,name:users.name,email:users.email}).from(users).where(and(eq(users.workspaceId,workspaceId),eq(users.isActive,true),eq(users.approvalStatus,"APPROVED"),eq(users.role,"CLIENT"))),
    db.select({userId:clients.userId}).from(clients).where(eq(clients.workspaceId,workspaceId)),
  ]);
  const linkedIds=new Set(linked.map(x=>x.userId).filter(Boolean));
  const subtitle=role==="ACCOUNTANT"?"Create the commercial and billing profile. Marketing ownership is assigned by management.":"Create the client profile, assign its portal account, then add campaigns and tasks.";
  return <div className="client-new-page"><div className="page-heading"><Link href="/dashboard/clients" className="back-link">←</Link><div><h1 className="page-title">New Client</h1><p className="page-subtitle">{subtitle}</p></div></div><NewClientForm managers={team.filter(x=>x.role==="ACCOUNT_MANAGER")} buyers={team.filter(x=>x.role==="MEDIA_BUYER")} portalUsers={portalUsers.filter(x=>!linkedIds.has(x.id))} isAccountManager={role==="ACCOUNT_MANAGER"} isMediaBuyer={role==="MEDIA_BUYER"} isAccountant={role==="ACCOUNTANT"}/></div>;
}
