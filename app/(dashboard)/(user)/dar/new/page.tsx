export const runtime = 'nodejs';

import { requireAuth } from "@/lib/auth";
import { getActiveDepartments } from "@/services/department";
import DarForm from "@/components/dar/DarForm";
import DarNewHeader from "@/components/dar/DarNewHeader";
import Link from "next/link";

export default async function DarNewPage() {
  const session = await requireAuth();
  const [departments, tempId] = await Promise.all([
    getActiveDepartments(),
    Promise.resolve("temp_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now()),
  ]);

  if (!session.user.departmentId) {
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
          department: departments.find((d) => d.id === session.user.departmentId)?.name ?? null,
          requestDate: new Date().toISOString(),
        }}
      />
    </div>
  );
}

// Rendered server-side — uses a simple static fallback (no locale needed here)
function DarNoDepartment() {
  return (
    <div className="max-w-lg mx-auto mt-12 card-premium px-5 py-4 border border-base-300 rounded-xl shadow-sm text-center">
      <p className="text-sm md:text-base font-bold text-primary">ไม่สามารถสร้างคำขอได้</p>
      <p className="text-xs md:text-sm text-gray-500 mt-2">บัญชีของคุณยังไม่ได้ผูกกับแผนก กรุณาติดต่อ IT</p>
      <Link href="/dar" className="btn btn-ghost btn-sm mt-4">ย้อนกลับ</Link>
    </div>
  );
}
