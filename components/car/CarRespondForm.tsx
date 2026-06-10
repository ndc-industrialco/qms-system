"use client";

import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { carRespondSchema, type CarRespondInput } from "@/lib/validations/car";
import CarRootCauseCheckbox from "./CarRootCauseCheckbox";

interface Props {
  carId: string;
  onSuccess?: () => void;
}

async function submitResponse(carId: string, data: CarRespondInput): Promise<void> {
  const res = await fetch(`/api/car/${carId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to submit response");
  }
}

const INPUT_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors";

export default function CarRespondForm({ carId, onSuccess }: Props) {
  const t = useT();
  const methods = useForm<CarRespondInput>({
    resolver: zodResolver(carRespondSchema) as Resolver<CarRespondInput>,
    defaultValues: {
      rootCausePerson: false,
      rootCauseMaterial: false,
      rootCauseMachine: false,
      rootCauseMethod: false,
      rootCauseOther: false,
    },
  });

  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: CarRespondInput) => submitResponse(carId, data as CarRespondInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["car", carId] });
      qc.invalidateQueries({ queryKey: ["cars"] });
      toast.success(t("car.respond.successMsg"), { duration: 3000 });
      onSuccess?.();
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  const { register, handleSubmit, formState: { errors } } = methods;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("car.respond.sectionAnalysis")}</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.whyLabel")}</label>
            <textarea
              {...register("whyAnalysis")}
              rows={5}
              placeholder={t("car.respond.whyPlaceholder")}
              className={cn(INPUT_CLASS, "resize-none")}
            />
            {errors.whyAnalysis && <p className="mt-1 text-xs text-rose-500">{errors.whyAnalysis.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.otherToolLabel")}</label>
            <textarea
              {...register("additionalToolDetail")}
              rows={2}
              placeholder={t("car.respond.otherToolPlaceholder")}
              className={cn(INPUT_CLASS, "resize-none")}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("car.respond.sectionRootCause")}</h3>
          <CarRootCauseCheckbox />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.rootCauseSummaryLabel")}</label>
            <textarea
              {...register("rootCauseSummary")}
              rows={3}
              className={cn(INPUT_CLASS, "resize-none")}
            />
            {errors.rootCauseSummary && <p className="mt-1 text-xs text-rose-500">{errors.rootCauseSummary.message}</p>}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("car.respond.sectionActions")}</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.immediateLabel")}</label>
            <textarea
              {...register("immediateAction")}
              rows={3}
              className={cn(INPUT_CLASS, "resize-none")}
            />
            {errors.immediateAction && <p className="mt-1 text-xs text-rose-500">{errors.immediateAction.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.preventiveLabel")}</label>
            <textarea
              {...register("preventiveAction")}
              rows={3}
              className={cn(INPUT_CLASS, "resize-none")}
            />
            {errors.preventiveAction && <p className="mt-1 text-xs text-rose-500">{errors.preventiveAction.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.plannedDateLabel")}</label>
            <input
              type="date"
              {...register("plannedCompletionDate")}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors"
            />
            {errors.plannedCompletionDate && <p className="mt-1 text-xs text-rose-500">{errors.plannedCompletionDate.message}</p>}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("car.respond.sectionResponder")}</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.positionLabel")}</label>
            <input
              {...register("responderPosition")}
              type="text"
              placeholder={t("car.respond.positionPlaceholder")}
              className={INPUT_CLASS}
            />
            {errors.responderPosition && <p className="mt-1 text-xs text-rose-500">{errors.responderPosition.message}</p>}
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />}
            {mutation.isPending ? t("car.respond.btnSubmitting") : t("car.respond.btnSubmit")}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
