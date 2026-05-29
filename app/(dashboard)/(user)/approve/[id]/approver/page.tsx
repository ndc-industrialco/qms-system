import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import DarReviewLayout from "@/components/dar/DarReviewLayout";
import type { DarApprovalRow } from "@/types/dar";
import KpiApproveActionClient from "@/components/approve/KpiApproveActionClient";

const darService = new DarService();

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; kpiId?: string; year?: string; month?: string }>;
};

export default async function ApproveApproverPage({ params, searchParams }: Props) {
  const [session, { id }, sp] = await Promise.all([requireAuth(), params, searchParams]);
  const type = sp.type ?? "dar";

  if (type === "kpi") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <KpiApproveActionClient id={id} mode="approver" type="kpi" />
      </div>
    );
  }

  if (type === "kpi-monthly") {
    if (!sp.kpiId) redirect("/approve");
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <KpiApproveActionClient id={id} mode="approver" type="kpi-monthly" kpiId={sp.kpiId} />
      </div>
    );
  }

  try {
    const [dar, savedSig] = await Promise.all([
      darService.getDarById(id, session.user.id),
      darService.getSavedSignature(session.user.id),
    ]);

    const isAssignedApprover = dar.approvals.some(
      (a: DarApprovalRow) =>
        a.stepRole === "APPROVER_MR" &&
        a.assignedUser.id === session.user.id &&
        a.action === "PENDING",
    );

    if (!isAssignedApprover) {
      redirect(`/dar/${id}`);
    }

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        <DarReviewLayout
          dar={dar}
          darId={id}
          darNo={dar.darNo}
          currentUserId={session.user.id}
          savedSignatureUrl={savedSig?.url ?? null}
          savedSignatureType={savedSig?.type ?? null}
          isAssignedReviewer={true}
          isMrApprove
          redirectToApproveOnAction
        />
      </div>
    );
  } catch {
    notFound();
  }
}
