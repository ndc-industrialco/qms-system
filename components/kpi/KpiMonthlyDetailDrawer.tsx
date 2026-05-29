"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle } from "lucide-react";
import { useKpiMonthlyById, useSubmitMonthlyReport, useReviewMonthlyReport, useApproveMonthlyReport, useRejectMonthlyReport, useUpdateMonthlyDetail } from "@/hooks/api/use-kpi-monthly";
import type { MonthlyStatus, AchievedStatus } from "@/generated/prisma/client";

interface Props {
  kpiId: string | null;
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canApprove: boolean;
}

const STATUS_STYLES: Record<MonthlyStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-500 border border-slate-200",
  PENDING_REVIEW: "bg-amber-50 text-amber-600 border border-amber-200",
  PENDING_APPROVAL: "bg-blue-50 text-blue-600 border border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-600 border border-rose-200",
};

const ACHIEVED_STYLES: Record<AchievedStatus, string> = {
  OK: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  NOT_OK: "bg-rose-50 text-rose-600 border border-rose-200",
  PENDING: "bg-amber-50 text-amber-600 border border-amber-200",
};

export default function KpiMonthlyDetailDrawer({ kpiId, reportId, open, onOpenChange, canApprove }: Props) {
  const t = useT();
  const { data: response, isLoading } = useKpiMonthlyById(open ? kpiId : null, open ? reportId : null);
  const report = response?.data;

  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [actualInput, setActualInput] = useState<string>("");

  const updateDetailMutation = useUpdateMonthlyDetail();
  const submitMutation = useSubmitMonthlyReport();
  const reviewMutation = useReviewMonthlyReport();
  const approveMutation = useApproveMonthlyReport();
  const rejectMutation = useRejectMonthlyReport();

  const anyLoading = submitMutation.isPending || reviewMutation.isPending || approveMutation.isPending || rejectMutation.isPending || updateDetailMutation.isPending;
  const isEditable = report?.status === "DRAFT" || report?.status === "REJECTED";

  async function handleSaveDetail(detailId: string) {
    if (!kpiId || !reportId) return;
    try {
      await updateDetailMutation.mutateAsync({
        kpiId, reportId, detailId,
        data: { actualResult: actualInput !== "" ? Number(actualInput) : null },
      });
      toast.success(t("kpi.monthly.messages.updateSuccess"));
      setEditingDetailId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  async function handleSubmit() {
    if (!kpiId || !reportId) return;
    try {
      await submitMutation.mutateAsync({ kpiId, reportId });
      toast.success(t("kpi.monthly.messages.submitSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  async function handleReview() {
    if (!kpiId || !reportId) return;
    try {
      await reviewMutation.mutateAsync({ kpiId, reportId });
      toast.success(t("kpi.monthly.messages.reviewSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  async function handleApprove() {
    if (!kpiId || !reportId) return;
    try {
      await approveMutation.mutateAsync({ kpiId, reportId });
      toast.success(t("kpi.monthly.messages.approveSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  async function handleReject() {
    if (!kpiId || !reportId || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ kpiId, reportId, reason: rejectReason });
      toast.success(t("kpi.monthly.messages.rejectSuccess"));
      setShowRejectForm(false);
      setRejectReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b border-slate-100">
          <SheetTitle className="text-primary font-bold">{t("kpi.monthly.drawer.title")}</SheetTitle>
        </SheetHeader>

        {isLoading || !report ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Header info */}
            <div className="px-6 py-4 border-b border-slate-50 space-y-1">
              <p className="text-sm font-semibold text-slate-800">{report.month} {report.year}</p>
              <p className="text-sm text-slate-500">{report.kpi?.department}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${STATUS_STYLES[report.status as MonthlyStatus]}`}>
                {t(`kpi.monthly.status.${report.status}` as Parameters<typeof t>[0])}
              </span>
            </div>

            {/* Details grid */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("kpi.monthly.drawer.objectives")}</p>
              {(report.details ?? []).map((detail: { id: string; actualResult: number | null; achievedStatus: AchievedStatus; kpiObjective: { objective: string; target: number } }) => (
                <div key={detail.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                  <p className="text-sm font-medium text-slate-700">{detail.kpiObjective.objective}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{t("kpi.monthly.table.target")}: <strong className="text-slate-700">{detail.kpiObjective.target}</strong></span>
                    <span>{t("kpi.monthly.table.actual")}:{" "}
                      {editingDetailId === detail.id ? (
                        <Input type="number" step="0.01" value={actualInput} onChange={e => setActualInput(e.target.value)}
                          className="h-6 w-24 inline-flex rounded-lg text-xs px-2 py-0" />
                      ) : (
                        <strong className="text-slate-700">{detail.actualResult ?? "—"}</strong>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACHIEVED_STYLES[detail.achievedStatus]}`}>
                      {t(`kpi.monthly.achieved.${detail.achievedStatus}` as Parameters<typeof t>[0])}
                    </span>
                    {isEditable && (
                      editingDetailId === detail.id ? (
                        <div className="flex gap-1.5 ml-auto">
                          <Button size="sm" className="h-6 text-xs rounded-lg bg-primary hover:bg-[#161875]" onClick={() => handleSaveDetail(detail.id)} disabled={anyLoading}>{t("common.save")}</Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs rounded-lg" onClick={() => setEditingDetailId(null)}>{t("common.cancel")}</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="h-6 text-xs rounded-lg ml-auto"
                          onClick={() => { setEditingDetailId(detail.id); setActualInput(detail.actualResult !== null ? String(detail.actualResult) : ""); }}>
                          {t("common.edit")}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Footer */}
        {report && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 space-y-3">
            {showRejectForm && (
              <div className="space-y-2">
                <Textarea placeholder={t("kpi.monthly.drawer.rejectionPlaceholder")} value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)} className="rounded-xl text-sm resize-none" rows={3} />
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex-1"
                    onClick={handleReject} disabled={!rejectReason.trim() || anyLoading}>
                    <XCircle className="w-4 h-4 mr-1.5" />{t("kpi.monthly.actions.reject")}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowRejectForm(false)} disabled={anyLoading}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}

            {!showRejectForm && (
              <div className="flex flex-wrap gap-2">
                {isEditable && !canApprove && (
                  <Button className="rounded-xl bg-primary hover:bg-[#161875] flex-1" onClick={handleSubmit} disabled={anyLoading}>
                    {t("kpi.monthly.actions.submit")}
                  </Button>
                )}
                {canApprove && report.status === "PENDING_REVIEW" && (
                  <>
                    <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex-1" onClick={handleReview} disabled={anyLoading}>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />{t("kpi.monthly.actions.review")}
                    </Button>
                    <Button variant="outline" className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => setShowRejectForm(true)} disabled={anyLoading}>
                      <XCircle className="w-4 h-4 mr-1.5" />{t("kpi.monthly.actions.reject")}
                    </Button>
                  </>
                )}
                {canApprove && report.status === "PENDING_APPROVAL" && (
                  <>
                    <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex-1" onClick={handleApprove} disabled={anyLoading}>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />{t("kpi.monthly.actions.approve")}
                    </Button>
                    <Button variant="outline" className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => setShowRejectForm(true)} disabled={anyLoading}>
                      <XCircle className="w-4 h-4 mr-1.5" />{t("kpi.monthly.actions.reject")}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
