import { auth } from "@/lib/auth";
import KpiMonthlyClient from "@/components/kpi/KpiMonthlyClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Monthly KPI" };

export default async function KpiMonthlyPage() {
  const session = await auth();
  const role = session?.user?.role ?? "";
  const canApprove = ["QMS", "MR", "IT"].includes(role);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiMonthlyClient canApprove={canApprove} />
    </div>
  );
}
