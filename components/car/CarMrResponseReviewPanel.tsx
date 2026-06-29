"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, XCircle, ShieldCheck } from "lucide-react";
import type { CarDetail } from "@/types/car";
import type { SignatureType } from "@/types/dar";
import { toast } from "sonner";
import ApproveSignatureSection, { type SigMode } from "@/components/shared/ApproveSignatureSection";

interface Props {
  carId: string;
  car: CarDetail;
  token?: string;
  defaultAction?: "APPROVED" | "REJECTED";
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onSuccess?: () => void;
}

async function submitReview(
  carId: string,
  token: string | undefined,
  action: "APPROVED" | "REJECTED",
  comment: string,
  signaturePath: string,
  signatureType: SignatureType,
  saveToProfile: boolean,
): Promise<void> {
  const res = await fetch(`/api/car/${carId}/review-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(token ? { token } : {}),
      action,
      ...(comment ? { comment } : {}),
      signaturePath,
      signatureType,
      saveToProfile,
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "ไม่สามารถบันทึกการตรวจสอบได้");
  }
}

// ── Approval timeline ─────────────────────────────────────────────────────────

function ApprovalTimeline({ car }: { car: CarDetail }) {
  const steps = [
    { label: "ผู้จัดทำ", sublabel: car.issuer?.name ?? "-", status: "done" as const, signatureUrl: car.issuerSignaturePath ?? null },
    { label: "ผู้ตอบกลับ", sublabel: car.response?.responder?.name ?? "-", status: "done" as const, signatureUrl: car.response?.responderSignaturePath ?? null },
    { label: "ผู้แทนฝ่ายบริหาร (MR)", sublabel: "รอการอนุมัติ", status: "pending" as const, signatureUrl: null },
    { label: "ขั้นตอนถัดไป", sublabel: "การตรวจติดตาม", status: "waiting" as const, signatureUrl: null },
  ];

  return (
    <div className="flex flex-col">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 shadow-sm ${
                step.status === "done" ? "bg-emerald-500 border-emerald-500 text-white"
                : step.status === "pending" ? "bg-white border-amber-300 text-amber-500"
                : "bg-white border-slate-200 text-slate-300"
              }`}>
                {step.status === "done"
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                  : <span className="text-sm font-bold">{idx + 1}</span>}
              </div>
              {!isLast && <div className={`w-0.5 flex-1 my-1 ${step.status === "done" ? "bg-emerald-200" : "bg-slate-100"}`} style={{ minHeight: 24 }} />}
            </div>
            <div className="pb-5 flex-1 min-w-0 mt-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-700">{step.label}</span>
                {step.status === "done" && <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">อนุมัติแล้ว</span>}
                {step.status === "pending" && <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">รออนุมัติ</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{step.sublabel}</p>
              {step.signatureUrl && (
                <div className="mt-1.5 rounded-lg border border-slate-100 bg-white p-2 w-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.signatureUrl} alt="ลายมือชื่อ" className="h-8 w-full object-contain" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Detail renderers ──────────────────────────────────────────────────────────

function Field({ label, value, multiline, highlight }: { label: string; value: string; multiline?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${highlight ? "text-blue-700" : "text-slate-800"} ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function ResponseDetail({ response }: { response: NonNullable<CarDetail["response"]> }) {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "long", year: "numeric" });

  const rootCauses = [
    response.rootCausePerson && "Person",
    response.rootCauseMaterial && "Material",
    response.rootCauseMachine && "Machine",
    response.rootCauseMethod && "Method",
    response.rootCauseOther && `Other: ${response.rootCauseOtherDetail ?? ""}`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="ผู้ตอบกลับ / Responder" value={`${response.responder.name ?? "-"} (${response.responderPosition})`} />
        <Field label="วันที่แผนกำหนดเสร็จ / Planned Completion" value={fmt(response.plannedCompletionDate)} highlight />
      </div>
      <hr className="border-slate-100" />
      {response.responseType === "FIVE_WHY" && response.fiveWhys && response.fiveWhys.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">5 Whys Analysis</p>
          <div className="space-y-2">
            {response.fiveWhys.map((w, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="text-xs font-medium text-slate-500">Why {i + 1}: {w.question}</p>
                <p className="mt-0.5 text-slate-800">{w.answer || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Field label="Why-Why Analysis" value={response.whyAnalysis} multiline />
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Root Cause (5M)" value={rootCauses.join(", ") || "-"} />
        <Field label="Root Cause Summary" value={response.rootCauseSummary} multiline />
      </div>
      <hr className="border-slate-100" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Immediate Action" value={response.immediateAction} multiline />
        <Field label="Preventive Action" value={response.preventiveAction} multiline />
      </div>
      {response.additionalToolDetail && <Field label="Additional Tool" value={response.additionalToolDetail} multiline />}
    </div>
  );
}

// ── Action modal ──────────────────────────────────────────────────────────────

interface ActionModalProps {
  carId: string;
  car: CarDetail;
  token?: string;
  action: "APPROVED" | "REJECTED";
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onClose: () => void;
  onDone: (action: "APPROVED" | "REJECTED") => void;
}

function ActionModal({ carId, car, token, action, savedSignatureUrl, savedSignatureType, onClose, onDone }: ActionModalProps) {
  const isApprove = action === "APPROVED";
  const [comment, setComment] = useState("");
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [sigType, setSigType] = useState<SigMode>("DRAW");
  const [saveToProfile, setSaveToProfile] = useState(false);

  const handleSigChange = useCallback((url: string | null, type: SigMode) => {
    setSigDataUrl(url);
    setSigType(type);
  }, []);

  const mutation = useMutation({
    mutationFn: () => {
      if (!sigDataUrl) throw new Error("กรุณาเซ็นลายมือชื่อก่อน");
      return submitReview(carId, token, action, comment, sigDataUrl, sigType as SignatureType, saveToProfile);
    },
    onSuccess: () => onDone(action),
    onError: (err: Error) => toast.error(err.message),
  });

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-122 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative z-123 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isApprove ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}>
          <div className="flex items-center gap-2">
            {isApprove
              ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              : <XCircle className="h-5 w-5 text-rose-600" />}
            <span className={`font-bold text-sm ${isApprove ? "text-emerald-800" : "text-rose-800"}`}>
              {isApprove ? "อนุมัติแผนแก้ไข" : "ส่งคืนแผนแก้ไข"}
            </span>
            <span className="font-mono text-xs text-slate-400">{car.carNo}</span>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Info banner */}
          <div className={`rounded-xl px-3 py-2.5 text-xs ${isApprove ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {isApprove
              ? "การอนุมัติจะย้าย CAR ไปขั้นตอนการตรวจติดตาม และแจ้งเตือนผู้รับผิดชอบถัดไป"
              : `การส่งคืนจะส่ง CAR กลับให้ ${car.targetDepartment.name} แก้ไขแผนใหม่`}
          </div>

          {/* Comment */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              ความคิดเห็น{!isApprove && <span className="ml-1 text-rose-500">(แนะนำ)</span>}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={isApprove ? "เพิ่มหมายเหตุ (ถ้ามี)..." : "ระบุสิ่งที่ต้องแก้ไข..."}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Signature */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              ลายมือชื่อ MR <span className="text-rose-500">*</span>
            </label>
            {sigDataUrl ? (
              <div className="flex flex-col gap-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sigDataUrl} alt="ลายมือชื่อ" className="h-14 w-full object-contain" />
                </div>
                <button type="button" onClick={() => setSigDataUrl(null)}
                  className="w-full rounded-xl border border-slate-200 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">
                  เซ็นใหม่
                </button>
              </div>
            ) : (
              <ApproveSignatureSection
                savedSignatureUrl={savedSignatureUrl}
                savedSignatureType={savedSignatureType}
                onSignatureChange={handleSigChange}
                onSaveChange={setSaveToProfile}
              />
            )}
          </div>

          {mutation.error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {(mutation.error as Error).message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-white transition-colors">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !sigDataUrl}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60 transition-colors ${
              isApprove ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {mutation.isPending ? "กำลังบันทึก..." : isApprove ? "ยืนยันอนุมัติ" : "ยืนยันส่งคืน"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CarMrResponseReviewPanel({
  carId, car, token, defaultAction, savedSignatureUrl, savedSignatureType, onSuccess,
}: Props) {
  const [modal, setModal] = useState<"APPROVED" | "REJECTED" | null>(
    defaultAction ?? null
  );
  const [done, setDone] = useState(false);
  const [doneAction, setDoneAction] = useState<"APPROVED" | "REJECTED">("APPROVED");

  function handleDone(action: "APPROVED" | "REJECTED") {
    setModal(null);
    setDoneAction(action);
    setDone(true);
    onSuccess?.();
  }

  if (done) {
    const approved = doneAction === "APPROVED";
    return (
      <div className={`rounded-2xl border p-12 text-center ${approved ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
        <div className="mb-4 flex justify-center">
          {approved ? <CheckCircle2 className="h-14 w-14 text-emerald-500" /> : <XCircle className="h-14 w-14 text-rose-500" />}
        </div>
        <h2 className={`text-xl font-bold ${approved ? "text-emerald-800" : "text-rose-800"}`}>
          {approved ? "อนุมัติแผนแก้ไขแล้ว" : "ส่งคืนแผนแก้ไขแล้ว"}
        </h2>
        <p className={`mt-2 text-sm ${approved ? "text-emerald-700" : "text-rose-700"}`}>
          {approved
            ? `CAR ${car.carNo} พร้อมสำหรับการตรวจติดตามแล้ว`
            : `CAR ${car.carNo} ส่งคืนให้ ${car.targetDepartment.name} แก้ไขแผนใหม่`}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">คุณได้รับมอบหมายให้ตรวจสอบคำขอนี้</p>
            <p className="mt-0.5 text-xs text-amber-700">กรุณาตรวจสอบรายละเอียดทั้งหมดด้านล่าง จากนั้นกดอนุมัติหรือส่งคืนผู้จัดทำ</p>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/car" className="hover:text-slate-600 transition-colors">CAR</Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <Link href={`/car/${carId}`} className="font-mono hover:text-slate-600 transition-colors">{car.carNo}</Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="text-slate-600 font-medium">ตรวจสอบแผนแก้ไข</span>
        </nav>

        {/* 2-column body */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left — CAR info + response detail */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">เลขที่ CAR</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-slate-900">{car.carNo}</p>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {car.targetDepartment.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="ประเด็น / Issue" value={car.defectDetail ?? "-"} multiline />
                <Field label="อ้างอิง / Reference" value={car.nonConformanceRef ?? "-"} />
              </div>
            </div>

            {car.response ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">แผนการดำเนินการแก้ไข / Corrective Action Plan</h3>
                </div>
                <ResponseDetail response={car.response} />
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-700">
                ยังไม่มีการตอบกลับจากหน่วยงาน
              </div>
            )}
          </div>

          {/* Right — timeline + action buttons */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-700 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                ขั้นตอนการอนุมัติ
              </h3>
              <ApprovalTimeline car={car} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-700">ขั้นตอนของคุณ: ผู้แทนฝ่ายบริหาร</h3>
              <button
                type="button"
                onClick={() => setModal("APPROVED")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-emerald-50 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                อนุมัติแผนแก้ไข
              </button>
              <button
                type="button"
                onClick={() => setModal("REJECTED")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-rose-400 bg-rose-50 py-3 text-sm font-bold text-rose-600 hover:bg-rose-100 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                ส่งคืนแก้ไขแผน
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action modal */}
      {modal && (
        <ActionModal
          carId={carId}
          car={car}
          token={token}
          action={modal}
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
          onClose={() => setModal(null)}
          onDone={handleDone}
        />
      )}
    </>
  );
}
