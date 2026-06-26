"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, XCircle, ShieldCheck, PenLine } from "lucide-react";
import type { CarDetail } from "@/types/car";
import type { SignatureType } from "@/types/dar";
import SignaturePad from "@/components/dar/SignaturePad";

interface Props {
  carId: string;
  car: CarDetail;
  token?: string;
  defaultAction?: "APPROVED" | "REJECTED";
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
}

async function submitReview(
  carId: string,
  token: string | undefined,
  action: "APPROVED" | "REJECTED",
  comment: string,
  signaturePath: string,
  signatureType: SignatureType,
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
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to submit review");
  }
}

function ResponseDetail({ response }: { response: NonNullable<CarDetail["response"]> }) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "long", year: "numeric" });

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
      {response.additionalToolDetail && (
        <Field label="Additional Tool" value={response.additionalToolDetail} multiline />
      )}
    </div>
  );
}

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

export default function CarMrResponseReviewPanel({
  carId, car, token, defaultAction, savedSignatureUrl, savedSignatureType,
}: Props) {
  const [action, setAction] = useState<"APPROVED" | "REJECTED">(defaultAction ?? "APPROVED");
  const [comment, setComment] = useState("");
  const [signatureData, setSignatureData] = useState<{ url: string; type: SignatureType } | null>(null);
  const [showPad, setShowPad] = useState(false);
  const [done, setDone] = useState(false);
  const [doneAction, setDoneAction] = useState<"APPROVED" | "REJECTED">("APPROVED");

  const mutation = useMutation({
    mutationFn: () => {
      if (!signatureData) throw new Error("กรุณาเซ็นลายมือชื่อก่อน");
      return submitReview(carId, token, action, comment, signatureData.url, signatureData.type);
    },
    onSuccess: () => {
      setDoneAction(action);
      setDone(true);
    },
  });

  if (done) {
    const approved = doneAction === "APPROVED";
    return (
      <div className={`rounded-2xl border p-12 text-center ${approved ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
        <div className="mb-4 flex justify-center">
          {approved ? <CheckCircle2 className="h-14 w-14 text-emerald-500" /> : <XCircle className="h-14 w-14 text-rose-500" />}
        </div>
        <h2 className={`text-xl font-bold ${approved ? "text-emerald-800" : "text-rose-800"}`}>
          {approved ? "อนุมัติแผนแก้ไขแล้ว" : "ปฏิเสธแผนแก้ไขแล้ว"}
        </h2>
        <p className={`mt-2 text-sm ${approved ? "text-emerald-700" : "text-rose-700"}`}>
          {approved
            ? `CAR ${car.carNo} พร้อมสำหรับการตรวจติดตามแล้ว`
            : `CAR ${car.carNo} ส่งคืนให้ ${car.targetDepartment.name} แก้ไขแผนใหม่`}
        </p>
      </div>
    );
  }

  if (showPad) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-700">ลายมือชื่อผู้แทนฝ่ายบริหาร (MR)</h3>
        <SignaturePad
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
          onConfirm={(url, type) => {
            setSignatureData({ url, type });
            setShowPad(false);
          }}
          onCancel={() => setShowPad(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">คุณได้รับมอบหมายให้ตรวจสอบคำขอนี้</p>
          <p className="mt-0.5 text-xs text-amber-700">กรุณาตรวจสอบรายละเอียดทั้งหมดด้านล่าง จากนั้นลงนามเพื่ออนุมัติหรือส่งคืนผู้จัดทำ</p>
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

        {/* Right — approval panel */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-700">ขั้นตอนการอนุมัติ</h3>

            {/* Action selector */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setAction("APPROVED")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-sm font-bold transition-all ${
                  action === "APPROVED"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                อนุมัติ
              </button>
              <button
                onClick={() => setAction("REJECTED")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-sm font-bold transition-all ${
                  action === "REJECTED"
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-rose-300"
                }`}
              >
                <XCircle className="h-4 w-4" />
                ส่งคืน
              </button>
            </div>

            {/* Comment */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                ความคิดเห็น{action === "REJECTED" && <span className="text-rose-500"> (แนะนำ)</span>}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={action === "REJECTED" ? "ระบุสิ่งที่ต้องแก้ไข..." : "เพิ่มหมายเหตุ (ถ้ามี)..."}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Signature */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                ลายมือชื่อ MR <span className="text-rose-500">*</span>
              </label>
              {signatureData ? (
                <div className="mb-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signatureData.url} alt="ลายมือชื่อ" className="h-14 w-full object-contain" />
                  </div>
                  <button
                    onClick={() => setShowPad(true)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                  >
                    เซ็นใหม่
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPad(true)}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-5 text-sm font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  <PenLine className="h-4 w-4" />
                  คลิกเพื่อเซ็นลายมือชื่อ
                </button>
              )}
            </div>

            {/* Info */}
            <div className={`mb-4 rounded-xl p-3 text-xs ${action === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {action === "APPROVED"
                ? "การอนุมัติจะย้าย CAR ไปขั้นตอนการตรวจติดตาม และแจ้งเตือนผู้รับผิดชอบถัดไป"
                : `การส่งคืนจะส่ง CAR กลับให้ ${car.targetDepartment.name} แก้ไขแผนใหม่`}
            </div>

            {mutation.error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {(mutation.error as Error).message}
              </div>
            )}

            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !signatureData}
              className={`w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60 transition-colors ${
                action === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {mutation.isPending
                ? "กำลังบันทึก..."
                : action === "APPROVED"
                  ? "ยืนยันการอนุมัติ"
                  : "ยืนยันการส่งคืน"}
            </button>

            {!signatureData && (
              <p className="mt-2 text-center text-xs text-slate-400">กรุณาเซ็นลายมือชื่อก่อนยืนยัน</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
