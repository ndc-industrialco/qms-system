"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { KPI_UNITS } from "@/lib/kpi-units";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Send, CheckCircle2, Clock, ShieldCheck, Info, ShieldAlert, User, UserCheck, UserCog, CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmModal from "@/components/common/ConfirmModal";
import KpiObjectiveFormDrawer from "@/components/kpi/KpiObjectiveFormDrawer";
import KpiSignatureDialog from "@/components/kpi/KpiSignatureDialog";
import KpiObjectiveAssignDialog from "@/components/kpi/KpiObjectiveAssignDialog";
import {
  useKpiById,
  useAddObjective,
  useUpdateObjective,
  useDeleteObjective,
  useSubmitKpiObjectives,
} from "@/hooks/api/use-kpi";
import KpiApprovalTimeline from "@/components/kpi/KpiApprovalTimeline";
import type { KPIObjective } from "@/generated/prisma/client";

type UserRole = "USER" | "IT" | "QMS" | "MR";

const PRIVILEGED_ROLES: UserRole[] = ["IT", "QMS", "MR"];
function isPrivileged(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

interface Props {
  kpiId: string;
  role: UserRole;
}

const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",           icon: null,          class: "bg-slate-50 text-slate-500 border-slate-200" },
  PENDING_REVIEW: { label: "Pending Review",  icon: Clock,         class: "bg-amber-50 text-amber-600 border-amber-200" },
  APPROVED:       { label: "Approved ✓",      icon: CheckCircle2,  class: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  REJECTED:       { label: "Rejected ✕",      icon: null,          class: "bg-rose-50 text-rose-600 border-rose-200" },
} as const;

function RoleBanner({ role, kpiStatus }: { role: UserRole; kpiStatus: string }) {
  const t = useT();
  const privileged = isPrivileged(role);
  const isApproved = kpiStatus === "APPROVED";

  if (privileged) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-sm text-emerald-700">
          <span className="font-semibold">{role}</span>
          {" — "}
          {t("kpi.rolePrivilegedDesc")}
        </p>
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-700">{t("kpi.roleUserApprovedDesc")}</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
      <p className="text-sm text-sky-700">{t("kpi.roleUserDesc")}</p>
    </div>
  );
}

export default function KpiDepartmentDetailClient({ kpiId, role }: Props) {
  const t = useT();
  const privileged = isPrivileged(role);

  // IT/QMS/MR: always CRUD regardless of status
  // USER: only CRUD when DRAFT or REJECTED
  const canAlwaysEdit = privileged;

  const { data: resp, isLoading } = useKpiById(kpiId);
  const kpi = resp?.data;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<KPIObjective | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const addMutation = useAddObjective();
  const updateMutation = useUpdateObjective();
  const deleteMutation = useDeleteObjective();
  const submitMutation = useSubmitKpiObjectives();

  async function handleSignatureConfirm(payload: { signatureDataUrl: string }) {
    setPendingSignature(payload.signatureDataUrl);
    setSignatureOpen(false);
    setAssignOpen(true);
  }

  async function handleAssignConfirm(reviewerUserId: string, approverUserId: string) {
    if (!pendingSignature) return;
    try {
      await submitMutation.mutateAsync({
        kpiId,
        data: { prepareSignature: pendingSignature, reviewerUserId, approverUserId },
      });
      toast.success(t("kpi.submit.success"));
      setPendingSignature(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
      throw err;
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-48" />
        <div className="h-12 bg-slate-100 rounded-xl" />
        <div className="h-40 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!kpi) return null;

  const objectives: KPIObjective[] = kpi.objectives ?? [];
  const kpiStatus = kpi.status as keyof typeof STATUS_CONFIG;
  const statusCfg = STATUS_CONFIG[kpiStatus] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = statusCfg.icon;

  // For USER: CRUD only when DRAFT or REJECTED (not approved)
  const isDraft = kpiStatus === "DRAFT" || kpiStatus === "REJECTED";

  // Effective edit permission:
  // - privileged (IT/QMS/MR): always true
  // - USER: only when isDraft
  const canEdit = canAlwaysEdit || isDraft;

  // Submit is available when:
  // - privileged: always (no condition) when there are objectives
  // - USER: only when DRAFT/REJECTED and not yet submitted
  const canShowSubmit = (canAlwaysEdit || isDraft) && objectives.length > 0;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/qms/kpi" className="hover:text-slate-600 transition-colors">{t("kpi.reference.title")}</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <span className="text-slate-600 font-medium truncate">{kpi.department}</span>
      </nav>

      <PageHeader
        title={kpi.department}
        subtitle={String(kpi.yearly)}
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border", statusCfg.class)}>
              {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
              {statusCfg.label}
            </span>
            {privileged && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                <ShieldCheck className="w-3 h-3" />
                {t("approve.fullAccess")}
              </span>
            )}
            {canEdit && (
              <Button
                onClick={() => { setEditing(null); setDrawerOpen(true); }}
                variant="outline"
                className="rounded-xl border-slate-200"
              >
                <Plus className="w-4 h-4 mr-2" />{t("kpi.objective.createTitle")}
              </Button>
            )}
            {canShowSubmit && (
              <Button
                onClick={() => setSignatureOpen(true)}
                className="rounded-xl bg-primary hover:bg-primary/90"
                disabled={submitMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />{t("kpi.submit.button")}
              </Button>
            )}
          </div>
        }
      />

      <RoleBanner role={role} kpiStatus={kpiStatus} />

      {/* KPI Metadata Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t("kpi.metaCard.title")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">{t("kpi.form.prepare")}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{kpi.prepare || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">{t("kpi.form.reviewer")}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {/* Prefer resolved full name from user record; fall back to free-text field */}
                {(kpi as typeof kpi & { reviewerUser?: { name: string | null; email: string } | null }).reviewerUser?.name
                  || (kpi as typeof kpi & { reviewerUser?: { name: string | null; email: string } | null }).reviewerUser?.email
                  || kpi.reviewer
                  || "—"}
              </p>
              {kpi.reviewerUserId && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 mt-1">
                  <UserCheck className="w-3 h-3" />{t("kpi.metaCard.assigned")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
              <UserCog className="w-4 h-4 text-sky-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">{t("kpi.form.approver")}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {/* Prefer resolved full name from user record; fall back to free-text field */}
                {(kpi as typeof kpi & { approverUser?: { name: string | null; email: string } | null }).approverUser?.name
                  || (kpi as typeof kpi & { approverUser?: { name: string | null; email: string } | null }).approverUser?.email
                  || kpi.approver
                  || "—"}
              </p>
              {kpi.approverUserId && (
                <span className="inline-flex items-center gap-1 text-xs text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-1.5 py-0.5 mt-1">
                  <UserCog className="w-3 h-3" />{t("kpi.metaCard.assigned")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">{t("kpi.metaCard.submittedAt")}</p>
              <p className="text-sm font-semibold text-slate-800">
                {kpi.submittedAt
                  ? new Date(kpi.submittedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Workflow Timeline */}
      {Array.isArray((kpi as typeof kpi & { approvalSignatures?: unknown[] }).approvalSignatures) &&
        (kpi as typeof kpi & { approvalSignatures?: unknown[] }).approvalSignatures!.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            {t("dar.approval.title")}
          </p>
          <KpiApprovalTimeline
            signatures={(kpi as typeof kpi & { approvalSignatures?: Parameters<typeof KpiApprovalTimeline>[0]["signatures"] }).approvalSignatures ?? []}
            preparerName={kpi.prepare || null}
            layout="horizontal"
          />
        </div>
      )}

      {objectives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400">
            <span className="text-xl">○</span>
          </div>
          <p className="text-slate-800 font-semibold text-base mb-1">{t("kpi.objective.table.empty")}</p>
          {canEdit && (
            <p className="text-slate-400 text-sm">{t("kpi.objective.emptyHint")}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {objectives.map(obj => (
            <div key={obj.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{obj.objective}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                    <span>
                      {t("kpi.objective.table.target")}:{" "}
                      <strong className="text-primary">{obj.target}{obj.unit ? <span className="ml-0.5 text-slate-400 font-normal">{t(KPI_UNITS.find(u => u.value === obj.unit)?.labelKey as Parameters<typeof t>[0] ?? '')}</span> : ''}</strong>
                    </span>
                    <span>
                      {t("kpi.objective.table.frequency")}:{" "}
                      <strong className="text-slate-700">{obj.frequency}</strong>
                    </span>
                  </div>
                  {obj.calculationFormula && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-1">{obj.calculationFormula}</p>
                  )}
                </div>

                {/* Edit/Delete: shown for privileged always, for USER only when isDraft */}
                {canEdit && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-primary hover:bg-slate-100"
                      onClick={() => { setEditing(obj); setDrawerOpen(true); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      onClick={() => { setDeleteTargetId(obj.id); setDeleteConfirmOpen(true); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Objective Form Drawer */}
      <KpiObjectiveFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        objective={editing}
        onSubmit={async (values) => {
          try {
            if (editing) {
              await updateMutation.mutateAsync({ kpiId, objectiveId: editing.id, data: values });
              toast.success(t("kpi.messages.updateSuccess"));
            } else {
              await addMutation.mutateAsync({ kpiId, data: values });
              toast.success(t("kpi.messages.createSuccess"));
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
            throw err;
          }
        }}
      />

      {/* Delete Confirm */}
      {deleteConfirmOpen && deleteTargetId && (
        <ConfirmModal
          title={t("kpi.reference.confirmDeleteTitle")}
          message={t("kpi.reference.confirmDeleteMessage")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          loading={deleteMutation.isPending}
          onConfirm={async () => {
            try {
              await deleteMutation.mutateAsync({ kpiId, objectiveId: deleteTargetId });
              toast.success(t("kpi.messages.deleteSuccess"));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
            } finally {
              setDeleteConfirmOpen(false);
              setDeleteTargetId(null);
            }
          }}
          onCancel={() => { setDeleteConfirmOpen(false); setDeleteTargetId(null); }}
        />
      )}

      {/* Step 1: Signature */}
      <KpiSignatureDialog
        open={signatureOpen}
        title={t("kpi.submit.signatureTitle")}
        onOpenChange={setSignatureOpen}
        onConfirm={handleSignatureConfirm}
      />

      {/* Step 2: Assign Reviewer + Approver */}
      <KpiObjectiveAssignDialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setPendingSignature(null);
        }}
        initialReviewerId={kpi.reviewerUserId ?? undefined}
        initialApproverId={kpi.approverUserId ?? undefined}
        onConfirm={handleAssignConfirm}
      />
    </div>
  );
}
