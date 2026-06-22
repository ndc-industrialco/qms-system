"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

interface Props {
  carId: string;
  carNo: string;
  token?: string;
}

async function signCar(carId: string, token: string | undefined, comment: string): Promise<void> {
  const res = await fetch(`/api/car/${carId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(token ? { token } : {}),
      ...(comment ? { comment } : {}),
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to sign CAR");
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
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mb-3 text-4xl">OK</div>
        <h2 className="text-lg font-bold text-emerald-800">CAR sign-off completed</h2>
        <p className="mt-1 text-sm text-emerald-700">CAR {carNo} has been signed off successfully.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">
          You are signing off CAR <span className="font-mono">{carNo}</span>
        </p>
        <p className="mt-1 text-xs text-blue-700">
          This confirms the corrective action process has been completed and closed.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Comment</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Add an optional note..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {mutation.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {(mutation.error as Error).message}
        </p>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full rounded-md bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {mutation.isPending ? "Submitting..." : "Confirm CAR Sign-off"}
      </button>
    </div>
  );
}
