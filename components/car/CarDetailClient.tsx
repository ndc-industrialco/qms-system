"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Pencil, Send, ClipboardCheck } from "lucide-react";
import CarStatusBadge from "./CarStatusBadge";
import CarTimeline from "./CarTimeline";
import CarIssueDialog from "./CarIssueDialog";
import CarVerifyForm from "./CarVerifyForm";
import CarRespondForm from "./CarRespondForm";
import CarFormDrawer from "./CarFormDrawer";
import type { CarDetail } from "@/types/car";
import { CAR_SOURCE_LABELS } from "@/types/car";

interface Props {
  car: CarDetail;
  userRole: string;
  userId: string;
  userDepartmentId: string | null;
  isPrivileged: boolean;
}

async function fetchCar(id: string): Promise<CarDetail> {
  const res = await fetch(`/api/car/${id}`);
  if (!res.ok) throw new Error("Failed to fetch CAR");
  const json = await res.json();
  return json.data;
}

async function createReCar(carId: string): Promise<{ newCarId: string; newCarNo: string }> {
  const res = await fetch(`/api/car/${carId}/re-car`, { method: "POST" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to create Re-CAR");
  }
  const json = await res.json();
  return json.data;
}

export default function CarDetailClient({
  car: initialCar,
  userRole,
  userId: _userId,
  userDepartmentId,
  isPrivileged: _isPrivileged,
}: Props) {
  const t = useT();
  const qc = useQueryClient();
  void _userId;
  void _isPrivileged;
  const [showRespond, setShowRespond] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const { data: car = initialCar } = useQuery({
    queryKey: ["car", initialCar.id],
    queryFn: () => fetchCar(initialCar.id),
    initialData: initialCar,
  });

  const reCarMutation = useMutation({
    mutationFn: () => createReCar(car.id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["car", car.id] });
      window.location.href = `/qms/car/${result.newCarId}`;
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  const canRespond =
    car.status === "ISSUED" &&
    userDepartmentId === car.targetDepartment.id;

  const canVerify =
    (car.status === "VERIFY_1" || car.status === "VERIFY_2") &&
    (userRole === "QMS" || userRole === "IT");

  const canIssue =
    car.status === "DRAFT" &&
    (userRole === "QMS" || userRole === "IT");

  const canEdit =
    car.status === "DRAFT" &&
    (userRole === "QMS" || userRole === "IT");

  const canReCar =
    car.status === "RE_CAR" &&
    (userRole === "QMS" || userRole === "IT");

  const fmt = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{car.carNo}</h1>
            <CarStatusBadge status={car.status} />
            {car.reCar && (
              <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5 font-semibold">
                {t("car.detail.reCarBadge")}
              </span>
            )}
          </div>
          {car.reCarRef && (
            <p className="mt-1 text-sm text-slate-500">
              {t("car.detail.refLabel")}{" "}
              <Link href={`/qms/car/${car.reCarRef.id}`} className="text-blue-600 hover:underline font-mono">
                {car.reCarRef.carNo}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              {t("car.detail.btnEdit")}
            </Button>
          )}
          {canIssue && <CarIssueDialog carId={car.id} carNo={car.carNo} />}
          {canVerify && !showVerify && (
            <Button onClick={() => setShowVerify(true)} className="bg-orange-500 hover:bg-orange-600">
              <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
              {t("car.detail.btnVerify")}
            </Button>
          )}
          {canReCar && (
            <Button
              onClick={() => reCarMutation.mutate()}
              disabled={reCarMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {reCarMutation.isPending ? t("car.detail.btnCreatingReCar") : t("car.detail.btnCreateReCar")}
            </Button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
        <div>
          <p className="text-xs text-slate-500">{t("car.detail.labelType")}</p>
          <p className="text-sm font-medium text-slate-900">{CAR_SOURCE_LABELS[car.sourceType] ?? car.sourceType}</p>
          {car.sourceDetail && <p className="text-xs text-slate-500 mt-0.5">{car.sourceDetail}</p>}
        </div>
        <div>
          <p className="text-xs text-slate-500">{t("car.detail.labelTargetDept")}</p>
          <p className="text-sm font-medium text-slate-900">{car.targetDepartment.name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{t("car.detail.labelIssuer")}</p>
          <p className="text-sm font-medium text-slate-900">{car.issuer.name} ({car.issuerPosition})</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{t("car.detail.labelIso")}</p>
          <p className="text-sm font-medium text-slate-900">{car.isoStandards.join(", ") || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{t("car.detail.labelIssuedAt")}</p>
          <p className="text-sm font-medium">{fmt(car.issuedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{t("car.detail.labelDueAt")}</p>
          <p className={`text-sm font-medium ${car.responseDueAt && new Date(car.responseDueAt) < new Date() && car.status === "ISSUED" ? "text-rose-600" : ""}`}>
            {fmt(car.responseDueAt)}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-slate-500">{t("car.detail.labelDefect")}</p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{car.defectDetail}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-slate-500">{t("car.detail.labelNonConformance")}</p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{car.nonConformanceRef}</p>
        </div>
      </div>

      {/* Respond prompt (USER) */}
      {canRespond && !showRespond && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-blue-800">{t("car.detail.respondPrompt")}</p>
          <Button onClick={() => setShowRespond(true)} className="shrink-0">
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {t("car.detail.btnRespond")}
          </Button>
        </div>
      )}
      {showRespond && (
        <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">{t("car.detail.respondFormTitle")}</h2>
          <CarRespondForm carId={car.id} onSuccess={() => setShowRespond(false)} />
        </div>
      )}

      {/* Verify form (QMS) */}
      {showVerify && (
        <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            {t("car.detail.verifyTitle", { round: String(car.status === "VERIFY_2" ? 2 : 1) })}
          </h2>
          <CarVerifyForm
            carId={car.id}
            currentStatus={car.status}
            onSuccess={() => setShowVerify(false)}
          />
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">{t("car.detail.timelineTitle")}</h2>
        <CarTimeline car={car} />
      </div>

      {/* Response detail */}
      {car.response && (
        <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">{t("car.detail.responseTitle")}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">{t("car.detail.labelResponder")}</dt>
              <dd className="text-slate-800">{car.response.responder.name} ({car.response.responderPosition})</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t("car.detail.labelRespondedAt")}</dt>
              <dd className="text-slate-800">{fmt(car.response.respondedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t("car.detail.labelPlannedDate")}</dt>
              <dd className="text-slate-800">{fmt(car.response.plannedCompletionDate)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">{t("car.detail.labelWhyAnalysis")}</dt>
              <dd className="text-slate-800 whitespace-pre-wrap">{car.response.whyAnalysis}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">{t("car.detail.labelRootCause")}</dt>
              <dd className="text-slate-800">{car.response.rootCauseSummary}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">{t("car.detail.labelImmediateAction")}</dt>
              <dd className="text-slate-800 whitespace-pre-wrap">{car.response.immediateAction}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">{t("car.detail.labelPreventiveAction")}</dt>
              <dd className="text-slate-800 whitespace-pre-wrap">{car.response.preventiveAction}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Edit drawer */}
      <CarFormDrawer open={showEdit} onClose={() => setShowEdit(false)} editCar={car} />
    </div>
  );
}
