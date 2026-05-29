"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function KpiMasterFormDialog({ open, onOpenChange, kpi }: Props) {
  const t = useT();
  const createMutation = useCreateKpi();
  const updateMutation = useUpdateKpi();

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
      if (kpi) {
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
      <DialogContent className="sm:max-w-130">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[rgb(15,16,89)]">
            {kpi ? t("kpi.action.edit") : t("kpi.reference.add")}
          </DialogTitle>
          <DialogDescription className="sr-only">{kpi ? "Edit KPI" : "Add KPI"}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="kpi-yearly" className="text-sm font-medium text-slate-700">
                {t("kpi.form.year")} <span className="text-rose-500">*</span>
              </Label>
              <Input id="kpi-yearly" type="number" className="bg-slate-50/50 border-slate-200"
                {...form.register("yearly", { valueAsNumber: true })} />
              {form.formState.errors.yearly && <p className="text-xs text-rose-500">{form.formState.errors.yearly.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kpi-dept" className="text-sm font-medium text-slate-700">
                {t("kpi.form.department")} <span className="text-rose-500">*</span>
              </Label>
              <Input id="kpi-dept" className="bg-slate-50/50 border-slate-200"
                placeholder={t("kpi.form.departmentPlaceholder")} {...form.register("department")} />
              {form.formState.errors.department && <p className="text-xs text-rose-500">{form.formState.errors.department.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kpi-prepare" className="text-sm font-medium text-slate-700">
              {t("kpi.form.prepare")} <span className="text-rose-500">*</span>
            </Label>
            <Input id="kpi-prepare" className="bg-slate-50/50 border-slate-200" {...form.register("prepare")} />
            {form.formState.errors.prepare && <p className="text-xs text-rose-500">{form.formState.errors.prepare.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="kpi-reviewer" className="text-sm font-medium text-slate-700">
                {t("kpi.form.reviewer")} <span className="text-rose-500">*</span>
              </Label>
              <Input id="kpi-reviewer" className="bg-slate-50/50 border-slate-200" {...form.register("reviewer")} />
              {form.formState.errors.reviewer && <p className="text-xs text-rose-500">{form.formState.errors.reviewer.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kpi-approver" className="text-sm font-medium text-slate-700">
                {t("kpi.form.approver")} <span className="text-rose-500">*</span>
              </Label>
              <Input id="kpi-approver" className="bg-slate-50/50 border-slate-200" {...form.register("approver")} />
              {form.formState.errors.approver && <p className="text-xs text-rose-500">{form.formState.errors.approver.message}</p>}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" className="border-slate-200" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" className="bg-primary hover:bg-[#161875] min-w-22.5" disabled={isPending}>
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("save")}...</> : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
