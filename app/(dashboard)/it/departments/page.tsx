export const runtime = 'nodejs';

import { requireRole } from "@/lib/auth";
import { getAllDepartments } from "@/services/department";
import DepartmentTable from "@/components/it/DepartmentTable";
import LocalizedEmptyState from "@/components/common/LocalizedEmptyState";
import LocalizedPageTitle from "@/components/common/LocalizedPageTitle";

export default async function ItDepartmentsPage() {
  await requireRole("IT");
  const departments = await getAllDepartments();

  return (
    <div className="max-w-350 mx-auto px-4 md:px-8">
      {departments.length === 0 ? (
        <>
          <div className="flex items-start justify-between gap-4 mb-6">
            <LocalizedPageTitle titleKey="manageDepts" subtitleKey="noDepts" />
          </div>
          <LocalizedEmptyState titleKey="emptyDepts" descriptionKey="emptyDeptsDesc" />
        </>
      ) : (
        <DepartmentTable departments={departments} />
      )}
    </div>
  );
}
