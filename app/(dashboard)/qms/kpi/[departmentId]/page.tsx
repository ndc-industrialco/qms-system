import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import KpiDepartmentDetailClient from "@/components/kpi/KpiDepartmentDetailClient";

export const metadata: Metadata = { title: "KPI Objectives" };

interface Props {
  params: Promise<{ departmentId: string }>;
}

export default async function KpiDepartmentPage({ params }: Props) {
  const { departmentId } = await params;
  const session = await auth();
  const role = (session?.user?.role ?? "USER") as "USER" | "IT" | "QMS" | "MR";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiDepartmentDetailClient
        kpiId={departmentId}
        role={role}
      />
    </div>
  );
}
