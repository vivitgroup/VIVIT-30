export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {db,users} from "@/lib/db";
import {and,eq,inArray} from "drizzle-orm";
import Link from "next/link";
import {NewClientForm} from "@/components/clients/NewClientForm";
export default async function NewClientPage(){const session=await auth();if(!session?.user)redirect("/login");const role=String((session.user as any).role);if(!["SUPER_ADMIN","ACCOUNT_MANAGER"].includes(role))redirect("/dashboard/clients");const team=await db.select({id:users.id,name:users.name,role:users.role}).from(users).where(and(eq(users.isActive,true),inArray(users.role,["ACCOUNT_MANAGER","MEDIA_BUYER"] as any)));return <div className="client-new-page"><div className="page-heading"><Link href="/dashboard/clients" className="back-link">←</Link><div><h1 className="page-title">New Client</h1><p className="page-subtitle">Create the client profile, assign the team, then add campaigns and tasks.</p></div></div><NewClientForm managers={team.filter(x=>x.role==="ACCOUNT_MANAGER")} buyers={team.filter(x=>x.role==="MEDIA_BUYER")} isAccountManager={role==="ACCOUNT_MANAGER"}/></div>}
