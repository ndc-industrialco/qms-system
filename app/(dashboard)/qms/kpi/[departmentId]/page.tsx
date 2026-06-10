import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import KpiDepartmentDetailClient from "@/components/kpi/KpiDepartmentDetailClient";
import { DepartmentService } from "@/services/departmentService";

export const metadata: Metadata = { title: "KPI Objectives" };

interface Props {
  params: Promise<{ departmentId: string }>;
}

const deptService = new DepartmentService();

export default async function KpiDepartmentPage({ params }: Props) {
  const { departmentId } = await params;
  const session = await auth();
  const role = (session?.user?.role ?? "USER") as "USER" | "IT" | "QMS" | "MR";

  // Resolve user's department name for USER-level access gating
  let userDepartmentName: string | null = null;
  if (session?.user?.departmentId) {
    const depts = await deptService.getActiveDepartments();
    userDepartmentName = depts.find(d => d.id === session.user.departmentId)?.name ?? null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiDepartmentDetailClient
        kpiId={departmentId}
        role={role}
        userId={session?.user?.id ?? null}
        userDepartmentName={userDepartmentName}
      />
    </div>
  );
}
