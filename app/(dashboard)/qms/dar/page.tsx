export const runtime = 'nodejs';

import { requireRole } from "@/lib/auth";
import { getAllDars } from "@/services/dar";
import DarTable from "@/components/dar/DarTable";
import DarCardList from "@/components/dar/DarCardList";
import LocalizedEmptyState from "@/components/common/LocalizedEmptyState";
import DarStatusBadge from "@/components/dar/DarStatusBadge";
import QmsDarPageHeader from "@/components/qms/QmsDarPageHeader";
import type { DarStatus } from "@/app/generated/prisma";

const ORDERED_STATUSES: DarStatus[] = [
  "PENDING_REVIEW",
  "PENDING_APPROVE",
  "QMS_PROCESSING",
  "COMPLETED",
  "CANCELLED",
  "DRAFT",
];

export default async function QmsDarPage() {
  await requireRole("QMS", "MR", "IT");
  const dars = await getAllDars();

  const counts = dars.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-350 mx-auto px-4 md:px-8">
      <QmsDarPageHeader />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        {ORDERED_STATUSES.map((s) => (
          <div key={s} className="card-premium px-5 py-4 flex flex-row items-center gap-3 border border-base-300 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <DarStatusBadge status={s} />
            <span className="text-xl font-bold text-primary">{counts[s] ?? 0}</span>
          </div>
        ))}
      </div>

      {dars.length === 0 ? (
        <LocalizedEmptyState titleKey="emptyDarQms" />
      ) : (
        <>
          <DarTable dars={dars} />
          <DarCardList dars={dars} />
        </>
      )}
    </div>
  );
}
