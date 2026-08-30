export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {db,clients,users} from "@/lib/db";
import {eq,and} from "drizzle-orm";
import {Role} from "@/lib/types";
import NewTaskForm from "@/components/creative/NewTaskForm";

export default async function NewTaskPage(){
 const session=await auth();if(!session?.user)redirect("/login");
 const role=session.user.role as Role,workspaceId=String(session.user.workspaceId||"");if(!workspaceId)redirect("/login?reason=workspace_missing");
 if(![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER].includes(role))redirect("/dashboard/creative");
 const userId=String(session.user.id||"");
 const [allClients,creators]=await Promise.all([
  db.select({id:clients.id,companyName:clients.companyName}).from(clients).where(role===Role.ACCOUNT_MANAGER?and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true),eq(clients.accountManagerId,userId)):and(eq(clients.workspaceId,workspaceId),eq(clients.isActive,true))).orderBy(clients.companyName),
  db.select({id:users.id,name:users.name}).from(users).where(and(eq(users.workspaceId,workspaceId),eq(users.role,"CREATOR"),eq(users.isActive,true))),
 ]);
 return <NewTaskForm clients={allClients} creators={creators}/>;
}
