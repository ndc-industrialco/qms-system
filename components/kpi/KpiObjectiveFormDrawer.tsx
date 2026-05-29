"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createKpiObjectiveSchema } from "@/schemas/kpiSchema";
import { useT } from "@/lib/i18n";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { KPIObjective } from "@/generated/prisma/client";

const bodySchema = createKpiObjectiveSchema.omit({ kpiId: true });
type FormValues = z.infer<typeof bodySchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective?: KPIObjective | null;
  onSubmit: (values: FormValues) => Promise<void>;
}

const inputBase = "w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:bg-white transition-colors";
const inputDefault = "border-slate-200 focus:border-[#0F1059]";
const inputError = "border-rose-300 text-rose-700 focus:border-rose-500";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-rose-600 text-xs mt-1">{message}</p>;
}

export default function KpiObjectiveFormDrawer({ open, onOpenChange, objective, onSubmit }: Props) {
  const t = useT();
  const isEdit = !!objective;

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(bodySchema),
    defaultValues: {
      target: 0,
      objective: "",
      frequency: "Every Month",
      calculationFormula: "",
      actionPlanGuidelines: "",
      referenceDocuments: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(objective
      ? {
          target: objective.target,
          objective: objective.objective,
          frequency: objective.frequency,
          calculationFormula: objective.calculationFormula,
          actionPlanGuidelines: objective.actionPlanGuidelines,
          referenceDocuments: objective.referenceDocuments ?? "",
        }
      : { target: 0, objective: "", frequency: "Every Month", calculationFormula: "", actionPlanGuidelines: "", referenceDocuments: "" }
    );
  }, [open, objective, reset]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
          <SheetTitle className="text-base font-semibold text-slate-800">
            {isEdit ? t("kpi.objective.editTitle") : t("kpi.objective.createTitle")}
          </SheetTitle>
        </SheetHeader>

        <form id="kpi-objective-form" className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
          onSubmit={handleSubmit(async (values) => { await onSubmit(values); onOpenChange(false); })}>

          {/* Target */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                {t("kpi.form.target")} <span className="text-rose-600">*</span>
              </label>
              <input type="number" step="0.01" aria-invalid={!!errors.target}
                className={cn(inputBase, errors.target ? inputError : inputDefault)}
                {...register("target", { valueAsNumber: true })} />
              <FieldError message={errors.target?.message} />
            </div>

            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                {t("kpi.form.measurementFrequency")} <span className="text-rose-600">*</span>
              </label>
              <Select value={watch("frequency")} onValueChange={(v) => setValue("frequency", v, { shouldValidate: true })}>
                <SelectTrigger className={cn(inputBase, inputDefault, "h-10.5")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Every Month">{t("kpi.form.frequencyMonthly")}</SelectItem>
                  <SelectItem value="Quarterly">{t("kpi.form.frequencyQuarterly")}</SelectItem>
                  <SelectItem value="Yearly">{t("kpi.form.frequencyYearly")}</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.frequency?.message} />
            </div>
          </div>

          {/* Objective text */}
          <div>
            <label className="text-slate-800 text-sm font-semibold mb-2 block">
              {t("kpi.form.objectiveDetails")} <span className="text-rose-600">*</span>
            </label>
            <textarea rows={3} aria-invalid={!!errors.objective}
              className={cn(inputBase, "resize-none", errors.objective ? inputError : inputDefault)}
              {...register("objective")} />
            <FieldError message={errors.objective?.message} />
          </div>

          {/* Calculation Formula */}
          <div>
            <label className="text-slate-800 text-sm font-semibold mb-2 block">
              {t("kpi.form.calculationFormula")} <span className="text-rose-600">*</span>
            </label>
            <textarea rows={2} aria-invalid={!!errors.calculationFormula}
              className={cn(inputBase, "resize-none", errors.calculationFormula ? inputError : inputDefault)}
              {...register("calculationFormula")} />
            <FieldError message={errors.calculationFormula?.message} />
          </div>

          {/* Action Plan Guidelines */}
          <div>
            <label className="text-slate-800 text-sm font-semibold mb-2 block">
              {t("kpi.form.actionPlanGuidelines")} <span className="text-rose-600">*</span>
            </label>
            <textarea rows={3} aria-invalid={!!errors.actionPlanGuidelines}
              className={cn(inputBase, "resize-none", errors.actionPlanGuidelines ? inputError : inputDefault)}
              {...register("actionPlanGuidelines")} />
            <FieldError message={errors.actionPlanGuidelines?.message} />
          </div>

          {/* Reference Documents */}
          <div>
            <label className="text-slate-800 text-sm font-semibold mb-2 block">
              {t("kpi.form.referenceDocuments")}
              <span className="text-slate-400 text-xs font-normal ml-1">{t("common.optional")}</span>
            </label>
            <input type="text" className={cn(inputBase, inputDefault)} {...register("referenceDocuments")} />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="kpi-objective-form" className="rounded-xl bg-primary hover:bg-[#161875]" disabled={isSubmitting}>
            {isSubmitting ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
