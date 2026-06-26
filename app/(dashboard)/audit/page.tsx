import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import AuditDashboardClient from "@/components/audit/AuditDashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ภาพรวมการตรวจสอบ - QMS" };

export default async function AuditDashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="ภาพรวมการตรวจสอบ"
        subtitle="Audit Dashboard"
      />
      <AuditDashboardClient />
    </div>
  );
}
