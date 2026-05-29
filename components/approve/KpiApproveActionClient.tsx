"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import KpiSignatureDialog from "@/components/kpi/KpiSignatureDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Mode = "reviewer" | "approver";
type KpiType = "kpi" | "kpi-monthly";

type Props = {
  id: string;
  mode: Mode;
  type: KpiType;
  kpiId?: string;
};

export default function KpiApproveActionClient({ id, mode, type, kpiId }: Props) {
  const t = useT();
  const router = useRouter();
  const [sigOpen, setSigOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const query = useQuery({
    queryKey: ["approve-action", type, id, kpiId],
    queryFn: async () => {
      const url = type === "kpi"
        ? `/api/kpi/${id}`
        : `/api/kpi/${kpiId}/monthly/${id}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? json.message ?? "Failed to load");
      return json.data;
    },
  });

  const title = useMemo(() => {
    if (type === "kpi") return `${t("approve.typeObjective")} - ${query.data?.department ?? ""}`;
    return `${t("approve.typeMonthly")} - ${query.data?.kpi?.department ?? ""}`;
  }, [query.data, t, type]);

  async function submitAction(action: "approve" | "reject") {
    try {
      setSubmitting(true);
      let url = "";
      if (type === "kpi") {
        if (action === "approve") {
          url = mode === "reviewer" ? `/api/kpi/${id}/review` : `/api/kpi/${id}/approve`;
        } else {
          url = `/api/kpi/${id}/reject`;
        }
      } else {
        if (action === "approve") {
          url = mode === "reviewer"
            ? `/api/kpi/${kpiId}/monthly/${id}/review`
            : `/api/kpi/${kpiId}/monthly/${id}/approve`;
        } else {
          url = `/api/kpi/${kpiId}/monthly/${id}/reject`;
        }
      }

      const payload = action === "reject" ? { reason: "Rejected from approve action page" } : undefined;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? json.message ?? "Action failed");
      setSuccessOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"), { duration: Infinity });
    } finally {
      setSubmitting(false);
      setPendingAction(null);
    }
  }

  if (query.isLoading) {
    return <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-sm text-slate-500">{t("common.loading")}</div>;
  }

  if (!query.data) {
    return <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-sm text-rose-600">{t("common.error")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">{title}</h1>
        <p className="text-sm text-slate-600 mt-1">
          {mode === "reviewer" ? t("approve.pendingKpiReviewList") : t("approve.pendingKpiApproveList")}
        </p>
      </div>

      {type === "kpi" ? (
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2">
          <p className="text-sm text-slate-600">{t("approve.department")}: <span className="font-semibold text-slate-800">{query.data.department}</span></p>
          <p className="text-sm text-slate-600">{t("kpi.form.year")}: <span className="font-semibold text-slate-800">{query.data.yearly}</span></p>
          <p className="text-sm text-slate-600">{t("approve.status")}: <span className="font-semibold text-slate-800">{query.data.status}</span></p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <p className="text-sm text-slate-600">{t("approve.period")}: <span className="font-semibold text-slate-800">{query.data.month} {query.data.year}</span></p>
          <div className="space-y-2">
            {(query.data.details ?? []).slice(0, 10).map((d: { id: string; kpiObjective: { objective: string }; achievedStatus: string; actualResult: number | null }) => (
              <div key={d.id} className="rounded-xl border border-slate-100 p-3">
                <p className="text-sm font-medium text-slate-800">{d.kpiObjective.objective}</p>
                <p className="text-xs text-slate-500 mt-1">{t("approve.actual")}: {d.actualResult ?? "-"} | {d.achievedStatus}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex gap-3">
        <Button
          className="rounded-xl bg-[#0F1059] hover:bg-[#161875]"
          disabled={submitting}
          onClick={() => { setPendingAction("approve"); setSigOpen(true); }}
        >
          {mode === "reviewer" ? t("kpi.monthly.actions.review") : t("kpi.monthly.actions.approve")}
        </Button>
        <Button
          variant="outline"
          className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
          disabled={submitting}
          onClick={() => { setPendingAction("reject"); setSigOpen(true); }}
        >
          {t("kpi.monthly.actions.reject")}
        </Button>
      </div>

      <KpiSignatureDialog
        open={sigOpen}
        title={mode === "reviewer" ? t("kpi.monthly.actions.review") : t("kpi.monthly.actions.approve")}
        onOpenChange={setSigOpen}
        onConfirm={async () => {
          if (!pendingAction) return;
          await submitAction(pendingAction);
        }}
      />

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("approve.successTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">{t("approve.successDesc")}</p>
          <DialogFooter>
            <Button
              className="rounded-xl bg-[#0F1059] hover:bg-[#161875]"
              onClick={() => {
                setSuccessOpen(false);
                router.push("/approve");
                router.refresh();
              }}
            >
              {t("approve.backToQueue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
