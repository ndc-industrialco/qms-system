"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import type { CarDetail } from "@/types/car";

interface Props {
  carId: string;
  car: CarDetail;
  token?: string;
  defaultAction?: "APPROVED" | "REJECTED";
}

async function submitReview(
  carId: string,
  token: string | undefined,
  action: "APPROVED" | "REJECTED",
  comment: string
): Promise<void> {
  const res = await fetch(`/api/car/${carId}/review-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(token ? { token } : {}),
      action,
      ...(comment ? { comment } : {}),
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to submit review");
  }
}

function ResponseDetail({ response }: { response: NonNullable<CarDetail["response"]> }) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const rootCauses = [
    response.rootCausePerson && "Person",
    response.rootCauseMaterial && "Material",
    response.rootCauseMachine && "Machine",
    response.rootCauseMethod && "Method",
    response.rootCauseOther && `Other: ${response.rootCauseOtherDetail ?? ""}`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-3">
      <Row label="Responder" value={`${response.responder.name ?? "-"} (${response.responderPosition})`} />
      <Row label="Planned Completion" value={fmt(response.plannedCompletionDate)} highlight />
      <Divider />
      <Row label="Why-Why Analysis" value={response.whyAnalysis} multiline />
      <Row label="Root Cause (5M)" value={rootCauses.join(", ") || "-"} />
      <Row label="Root Cause Summary" value={response.rootCauseSummary} multiline />
      <Divider />
      <Row label="Immediate Action" value={response.immediateAction} multiline />
      <Row label="Preventive Action" value={response.preventiveAction} multiline />
      {response.additionalToolDetail && (
        <Row label="Additional Tool" value={response.additionalToolDetail} multiline />
      )}
    </div>
  );
}

function Row({ label, value, multiline, highlight }: { label: string; value: string; multiline?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
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
      <div className={`rounded-xl border p-8 text-center ${approved ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
        <div className="mb-3 flex justify-center">
          {approved
            ? <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            : <XCircle className="h-12 w-12 text-rose-500" />}
        </div>
        <h2 className={`text-lg font-bold ${approved ? "text-emerald-800" : "text-rose-800"}`}>
          {approved ? "Corrective action plan approved" : "Corrective action plan rejected"}
        </h2>
        <p className={`mt-1 text-sm ${approved ? "text-emerald-700" : "text-rose-700"}`}>
          {approved
            ? `CAR ${car.carNo} is now ready for verification.`
            : `CAR ${car.carNo} has been sent back to the department for revision.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-slate-800">{car.carNo}</span>
          <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {car.targetDepartment.name}
          </span>
        </div>
        <p className="text-xs text-slate-500">{car.defectDetail}</p>
        <p className="text-xs text-slate-400">Ref: {car.nonConformanceRef}</p>
      </div>

      {car.response ? (
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">Corrective Action Plan</h3>
          </div>
          <ResponseDetail response={car.response} />
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
          No department response has been submitted yet.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setAction("APPROVED")}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all ${
            action === "APPROVED"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Approve Plan
        </button>
        <button
          onClick={() => setAction("REJECTED")}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all ${
            action === "REJECTED"
              ? "border-rose-500 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-white text-slate-500 hover:border-rose-300"
          }`}
        >
          <XCircle className="h-4 w-4" />
          Reject Plan
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Comment{action === "REJECTED" && <span className="text-rose-500"> (recommended)</span>}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={action === "REJECTED" ? "Explain what must be revised..." : "Add an optional note..."}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {mutation.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {(mutation.error as Error).message}
        </p>
      )}

      <div className={`rounded-lg p-3 text-xs ${action === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
        {action === "APPROVED"
          ? "Approving will move the CAR to verification and notify the next responsible parties."
          : `Rejecting will send the CAR back to ${car.targetDepartment.name} for an updated plan.`}
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className={`w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60 ${
          action === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
        }`}
      >
        {mutation.isPending
          ? "Submitting..."
          : action === "APPROVED"
            ? "Confirm Plan Approval"
            : "Confirm Plan Rejection"}
      </button>
    </div>
  );
}
