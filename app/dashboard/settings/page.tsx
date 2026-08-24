export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import PreferencePanel from "@/components/settings/PreferencePanel";
export default async function SettingsPage(){const session=await auth();if(!session?.user)redirect("/login");return <PreferencePanel/>;}
