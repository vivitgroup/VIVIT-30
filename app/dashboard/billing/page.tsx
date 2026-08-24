import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@/lib/types";
export const dynamic="force-dynamic";
export default async function BillingPage(){const session=await auth();if(!session?.user)redirect("/login");const role=(session.user as any).role as Role;if(role===Role.SUPER_ADMIN)redirect("/dashboard/settings#billing");redirect("/dashboard");}
