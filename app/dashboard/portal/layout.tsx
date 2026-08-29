import type {ReactNode} from "react";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {db,clients} from "@/lib/db";
import {and,eq} from "drizzle-orm";
import {Role} from "@/lib/types";

export const dynamic="force-dynamic";

export default async function PortalGuard({children}:{children:ReactNode}){
  const session=await auth();
  if(!session?.user)redirect("/login");
  if(session.user.role!==Role.CLIENT)redirect("/dashboard");
  const userId=String(session.user.id);
  const [client]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.userId,userId),eq(clients.isActive,true))).limit(1);
  if(!client)redirect("/dashboard");
  return children;
}
