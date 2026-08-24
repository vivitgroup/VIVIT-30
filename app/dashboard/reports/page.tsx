import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsClient } from "@/components/reports/ReportsClient";
export const dynamic="force-dynamic";
export default async function ReportsPage(){const session=await auth();if(!session?.user)redirect("/login");const role=String((session.user as any).role||"");if(!["SUPER_ADMIN","ACCOUNTANT","ACCOUNT_MANAGER","MEDIA_BUYER","SALES"].includes(role))redirect("/dashboard");return <ReportsClient/>;}
