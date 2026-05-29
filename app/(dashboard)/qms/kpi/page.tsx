import { auth } from "@/lib/auth";
import KpiObjectivesClient from "@/components/kpi/KpiObjectivesClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "KPI" };

export default async function KpiObjectivesPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiObjectivesClient
        role={(session?.user?.role ?? "USER") as "USER" | "IT" | "QMS" | "MR"}
        userId={session?.user?.id ?? ""}
        userDepartmentId={session?.user?.departmentId}
      />
    </div>
  );
}
