"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { createKpiSchema } from "@/schemas/kpiSchema";
import { useCreateKpi, useUpdateKpi } from "@/hooks/api/use-kpi";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { KPI } from "@/generated/prisma/client";

type FormValues = z.infer<typeof createKpiSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi?: KPI | null;
}

const inputBase = "w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors";
const labelBase = "text-slate-800 text-sm font-semibold mb-2 block";

export function KpiMasterFormDrawer({ open, onOpenChange, kpi }: Props) {
  const t = useT();
  const createMutation = useCreateKpi();
  const updateMutation = useUpdateKpi();
  const isEdit = !!kpi;

  const form = useForm<FormValues>({
    resolver: zodResolver(createKpiSchema),
    defaultValues: { yearly: new Date().getFullYear(), department: "", prepare: "", reviewer: "", approver: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(kpi
      ? { yearly: kpi.yearly, department: kpi.department, prepare: kpi.prepare, reviewer: kpi.reviewer, approver: kpi.approver }
      : { yearly: new Date().getFullYear(), department: "", prepare: "", reviewer: "", approver: "" }
    );
  }, [open, kpi, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: kpi.id, data: values });
        toast.success(t("kpi.messages.updateSuccess"));
      } else {
        await createMutation.mutateAsync(values);
        toast.success(t("kpi.messages.createSuccess"));
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100">
          <DialogTitle className="text-base font-semibold text-slate-800">
            {isEdit ? t("kpi.action.edit") : t("kpi.reference.add")}
          </DialogTitle>
          <DialogDescription className="sr-only">{isEdit ? "Edit KPI" : "Add KPI"}</DialogDescription>
        </DialogHeader>

        <form id="kpi-drawer-form" className="px-6 py-6 space-y-4 max-h-[60vh] overflow-y-auto" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>{t("kpi.form.year")} <span className="text-rose-600">*</span></label>
              <input type="number" className={inputBase} {...form.register("yearly", { valueAsNumber: true })} />
            </div>
            <div>
              <label className={labelBase}>{t("kpi.form.department")} <span className="text-rose-600">*</span></label>
              <input className={inputBase} {...form.register("department")} />
            </div>
          </div>
          <div>
            <label className={labelBase}>{t("kpi.form.prepare")} <span className="text-rose-600">*</span></label>
            <input className={inputBase} {...form.register("prepare")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>{t("kpi.form.reviewer")} <span className="text-rose-600">*</span></label>
              <input className={inputBase} {...form.register("reviewer")} />
            </div>
            <div>
              <label className={labelBase}>{t("kpi.form.approver")} <span className="text-rose-600">*</span></label>
              <input className={inputBase} {...form.register("approver")} />
            </div>
          </div>
        </form>

        <DialogFooter className="px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={() => onOpenChange(false)} disabled={isPending}
            className="bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm hover:bg-slate-50 transition-colors disabled:opacity-50">
            {t("common.cancel")}
          </button>
          <button type="submit" form="kpi-drawer-form" disabled={isPending}
            className="bg-primary text-white rounded-xl px-5 py-2 text-sm hover:bg-[#161875] transition-colors disabled:opacity-60 flex items-center gap-2 min-w-22.5 justify-center">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("common.save")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
