import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import WhatsAppWorkspace from "@/components/whatsapp/WhatsAppWorkspace";

export const dynamic="force-dynamic";
export default async function WhatsAppPage(){const session=await auth();if(!session?.user)redirect("/login");const role=String((session.user as any).role||"");if(!["SUPER_ADMIN","ACCOUNT_MANAGER","SALES"].includes(role))redirect("/dashboard");return <WhatsAppWorkspace/>;}
