"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { carVerifySchema, type CarVerifyInput } from "@/lib/validations/car";
import SignaturePad from "@/components/dar/SignaturePad";
import type { CarStatus } from "@/types/car";
import type { SignatureType } from "@/types/dar";

interface Props {
  carId: string;
  currentStatus: CarStatus;
  defaultPosition?: string;
  onSuccess?: () => void;
}

function getRound(status: CarStatus): 1 | 2 {
  return status === "VERIFY_2" ? 2 : 1;
}

async function submitVerification(carId: string, data: CarVerifyInput): Promise<void> {
  const res = await fetch(`/api/car/${carId}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to submit verification");
  }
}

const INPUT_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors";

export default function CarVerifyForm({ carId, currentStatus, defaultPosition = "", onSuccess }: Props) {
  const t = useT();
  const round = getRound(currentStatus);
  const [showSignPad, setShowSignPad] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<CarVerifyInput>({
    resolver: zodResolver(carVerifySchema),
    defaultValues: { round, result: "PASSED", verifierSignaturePath: "", verifierPosition: defaultPosition },
  });

  const resultValue = watch("result");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CarVerifyInput) => submitVerification(carId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["car", carId] });
      qc.invalidateQueries({ queryKey: ["cars"] });
      toast.success(t("car.verify.successMsg"), { duration: 3000 });
      onSuccess?.();
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  function handleSignConfirm(dataUrl: string, _type: SignatureType, _save: boolean) {
    setValue("verifierSignaturePath", dataUrl, { shouldValidate: true });
    setSignaturePreview(dataUrl);
    setShowSignPad(false);
  }

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <input type="hidden" {...register("round", { valueAsNumber: true })} />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t("car.verify.findingsLabel")}
        </label>
        <textarea
          {...register("findings")}
          rows={4}
          placeholder={t("car.verify.findingsPlaceholder")}
          className={cn(INPUT_CLASS, "resize-none")}
        />
        {errors.findings && <p className="mt-1 text-xs text-rose-500">{errors.findings.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">{t("car.verify.resultLabel")}</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" {...register("result")} value="PASSED" className="h-4 w-4 text-primary border-slate-300" />
          <span className="text-sm text-emerald-700 font-medium">{t("car.verify.resultPassed")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" {...register("result")} value="FAILED" className="h-4 w-4 text-primary border-slate-300" />
          <span className="text-sm text-rose-700 font-medium">
            {round === 2 ? t("car.verify.resultFailed2") : t("car.verify.resultFailed1")}
          </span>
        </label>
      </div>

      {resultValue === "FAILED" && round === 1 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("car.verify.nextDueDateLabel")}
          </label>
          <input
            type="date"
            {...register("nextDueDate")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors"
          />
          {errors.nextDueDate && <p className="mt-1 text-xs text-rose-500">{errors.nextDueDate.message}</p>}
        </div>
      )}

      {resultValue === "FAILED" && round === 2 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-amber-600 text-base shrink-0">⚠️</span>
          <p className="text-sm text-amber-800">{t("car.verify.reCarWarning")}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.verify.verifierPositionLabel")}</label>
        <input
          {...register("verifierPosition")}
          type="text"
          disabled={!!defaultPosition}
          placeholder={t("car.verify.verifierPositionPlaceholder")}
          className={cn(INPUT_CLASS, defaultPosition && "bg-slate-50 text-slate-500 cursor-not-allowed")}
        />
        {errors.verifierPosition && <p className="mt-1 text-xs text-rose-500">{errors.verifierPosition.message}</p>}
      </div>

      {/* Verifier signature */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          ลายเซ็นผู้ตรวจติดตาม
        </label>
        {signaturePreview ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signaturePreview} alt="ลายเซ็น" className="h-10 object-contain" />
            <button
              type="button"
              onClick={() => { setSignaturePreview(null); setValue("verifierSignaturePath", "", { shouldValidate: true }); setShowSignPad(true); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              เปลี่ยน
            </button>
          </div>
        ) : showSignPad ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <SignaturePad
              onConfirm={handleSignConfirm}
              onCancel={() => setShowSignPad(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSignPad(true)}
            className="rounded-xl border border-dashed border-slate-300 w-full py-4 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
          >
            คลิกเพื่อเซ็นลายเซ็น
          </button>
        )}
        {errors.verifierSignaturePath && (
          <p className="mt-1 text-xs text-rose-500">{errors.verifierSignaturePath.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />}
          {mutation.isPending ? t("car.verify.btnSaving") : t("car.verify.btnSave", { round: String(round) })}
        </Button>
      </div>
    </form>
  );
}
