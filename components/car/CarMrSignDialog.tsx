"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

interface Props {
  carId: string;
  carNo: string;
  token: string;
}

async function signCar(carId: string, token: string, comment: string): Promise<void> {
  const res = await fetch(`/api/car/${carId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, comment: comment || undefined }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "ไม่สามารถลงนามได้");
  }
}

export default function CarMrSignDialog({ carId, carNo, token }: Props) {
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => signCar(carId, token, comment),
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-green-800">ลงนามปิด CAR สำเร็จ</h2>
        <p className="mt-1 text-sm text-green-700">CAR {carNo} ได้รับการปิดเรียบร้อยแล้ว</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm font-semibold text-blue-900">
          คุณกำลังลงนามปิด CAR หมายเลข{" "}
          <span className="font-mono">{carNo}</span>
        </p>
        <p className="mt-1 text-xs text-blue-700">
          การลงนามนี้เป็นการยืนยันว่า CAR ได้รับการแก้ไขเสร็จสิ้นแล้ว
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          หมายเหตุ (ถ้ามี)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="หมายเหตุเพิ่มเติม..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {mutation.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          {(mutation.error as Error).message}
        </p>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full rounded-md bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
      >
        {mutation.isPending ? "กำลังลงนาม..." : "ยืนยันการลงนามปิด CAR"}
      </button>
    </div>
  );
}
