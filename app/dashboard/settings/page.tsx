export const dynamic="force-dynamic";
import {auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {PreferencePanel} from "@/components/settings/PreferencePanel";
import {WorkspaceRegionalPanel} from "@/components/settings/WorkspaceRegionalPanel";
export default async function SettingsPage(){const session=await auth();if(!session?.user)redirect("/login");return <div style={{display:"grid",gap:14,minWidth:0}}><WorkspaceRegionalPanel/><PreferencePanel/></div>;}
