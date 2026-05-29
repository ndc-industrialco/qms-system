import { requireRole } from "@/lib/auth";
import { DepartmentService } from "@/services/departmentService";
import DepartmentTable from "@/components/it/DepartmentTable";
import LocalizedEmptyState from "@/components/common/LocalizedEmptyState";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Departments",
};

const deptService = new DepartmentService();

export default async function ItDepartmentsPage() {
  await requireRole("IT");
  const departments = await deptService.getAllDepartments();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {departments.length === 0 ? (
        <>
          <PageHeader title="Manage Departments" subtitle="No departments yet" />
          <LocalizedEmptyState titleKey="emptyDepts" descriptionKey="emptyDeptsDesc" />
        </>
      ) : (
        <DepartmentTable departments={departments} />
      )}
    </div>
  );
}
