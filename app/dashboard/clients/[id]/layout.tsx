import type {ReactNode} from "react";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {db,clients} from "@/lib/db";
import {and,eq} from "drizzle-orm";
import {Role} from "@/lib/types";

export const dynamic="force-dynamic";

export default async function ClientDetailGuard({children,params}:{children:ReactNode;params:Promise<{id:string}>}){
  const session=await auth();
  if(!session?.user)redirect("/login");

  const role=(session.user as any).role as Role;
  const userId=String((session.user as any).id);
  if(![Role.SUPER_ADMIN,Role.ACCOUNT_MANAGER,Role.MEDIA_BUYER,Role.ACCOUNTANT].includes(role))redirect("/dashboard");

  const {id}=await params;
  const [client]=await db.select({
    id:clients.id,
    isActive:clients.isActive,
    accountManagerId:clients.accountManagerId,
    mediaBuyerId:clients.mediaBuyerId,
  }).from(clients).where(and(eq(clients.id,id),eq(clients.isActive,true))).limit(1);

  if(!client)redirect("/dashboard/clients");
  if(role===Role.ACCOUNT_MANAGER&&client.accountManagerId!==userId)redirect("/dashboard/clients");
  if(role===Role.MEDIA_BUYER&&client.mediaBuyerId!==userId)redirect("/dashboard/clients");

  return children;
}
