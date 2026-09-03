import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {homeFor} from "@/lib/permissions";
import {Role} from "@/lib/types";

export const dynamic="force-dynamic";

export default async function RootPage(){
  const session=await auth();
  if(!session?.user)redirect("/login");
  const role=session.user.role as Role;
  if(role===Role.SUPER_ADMIN)redirect("/group");
  redirect(homeFor(role));
}
