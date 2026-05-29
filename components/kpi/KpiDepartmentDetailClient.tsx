"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Send, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmModal from "@/components/common/ConfirmModal";
import KpiObjectiveFormDrawer from "@/components/kpi/KpiObjectiveFormDrawer";
import KpiSignatureDialog from "@/components/kpi/KpiSignatureDialog";
import KpiObjectiveAssignDialog from "@/components/kpi/KpiObjectiveAssignDialog";
import { useKpiById, useAddObjective, useUpdateObjective, useDeleteObjective, useSubmitKpiObjectives } from "@/hooks/api/use-kpi";
import type { KPIObjective } from "@/generated/prisma/client";

interface Assignee { id: string; name: string | null; email: string; role: string }

interface Props {
  kpiId: string;
  role: "USER" | "IT" | "QMS" | "MR";
}

const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",          icon: null,           class: "bg-slate-50 text-slate-500 border-slate-200" },
  PENDING_REVIEW: { label: "Pending Review", icon: Clock,          class: "bg-amber-50 text-amber-600 border-amber-200" },
  APPROVED:       { label: "Approved",       icon: CheckCircle2,   class: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  REJECTED:       { label: "Rejected",       icon: null,           class: "bg-rose-50 text-rose-600 border-rose-200" },
} as const;

export default function KpiDepartmentDetailClient({ kpiId, role }: Props) {
  const t = useT();
  const canEdit = role === "QMS" || role === "MR" || role === "IT";
  const canSubmit = role !== "USER";

  const { data: resp, isLoading } = useKpiById(kpiId);
  const kpi = resp?.data;

  const { data: assigneeResp } = useQuery<{ data: Assignee[] }>({
    queryKey: ["assignees"],
    queryFn: async () => {
      const res = await fetch("/api/users/assignees");
      if (!res.ok) throw new Error("Failed to load assignees");
      return res.json();
    },
    enabled: canSubmit,
  });
  const assignees: Assignee[] = assigneeResp?.data ?? [];

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
        data: {
          prepareSignature: pendingSignature,
          reviewerUserId,
          approverUserId,
        },
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
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-48" />
        <div className="h-40 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!kpi) return null;

  const objectives: KPIObjective[] = kpi.objectives ?? [];
  const kpiStatus = kpi.status as keyof typeof STATUS_CONFIG;
  const statusCfg = STATUS_CONFIG[kpiStatus] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = statusCfg.icon;
  const isDraft = kpiStatus === "DRAFT" || kpiStatus === "REJECTED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={kpi.department}
        subtitle={String(kpi.yearly)}
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border", statusCfg.class)}>
              {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
              {statusCfg.label}
            </span>
            {canEdit && isDraft && (
              <Button
                onClick={() => { setEditing(null); setDrawerOpen(true); }}
                variant="outline"
                className="rounded-xl border-slate-200"
              >
                <Plus className="w-4 h-4 mr-2" />{t("kpi.objective.createTitle")}
              </Button>
            )}
            {canSubmit && isDraft && objectives.length > 0 && (
              <Button
                onClick={() => setSignatureOpen(true)}
                className="rounded-xl bg-primary hover:bg-[#161875]"
                disabled={submitMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />{t("kpi.submit.button")}
              </Button>
            )}
          </div>
        }
      />

      {objectives.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">{t("kpi.objective.table.empty")}</div>
      ) : (
        <div className="space-y-3">
          {objectives.map(obj => (
            <div key={obj.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{obj.objective}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                    <span>{t("kpi.objective.table.target")}: <strong className="text-primary">{obj.target}</strong></span>
                    <span>{t("kpi.objective.table.frequency")}: <strong className="text-slate-700">{obj.frequency}</strong></span>
                  </div>
                  {obj.calculationFormula && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-1">{obj.calculationFormula}</p>
                  )}
                </div>
                {canEdit && isDraft && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-primary hover:bg-slate-100"
                      onClick={() => { setEditing(obj); setDrawerOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      onClick={() => { setDeleteTargetId(obj.id); setDeleteConfirmOpen(true); }}>
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
        assignees={assignees}
        initialReviewerId={kpi.reviewerUserId ?? undefined}
        initialApproverId={kpi.approverUserId ?? undefined}
        onConfirm={handleAssignConfirm}
      />
    </div>
  );
}
