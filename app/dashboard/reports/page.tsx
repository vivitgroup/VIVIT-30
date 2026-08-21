export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@/lib/types";
import { ReportsClient } from "@/components/reports/ReportsClient";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (role === Role.CREATOR || role === Role.CLIENT) redirect("/dashboard");

  return (
    <div className="max-w-6xl space-y-5 animate-fade-up">
      <div>
        <h1 className="page-title">📈 Reports & Analytics</h1>
        <p className="text-muted text-sm mt-0.5">Build custom reports, export data, analyze trends</p>
      </div>
      <ReportsClient />
    </div>
  );
}
