export const runtime = 'nodejs';

import { requireRole } from "@/lib/auth";
import { getAllDars } from "@/services/dar";
import DarTable from "@/components/dar/DarTable";
import DarCardList from "@/components/dar/DarCardList";
import LocalizedEmptyState from "@/components/common/LocalizedEmptyState";
import DarStatusBadge from "@/components/dar/DarStatusBadge";
import QmsDarPageHeader from "@/components/qms/QmsDarPageHeader";
import type { DarStatus } from "@/generated/prisma/client";

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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {ORDERED_STATUSES.map((s) => (
          <div key={s} className="card-premium px-4 py-4 flex flex-col gap-2 hover-lift">
            <span className="text-2xl font-bold text-primary leading-none">{counts[s] ?? 0}</span>
            <DarStatusBadge status={s} />
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

