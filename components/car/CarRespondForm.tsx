"use client";

import { useRef, useState } from "react";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { carRespondSchema, type CarRespondInput } from "@/lib/validations/car";
import CarRootCauseCheckbox from "./CarRootCauseCheckbox";
import type { CarDetail } from "@/types/car";

interface Props {
  carId: string;
  defaultPosition?: string;
  onSuccess?: () => void;
}

async function submitResponse(carId: string, data: CarRespondInput): Promise<CarDetail> {
  const res = await fetch(`/api/car/${carId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? "Failed to submit response");
  return json.data as CarDetail;
}

async function uploadFile(responseId: string, file: File): Promise<void> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/car/response/${responseId}/attachments`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "อัปโหลดไฟล์ไม่สำเร็จ");
  }
}

const INPUT_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors";

export default function CarRespondForm({ carId, defaultPosition = "", onSuccess }: Props) {
  const t = useT();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const methods = useForm<CarRespondInput>({
    resolver: zodResolver(carRespondSchema) as Resolver<CarRespondInput>,
    defaultValues: {
      responderPosition: defaultPosition,
      rootCausePerson: false,
      rootCauseMaterial: false,
      rootCauseMachine: false,
      rootCauseMethod: false,
      rootCauseOther: false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CarRespondInput) => {
      const car = await submitResponse(carId, data);
      const responseId = car.response?.id;
      if (responseId && selectedFiles.length > 0) {
        const results = await Promise.allSettled(
          selectedFiles.map((f) => uploadFile(responseId, f)),
        );
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          const msg = (failed[0] as PromiseRejectedResult).reason?.message ?? "อัปโหลดบางไฟล์ไม่สำเร็จ";
          throw new Error(msg);
        }
      }
      return car;
    },
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">

        {/* วิเคราะห์สาเหตุปัญหา — file upload */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">วิเคราะห์สาเหตุปัญหา</h3>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              + เพิ่มไฟล์
            </button>
            <p className="mt-1 text-xs text-slate-400">PDF, Word, Excel, PNG, JPG (สูงสุด 20 MB)</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
            {selectedFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {selectedFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="truncate max-w-xs">{f.name}</span>
                    <span className="text-xs text-slate-400">({Math.round(f.size / 1024)} KB)</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-rose-400 hover:text-rose-600 text-xs">ลบ</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Root cause */}
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

        {/* Actions */}
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

        {/* Responder position — auto-filled, still editable */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("car.respond.sectionResponder")}</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.positionLabel")}</label>
            <input
              {...register("responderPosition")}
              type="text"
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
