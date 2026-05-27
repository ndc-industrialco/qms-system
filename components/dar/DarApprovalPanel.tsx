"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DarDetail, DarApprovalRow, ReviewerCandidate } from "@/types/dar";
import type { SignatureType } from "@/types/dar";
import SignaturePad from "./SignaturePad";

interface Props {
  dar: DarDetail;
  currentUserId: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onUpdated: (dar: DarDetail) => void;
}

const STEP_LABELS: Record<DarApprovalRow["stepRole"], string> = {
  PREPARER: "ผู้จัดทำ",
  REVIEWER: "ผู้ตรวจสอบ",
  APPROVER_MR: "ผู้แทนฝ่ายบริหาร",
};

const ACTION_LABELS: Record<DarApprovalRow["action"], string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ส่งคืน",
};

const ACTION_BADGE: Record<DarApprovalRow["action"], string> = {
  PENDING: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-error",
};

// ── Approval timeline ─────────────────────────────────────────────────────────
function ApprovalTimeline({ approvals }: { approvals: DarApprovalRow[] }) {
  if (approvals.length === 0) return null;

  return (
    <div className="flex flex-col gap-0">
      {approvals.map((a, idx) => (
        <div key={a.id} className="flex gap-3">
          {/* Connector line */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
              a.action === "APPROVED" ? "bg-success border-success text-success-content" :
              a.action === "REJECTED" ? "bg-error border-error text-error-content" :
              "bg-base-100 border-base-300 text-neutral"
            }`}>
              {a.action === "APPROVED" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : a.action === "REJECTED" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <span className="text-[11px] font-bold">{idx + 1}</span>
              )}
            </div>
            {idx < approvals.length - 1 && (
              <div className={`w-0.5 flex-1 my-1 ${a.action === "APPROVED" ? "bg-success" : "bg-base-300"}`} style={{ minHeight: 24 }} />
            )}
          </div>

          {/* Content */}
          <div className="pb-4 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-medium text-base-content">{STEP_LABELS[a.stepRole]}</span>
              <span className={`badge badge-sm ${ACTION_BADGE[a.action]}`}>{ACTION_LABELS[a.action]}</span>
            </div>
            <p className="text-[13px] text-neutral mt-0.5">
              {a.assignedUser.name ?? a.assignedUser.employeeId ?? "—"}
              {a.assignedUser.department && ` · ${a.assignedUser.department.name}`}
            </p>
            {a.actionDate && (
              <p className="text-[12px] text-neutral opacity-70 mt-0.5">
                {new Date(a.actionDate).toLocaleString("th-TH", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
            {a.signatureUsedUrl && a.action === "APPROVED" && (
              <div className="mt-1 border border-base-300 rounded-lg bg-base-100 inline-block p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.signatureUsedUrl} alt="ลายมือชื่อ" className="h-10 object-contain" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Assign reviewer panel ─────────────────────────────────────────────────────
function AssignReviewerPanel({ darId, onDone }: { darId: string; onDone: (dar: DarDetail) => void }) {
  const [candidates, setCandidates] = useState<ReviewerCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCandidates() {
    setLoading(true);
    try {
      const res = await fetch("/api/dar/reviewer-candidates");
      const json = await res.json();
      setCandidates(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/dar/${darId}/assign-reviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUserId: selected }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error ?? "เกิดข้อผิดพลาด"); return; }
      onDone(json.data);
    } finally {
      setSubmitting(false);
    }
  }

  if (!candidates) {
    return (
      <Button size="sm" className="" 
        type="button"
         
        onClick={loadCandidates}
        disabled={loading}
      >
        {loading ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : null}
        กำหนดผู้ตรวจสอบ
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-base-content font-medium">เลือกผู้ตรวจสอบ</p>
      <select
        className="w-full h-8 px-3 py-1 text-[14px] rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">-- เลือกผู้ตรวจสอบ --</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name ?? c.email}
            {c.department ? ` (${c.department.name})` : ""}
          </option>
        ))}
      </select>
      {error && <p className="text-[13px] text-error">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" className="" 
          type="button"
           
          disabled={!selected || submitting}
          onClick={submit}
        >
          {submitting ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : null}
          ยืนยัน
        </Button>
        <Button variant="ghost" size="sm" className=""  type="button"   onClick={() => setCandidates(null)}>
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────
function RejectModal({ darId, onDone, onClose }: { darId: string; onDone: (dar: DarDetail) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/dar/${darId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error ?? "เกิดข้อผิดพลาด"); return; }
      onDone(json.data);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-content/20 p-4">
      <div className="bg-base-100 rounded-xl shadow-lg border border-base-300 w-full max-w-md p-6 flex flex-col gap-4">
        <h3 className="text-[16px] font-semibold text-base-content">ส่งคืนคำขอ</h3>
        <div>
          <label className="text-[13px] text-neutral mb-1 block">เหตุผลในการส่งคืน <span className="text-error">*</span></label>
          <Textarea
            rows={4}
            placeholder="ระบุเหตุผล..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
          />
        </div>
        {error && <p className="text-[13px] text-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" className=""  type="button"   onClick={onClose} disabled={submitting}>ยกเลิก</Button>
          <Button variant="destructive" size="sm" className="" 
            type="button"
             
            disabled={!reason.trim() || submitting}
            onClick={submit}
          >
            {submitting ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : null}
            ยืนยันส่งคืน
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function DarApprovalPanel({
  dar,
  currentUserId,
  savedSignatureUrl,
  savedSignatureType,
  onUpdated,
}: Props) {
  const [showSignPad, setShowSignPad] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find the pending step assigned to current user
  const myPendingStep = dar.approvals.find(
    (a) => a.assignedUser.id === currentUserId && a.action === "PENDING",
  );

  // Preparer step (to determine if assign-reviewer CTA is needed)
  const preparerStep = dar.approvals.find((a) => a.stepRole === "PREPARER");
  const isRequester = dar.requester.id === currentUserId;
  const preparerApproved = preparerStep?.action === "APPROVED";
  const reviewerAssigned = dar.approvals.some((a) => a.stepRole === "REVIEWER");

  const handleSign = useCallback(
    async (dataUrl: string, type: SignatureType) => {
      setShowSignPad(false);
      setApproving(true);
      setError(null);
      try {
        const res = await fetch(`/api/dar/${dar.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signatureDataUrl: dataUrl,
            signatureType: type,
            saveSignature: false,
          }),
        });
        const json = await res.json();
        if (!res.ok || json.error) { setError(json.error ?? "เกิดข้อผิดพลาด"); return; }
        onUpdated(json.data);
      } finally {
        setApproving(false);
      }
    },
    [dar.id, onUpdated],
  );

  return (
    <div className="card-premium p-5 flex flex-col gap-4">
      <h2 className="text-sm md:text-base font-bold text-primary">ขั้นตอนการอนุมัติ</h2>

      {/* Timeline */}
      <ApprovalTimeline approvals={dar.approvals} />

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-md py-2 px-3 text-[14px]">
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      {/* 1. Preparer self-sign (requester, PREPARER step is PENDING) */}
      {myPendingStep?.stepRole === "PREPARER" && (
        <div className="border-t border-base-300 pt-4">
          <p className="text-[14px] text-base-content mb-3">
            ลงลายมือชื่อยืนยันเอกสาร (ผู้จัดทำ)
          </p>
          {!showSignPad ? (
            <Button size="sm" className="" 
              type="button"
               
              onClick={() => setShowSignPad(true)}
              disabled={approving}
            >
              {approving ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : null}
              ลงลายมือชื่อ
            </Button>
          ) : (
            <SignaturePad
              savedSignatureUrl={savedSignatureUrl}
              savedSignatureType={savedSignatureType}
              onConfirm={handleSign}
              onCancel={() => setShowSignPad(false)}
            />
          )}
        </div>
      )}

      {/* 2. Assign reviewer (requester after preparer approved, no reviewer yet) */}
      {isRequester && preparerApproved && !reviewerAssigned && dar.status === "PENDING_REVIEW" && (
        <div className="border-t border-base-300 pt-4">
          <AssignReviewerPanel darId={dar.id} onDone={onUpdated} />
        </div>
      )}

      {/* 3. Reviewer / MR approve or reject */}
      {myPendingStep && myPendingStep.stepRole !== "PREPARER" && (
        <div className="border-t border-base-300 pt-4">
          <p className="text-[14px] text-base-content mb-3">
            ขั้นตอนของคุณ: <strong>{STEP_LABELS[myPendingStep.stepRole]}</strong>
          </p>
          {!showSignPad ? (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" className="" 
                type="button"
                 
                onClick={() => setShowSignPad(true)}
                disabled={approving}
              >
                {approving ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : null}
                อนุมัติ (ลงลายมือชื่อ)
              </Button>
              <Button variant="destructive" size="sm" className="bg-transparent border border-rose-500 text-rose-500 hover:bg-rose-50" 
                type="button"
                 
                onClick={() => setShowReject(true)}
              >
                ส่งคืน
              </Button>
            </div>
          ) : (
            <SignaturePad
              savedSignatureUrl={savedSignatureUrl}
              savedSignatureType={savedSignatureType}
              onConfirm={handleSign}
              onCancel={() => setShowSignPad(false)}
            />
          )}
        </div>
      )}

      {/* Reject modal */}
      {showReject && (
        <RejectModal
          darId={dar.id}
          onDone={onUpdated}
          onClose={() => setShowReject(false)}
        />
      )}
    </div>
  );
}
