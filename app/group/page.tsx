import {redirect} from "next/navigation";
import {requireVGroupSession} from "@/lib/vgroup/session";

export const dynamic="force-dynamic";

export default async function GroupHome(){
  await requireVGroupSession();
  redirect("/");
}
