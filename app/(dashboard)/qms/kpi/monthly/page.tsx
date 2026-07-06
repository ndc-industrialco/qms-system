import { requireAuth } from "@/lib/auth";
import KpiMonthlyClient from "@/components/kpi/KpiMonthlyClient";
import type { Metadata } from "next";

import { getDocNoFormat } from "@/lib/docNoConfig";

export const metadata: Metadata = { title: "Monthly KPI" };

export default async function KpiMonthlyPage() {
  const [session, kpiMonthlyFormStr] = await Promise.all([
    requireAuth(),
    getDocNoFormat("KPI_MONTHLY_FORM"),
  ]);
  const monthlyFormDocName = kpiMonthlyFormStr || "FM-KPI-01 Rev.00";
  const role = (session?.user?.role ?? "USER") as "USER" | "IT" | "QMS" | "MR";
  const userId = session?.user?.id ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiMonthlyClient userRole={role} userId={userId} monthlyFormDocName={monthlyFormDocName} />
    </div>
  );
}
