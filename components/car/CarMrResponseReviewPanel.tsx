"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, ClipboardList } from "lucide-react";
import type { CarDetail } from "@/types/car";

interface Props {
  carId: string;
  car: CarDetail;
  token: string;
  defaultAction?: "APPROVED" | "REJECTED";
}

async function submitReview(
  carId: string,
  token: string,
  action: "APPROVED" | "REJECTED",
  comment: string
): Promise<void> {
  const res = await fetch(`/api/car/${carId}/review-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action, comment: comment || undefined }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "ไม่สามารถบันทึกการตรวจสอบได้");
  }
}

function ResponseDetail({ response }: { response: NonNullable<CarDetail["response"]> }) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "long", year: "numeric" });

  const rootCauses = [
    response.rootCausePerson && "คน (Person)",
    response.rootCauseMaterial && "วัสดุ (Material)",
    response.rootCauseMachine && "เครื่องจักร (Machine)",
    response.rootCauseMethod && "วิธีการ (Method)",
    response.rootCauseOther && `อื่นๆ: ${response.rootCauseOtherDetail ?? ""}`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-3">
      <Row label="ผู้ตอบกลับ" value={`${response.responder.name ?? "-"} (${response.responderPosition})`} />
      <Row label="วันที่วางแผนเสร็จ" value={fmt(response.plannedCompletionDate)} highlight />
      <Divider />
      <Row label="การวิเคราะห์ Why-Why" value={response.whyAnalysis} multiline />
      <Row label="สาเหตุหลัก (5M)" value={rootCauses.join(", ") || "-"} />
      <Row label="สรุปสาเหตุหลัก" value={response.rootCauseSummary} multiline />
      <Divider />
      <Row label="มาตรการแก้ไขเบื้องต้น" value={response.immediateAction} multiline />
      <Row label="มาตรการป้องกัน" value={response.preventiveAction} multiline />
      {response.additionalToolDetail && (
        <Row label="เครื่องมือเพิ่มเติม" value={response.additionalToolDetail} multiline />
      )}
    </div>
  );
}

function Row({ label, value, multiline, highlight }: { label: string; value: string; multiline?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-0.5 text-sm ${highlight ? "font-bold text-blue-700" : "text-slate-800"} ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Divider() {
  return <hr className="border-slate-100" />;
}

export default function CarMrResponseReviewPanel({ carId, car, token, defaultAction }: Props) {
  const [action, setAction] = useState<"APPROVED" | "REJECTED">(defaultAction ?? "APPROVED");
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [doneAction, setDoneAction] = useState<"APPROVED" | "REJECTED">("APPROVED");

  const mutation = useMutation({
    mutationFn: () => submitReview(carId, token, action, comment),
    onSuccess: () => {
      setDoneAction(action);
      setDone(true);
    },
  });

  if (done) {
    const approved = doneAction === "APPROVED";
    return (
      <div className={`rounded-xl border p-8 text-center ${approved ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
        <div className="flex justify-center mb-3">
          {approved
            ? <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            : <XCircle className="w-12 h-12 text-rose-500" />}
        </div>
        <h2 className={`text-lg font-bold ${approved ? "text-emerald-800" : "text-rose-800"}`}>
          {approved ? "อนุมัติแผนการแก้ไขแล้ว" : "ปฏิเสธแผนการแก้ไขแล้ว"}
        </h2>
        <p className={`mt-1 text-sm ${approved ? "text-emerald-700" : "text-rose-700"}`}>
          {approved
            ? `CAR ${car.carNo} พร้อมสำหรับการติดตามผลการแก้ไข (Verify) แล้ว`
            : `แผนกได้รับแจ้งให้แก้ไขและตอบกลับใหม่สำหรับ CAR ${car.carNo}`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CAR Info */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-slate-800">{car.carNo}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium border border-blue-200">
            {car.targetDepartment.name}
          </span>
        </div>
        <p className="text-xs text-slate-500">{car.defectDetail}</p>
        <p className="text-xs text-slate-400">ข้อกำหนด: {car.nonConformanceRef}</p>
      </div>

      {/* Response Details */}
      {car.response ? (
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">แผนการแก้ไขที่แผนกตอบกลับมา</h3>
          </div>
          <ResponseDetail response={car.response} />
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center text-sm text-amber-700">
          ยังไม่มีข้อมูลการตอบกลับจากแผนก
        </div>
      )}

      {/* Action Selection */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setAction("APPROVED")}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all ${
            action === "APPROVED"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          อนุมัติแผน
        </button>
        <button
          onClick={() => setAction("REJECTED")}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all ${
            action === "REJECTED"
              ? "border-rose-500 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-white text-slate-500 hover:border-rose-300"
          }`}
        >
          <XCircle className="w-4 h-4" />
          ปฏิเสธแผน
        </button>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          หมายเหตุ{action === "REJECTED" && <span className="text-rose-500"> (แนะนำให้ระบุเหตุผล)</span>}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={action === "REJECTED" ? "ระบุเหตุผลที่ปฏิเสธ เช่น แผนไม่ครอบคลุมสาเหตุหลัก..." : "หมายเหตุเพิ่มเติม (ถ้ามี)"}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Error */}
      {mutation.error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2 border border-rose-200">
          {(mutation.error as Error).message}
        </p>
      )}

      {/* Confirm */}
      <div className={`rounded-lg p-3 text-xs ${action === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
        {action === "APPROVED"
          ? `การอนุมัติจะเปลี่ยนสถานะ CAR เป็น "รอติดตามครั้งที่ 1" และแจ้ง QMS + แผนก`
          : `การปฏิเสธจะส่ง CAR กลับไปยังแผนก "${car.targetDepartment.name}" เพื่อแก้ไขแผนและตอบกลับใหม่`}
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className={`w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60 transition-colors ${
          action === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
        }`}
      >
        {mutation.isPending
          ? "กำลังบันทึก..."
          : action === "APPROVED"
          ? "ยืนยัน — อนุมัติแผนการแก้ไข"
          : "ยืนยัน — ปฏิเสธแผนการแก้ไข"}
      </button>
    </div>
  );
}
