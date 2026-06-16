
import { requireAuth } from "@/lib/auth";
import { DepartmentService } from "@/services/departmentService";
import { DarService } from "@/services/darService";
import DarForm from "@/components/dar/DarForm";
import DarNewHeader from "@/components/dar/DarNewHeader";
import DarNoDepartment from "@/components/dar/DarNoDepartment";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Request",
};

const deptService = new DepartmentService();
const darService = new DarService();

export default async function DarNewPage() {
  const session = await requireAuth();
  const [departments, savedSig, tempId] = await Promise.all([
    deptService.getActiveDepartments(session.user.accessToken),
    darService.getSavedSignature(session.user.id),
    Promise.resolve("temp_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now()),
  ]);

  if (!session.user.departmentId && !session.user.authDepartmentId) {
    return <DarNoDepartment />;
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      <DarNewHeader />
      <DarForm
        mode="create"
        tempId={tempId}
        departments={departments}
        requesterInfo={{
          name: session.user.name ?? null,
          employeeId: session.user.employeeId ?? null,
          department: departments.find((d: { id: string; name: string }) => d.id === (session.user.authDepartmentId ?? session.user.departmentId ?? ""))?.name ?? null,
          requestDate: new Date().toISOString(),
        }}
        savedSignatureUrl={savedSig?.url ?? null}
        savedSignatureType={savedSig?.type ?? null}
      />
    </div>
  );
}
