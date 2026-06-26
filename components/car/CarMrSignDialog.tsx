"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, PenLine, ShieldCheck } from "lucide-react";
import type { CarDetail } from "@/types/car";
import type { SignatureType } from "@/types/dar";
import SignaturePad from "@/components/dar/SignaturePad";

interface Props {
  carId: string;
  car: CarDetail;
  token?: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
}

async function submitSignoff(
  carId: string,
  token: string | undefined,
  comment: string,
  signaturePath: string,
  signatureType: SignatureType,
): Promise<void> {
  const res = await fetch(`/api/car/${carId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(token ? { token } : {}),
      ...(comment ? { comment } : {}),
      signaturePath,
      signatureType,
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to sign off CAR");
  }
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-medium text-slate-800 ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export default function CarMrSignDialog({ carId, car, token, savedSignatureUrl, savedSignatureType }: Props) {
  const [comment, setComment] = useState("");
  const [signatureData, setSignatureData] = useState<{ url: string; type: SignatureType } | null>(null);
  const [showPad, setShowPad] = useState(false);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!signatureData) throw new Error("กรุณาเซ็นลายมือชื่อก่อน");
      return submitSignoff(carId, token, comment, signatureData.url, signatureData.type);
    },
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-12 text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-emerald-800">ปิด CAR แล้ว</h2>
        <p className="mt-2 text-sm text-emerald-700">CAR {car.carNo} ได้รับการลงนามปิดเรียบร้อยแล้ว</p>
      </div>
    );
  }

  if (showPad) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-700">ลายมือชื่อ MR</h3>
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

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-5">
      {/* Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">ลงนามปิด CAR</p>
          <p className="mt-0.5 text-xs text-amber-700">CAR ผ่านการตรวจติดตามแล้ว กรุณาลงนามเพื่อปิดอย่างเป็นทางการ</p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/car" className="hover:text-slate-600 transition-colors">CAR</Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <Link href={`/car/${carId}`} className="font-mono hover:text-slate-600 transition-colors">{car.carNo}</Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-slate-600 font-medium">ลงนามปิด</span>
      </nav>

      {/* 2-column body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left — CAR info */}
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

          {car.response && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-700">แผนการดำเนินการแก้ไข</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="ผู้ตอบกลับ" value={car.response.responder.name ?? "-"} />
                <Field label="วันที่แผนกำหนดเสร็จ" value={fmt(car.response.plannedCompletionDate)} />
                <Field label="การดำเนินการทันที" value={car.response.immediateAction} multiline />
                <Field label="การดำเนินการป้องกัน" value={car.response.preventiveAction} multiline />
              </div>
            </div>
          )}

          {car.verifications.length > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">ผลการตรวจติดตาม</p>
              {car.verifications.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">รอบที่ {v.round} — {v.verifier.name ?? "-"}</span>
                  <span className={`font-semibold ${v.result === "PASSED" ? "text-emerald-700" : "text-rose-700"}`}>
                    {v.result === "PASSED" ? "ผ่าน" : "ไม่ผ่าน"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — sign panel */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-700">ลายมือชื่อ MR</h3>

            {/* Signature preview / capture */}
            {signatureData ? (
              <div className="mb-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <Image src={signatureData.url} alt="ลายมือชื่อ" width={400} height={64} className="h-16 w-full object-contain" unoptimized />
                </div>
                <button
                  onClick={() => setShowPad(true)}
                  className="mt-2 w-full rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
                >
                  เซ็นใหม่
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPad(true)}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-6 text-sm font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                <PenLine className="h-4 w-4" />
                คลิกเพื่อเซ็นลายมือชื่อ
              </button>
            )}

            {/* Comment */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">หมายเหตุ (ถ้ามี)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="เพิ่มหมายเหตุ..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
              การลงนามจะปิด CAR อย่างเป็นทางการและแจ้งเตือนผู้เกี่ยวข้องทั้งหมด
            </div>

            {mutation.error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {(mutation.error as Error).message}
              </div>
            )}

            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !signatureData}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {mutation.isPending ? "กำลังบันทึก..." : "ยืนยันลงนามปิด CAR"}
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
