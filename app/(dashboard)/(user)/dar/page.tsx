export const runtime = 'edge';

import { Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import { getDarsByRequesterId } from "@/services/dar";
import { getActiveDepartments } from "@/services/department";
import DarTableSkeleton from "@/components/dar/DarTableSkeleton";
import DarListClient from "@/components/dar/(user)/DarListClient";
import type { DarSummary } from "@/types/dar";

async function DarList({
  requesterId,
  requesterInfo,
}: {
  requesterId: string;
  requesterInfo: {
    name: string | null;
    employeeId: string | null;
    department: string | null;
    requestDate: string;
  };
}) {
  const { dars } = await getDarsByRequesterId(requesterId, 1, 20);

  return <DarListClient dars={dars as DarSummary[]} requesterInfo={requesterInfo} />;
}

export default async function DarPage() {
  const session = await requireAuth();

  let departmentName: string | null = null;
  if (session.user.departmentId) {
    const departments = await getActiveDepartments();
    departmentName = departments.find((d) => d.id === session.user.departmentId)?.name ?? null;
  }

  const requesterInfo = {
    name: session.user.name ?? null,
    employeeId: session.user.employeeId ?? null,
    department: departmentName,
    requestDate: new Date().toISOString(),
  };

  return (
    <div className="max-w-350 mx-auto px-4 md:px-8">
      <Suspense fallback={<DarTableSkeleton />}>
        <DarList requesterId={session.user.id} requesterInfo={requesterInfo} />
      </Suspense>
    </div>
  );
}
