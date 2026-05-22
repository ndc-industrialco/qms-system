import type { DarStatus } from "@/generated/prisma/client";
import { DAR_STATUS_LABELS } from "@/types/dar";

const STATUS_CLASS: Record<DarStatus, string> = {
  DRAFT:            "bg-base-200 text-neutral rounded-full font-bold",
  PENDING_REVIEW:   "bg-info/15 text-info rounded-full font-bold",
  PENDING_APPROVE:  "bg-info/15 text-info rounded-full font-bold",
  QMS_PROCESSING:   "bg-warning/15 text-warning rounded-full font-bold",
  COMPLETED:        "bg-success/15 text-success rounded-full font-bold",
  CANCELLED:        "bg-base-200 text-neutral/50 rounded-full font-bold line-through",
};

export default function DarStatusBadge({ status }: { status: DarStatus }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[11px] ${STATUS_CLASS[status]}`}>
      {DAR_STATUS_LABELS[status]}
    </span>
  );
}

