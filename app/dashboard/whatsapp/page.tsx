import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import WhatsAppWorkspace from "@/components/whatsapp/WhatsAppWorkspace";
export const dynamic="force-dynamic";

const WHATSAPP_ROLES=["SUPER_ADMIN","ACCOUNT_MANAGER","MEDIA_BUYER","SALES"];

export default async function WhatsAppPage(){
  const session=await auth();
  if(!session?.user)redirect("/login");
  const role=String(session.user.role||"");
  if(!WHATSAPP_ROLES.includes(role))redirect("/dashboard");
  return <WhatsAppWorkspace/>;
}
