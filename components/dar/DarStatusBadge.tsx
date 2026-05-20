import type { DarStatus } from "@/app/generated/prisma/edge";
import { DAR_STATUS_LABELS } from "@/types/dar";

const STATUS_CLASS: Record<DarStatus, string> = {
  DRAFT:            "bg-slate-100 text-slate-500 rounded-full font-bold",
  PENDING_REVIEW:   "bg-blue-100 text-blue-600 rounded-full font-bold",
  PENDING_APPROVE:  "bg-blue-100 text-blue-600 rounded-full font-bold",
  QMS_PROCESSING:   "bg-amber-100 text-amber-700 rounded-full font-bold",
  COMPLETED:        "bg-emerald-100 text-emerald-600 rounded-full font-bold",
  CANCELLED:        "bg-slate-100 text-slate-400 rounded-full font-bold line-through",
};

export default function DarStatusBadge({ status }: { status: DarStatus }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[11px] ${STATUS_CLASS[status]}`}>
      {DAR_STATUS_LABELS[status]}
    </span>
  );
}
