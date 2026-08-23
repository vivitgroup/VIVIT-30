export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@/lib/types";
import { ReportsClient } from "@/components/reports/ReportsClient";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as Role;
  if (![Role.SUPER_ADMIN,Role.ACCOUNTANT,Role.ACCOUNT_MANAGER,Role.MEDIA_BUYER,Role.SALES].includes(role)) redirect("/dashboard");

  return (
    <div className="max-w-6xl space-y-4">
      <div>
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-subtitle">Build custom reports, export data, and analyze operational trends.</p>
      </div>
      <ReportsClient role={role} />
    </div>
  );
}