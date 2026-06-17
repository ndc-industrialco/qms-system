"use client";

import { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDepartments } from "@/hooks/api/use-departments";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { carCreateSchema, type CarCreateInput } from "@/lib/validations/car";
import { ISO_STANDARDS, CAR_SOURCE_LABELS } from "@/types/car";
import type { CarSourceType, CarDetail } from "@/types/car";
import GraphUserPicker, { type GraphUserResult } from "@/components/shared/GraphUserPicker";
import GraphGroupPicker, { type GraphGroupResult } from "@/components/shared/GraphGroupPicker";

interface Props {
  open: boolean;
  onClose: () => void;
  editCar?: CarDetail;
  onSuccess?: (car: CarDetail) => void;
}

async function saveCar(data: CarCreateInput, editId?: string): Promise<CarDetail> {
  const url = editId ? `/api/car/${editId}` : "/api/car";
  const method = editId ? "PATCH" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to save CAR");
  }
  const json = await res.json();
  return json.data;
}

const SOURCE_TYPES: CarSourceType[] = ["I", "C", "N", "O"];

const INPUT_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors";

export default function CarFormModal({ open, onClose, editCar, onSuccess }: Props) {
  const t = useT();
  const qc = useQueryClient();

  const [selectedIssuer, setSelectedIssuer] = useState<GraphUserResult | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GraphGroupResult | null>(null);
  const [issuerError, setIssuerError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);

  const { data: departments = [] } = useDepartments();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<CarCreateInput>({
    resolver: zodResolver(carCreateSchema) as Resolver<CarCreateInput>,
    defaultValues: { sourceType: "I", isoStandards: [], reCar: false },
  });

  useEffect(() => {
    if (!open) return;
    if (editCar) {
      reset({
        sourceType: editCar.sourceType as CarSourceType,
        sourceDetail: editCar.sourceDetail ?? undefined,
        isoStandards: editCar.isoStandards,
        defectDetail: editCar.defectDetail,
        nonConformanceRef: editCar.nonConformanceRef,
        issuerId: editCar.issuer.id,
        issuerPosition: editCar.issuerPosition,
        targetDepartmentId: editCar.targetDepartment.id,
        targetEmailGroup: editCar.targetEmailGroup ?? undefined,
        reCar: editCar.reCar,
        reCarRefId: editCar.reCarRefId ?? undefined,
      });
      setSelectedIssuer(
        editCar.issuer
          ? { id: editCar.issuer.id, name: editCar.issuer.name ?? "", email: "", employeeId: editCar.issuer.employeeId, department: null, jobTitle: editCar.issuerPosition }
          : null
      );
      if (editCar.targetEmailGroup) {
        setSelectedGroup({ id: "", displayName: editCar.targetEmailGroup, mail: editCar.targetEmailGroup, description: null });
      } else {
        setSelectedGroup(null);
      }
    } else {
      reset({ sourceType: "I", isoStandards: [], reCar: false });
      setSelectedIssuer(null);
      setSelectedGroup(null);
    }
    setIssuerError(null);
    setGroupError(null);
  }, [editCar, open, reset]);

  function handleIssuerChange(user: GraphUserResult | null) {
    setSelectedIssuer(user);
    setIssuerError(null);
    if (user) {
      setValue("issuerId", user.id);
      if (user.jobTitle) setValue("issuerPosition", user.jobTitle);
    } else {
      setValue("issuerId", undefined);
    }
  }

  function handleGroupChange(group: GraphGroupResult | null) {
    setSelectedGroup(group);
    setGroupError(null);
    setValue("targetEmailGroup", group?.mail ?? undefined);
  }

  const selectedDeptId = watch("targetDepartmentId");
  const selectedDept = departments.find((d) => d.id === selectedDeptId) as (typeof departments[0] & { emailGroup?: string | null }) | undefined;
  useEffect(() => {
    if (selectedDept?.emailGroup && !selectedGroup && !editCar) {
      setSelectedGroup({ id: "", displayName: selectedDept.name, mail: selectedDept.emailGroup, description: null });
      setValue("targetEmailGroup", selectedDept.emailGroup);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeptId]);

  const selectedIso = watch("isoStandards") ?? [];
  const isReCar = watch("reCar");

  function validate(): boolean {
    let ok = true;
    if (!selectedIssuer) { setIssuerError(t("car.form.issuerRequired")); ok = false; }
    return ok;
  }

  const mutation = useMutation({
    mutationFn: (data: CarCreateInput) => saveCar(data as CarCreateInput, editCar?.id),
    onSuccess: (car) => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      if (editCar) qc.invalidateQueries({ queryKey: ["car", editCar.id] });
      onSuccess?.(car);
      onClose();
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  function onSubmit(data: CarCreateInput) {
    if (!validate()) return;
    mutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b border-slate-100">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {editCar ? t("car.form.editTitle", { carNo: editCar.carNo }) : t("car.form.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <form id="car-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── ส่วนที่ 1 ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("car.form.section1")}
            </h3>
            <div className="space-y-2">
              {SOURCE_TYPES.map((type) => (
                <label key={type} className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" {...register("sourceType")} value={type} className="mt-0.5 h-4 w-4 text-primary border-slate-300" />
                  <span className="text-sm text-slate-700">{CAR_SOURCE_LABELS[type]}</span>
                </label>
              ))}
            </div>
            <input
              {...register("sourceDetail")}
              type="text"
              placeholder={t("car.form.sourceDetailPlaceholder")}
              className={INPUT_CLASS}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("reCar")} className="h-4 w-4 rounded border-slate-300 text-primary" />
              <span className="text-sm font-medium text-slate-700">{t("car.form.reCarCheckbox")}</span>
            </label>
            {isReCar && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("car.form.reCarRefLabel")}</label>
                <input
                  {...register("reCarRefId")}
                  type="text"
                  placeholder={t("car.form.reCarRefPlaceholder")}
                  className={INPUT_CLASS}
                />
              </div>
            )}
          </section>

          {/* ── ส่วนที่ 2 ── */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("car.form.section2")}
            </h3>
            {errors.isoStandards && <p className="text-xs text-rose-500">{errors.isoStandards.message}</p>}
            {ISO_STANDARDS.map((std) => (
              <label key={std} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  value={std}
                  checked={selectedIso.includes(std)}
                  onChange={(e) => {
                    setValue(
                      "isoStandards",
                      e.target.checked ? [...selectedIso, std] : selectedIso.filter((s) => s !== std)
                    );
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-primary"
                />
                <span className="text-sm text-slate-700">{std}</span>
              </label>
            ))}
          </section>

          {/* ── ส่วนที่ 3 ── */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("car.form.section3")}
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.form.defectLabel")}</label>
              <textarea
                {...register("defectDetail")}
                rows={3}
                className={cn(INPUT_CLASS, "resize-none")}
              />
              {errors.defectDetail && <p className="mt-1 text-xs text-rose-500">{errors.defectDetail.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.form.nonConformanceLabel")}</label>
              <textarea
                {...register("nonConformanceRef")}
                rows={2}
                className={cn(INPUT_CLASS, "resize-none")}
              />
              {errors.nonConformanceRef && <p className="mt-1 text-xs text-rose-500">{errors.nonConformanceRef.message}</p>}
            </div>
          </section>

          {/* ── ส่วนที่ 4 ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("car.form.section4")}
            </h3>
            <GraphUserPicker
              label={t("car.form.issuerPickerLabel")}
              value={selectedIssuer}
              onChange={handleIssuerChange}
              placeholder={t("car.form.issuerPickerPlaceholder")}
              required
              error={issuerError ?? undefined}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.form.issuerPositionLabel")}</label>
              <input
                {...register("issuerPosition")}
                type="text"
                placeholder={t("car.form.issuerPositionPlaceholder")}
                className={INPUT_CLASS}
              />
              {errors.issuerPosition && <p className="mt-1 text-xs text-rose-500">{errors.issuerPosition.message}</p>}
            </div>
          </section>

          {/* ── ส่วนที่ 5 ── */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("car.form.section5")}
            </h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.form.deptLabel")}</label>
              <select
                {...register("targetDepartmentId")}
                className={INPUT_CLASS}
              >
                <option value="">{t("car.form.deptPlaceholder")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.targetDepartmentId && (
                <p className="mt-1 text-xs text-rose-500">{errors.targetDepartmentId.message}</p>
              )}
            </div>

            <GraphGroupPicker
              label={t("car.form.groupPickerLabel")}
              value={selectedGroup}
              onChange={handleGroupChange}
              placeholder={t("car.form.groupPickerPlaceholder")}
              error={groupError ?? undefined}
            />
            <input type="hidden" {...register("targetEmailGroup")} />
            {selectedGroup?.mail && (
              <p className="text-xs text-slate-500">
                📧 {t("car.form.groupMailHint")} <span className="font-mono">{selectedGroup.mail}</span>
              </p>
            )}
          </section>

        </form>

        <DialogFooter className="px-6 py-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="car-form" disabled={mutation.isPending}>
            {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />}
            {mutation.isPending ? t("car.form.btnSaving") : editCar ? t("car.form.btnSave") : t("car.form.btnCreate2")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
