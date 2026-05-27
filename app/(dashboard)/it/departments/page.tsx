import { requireRole } from "@/lib/auth";
import { getAllDepartments } from "@/services/department";
import DepartmentTable from "@/components/it/DepartmentTable";
import LocalizedEmptyState from "@/components/common/LocalizedEmptyState";
import PageHeader from "@/components/common/PageHeader";

export default async function ItDepartmentsPage() {
  await requireRole("IT");
  const departments = await getAllDepartments();

  return (
    <div className="max-w-350 mx-auto px-4 md:px-8">
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
