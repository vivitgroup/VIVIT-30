import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function MediaPage(){
 const session=await auth();
 if(!session?.user)redirect("/login");
 if(!["SUPER_ADMIN","MEDIA_BUYER","ACCOUNT_MANAGER"].includes(String(session.user.role||"")))redirect("/dashboard");
 redirect("/dashboard/media/control-center");
}
