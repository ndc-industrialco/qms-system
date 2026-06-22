"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardCheck,
  ChevronRight,
  RotateCcw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { AuditAppointmentRow } from "@/types/audit";

const MEMBER_ROLE_LABELS: Record<string, string> = {
  LEAD_AUDITOR: "หัวหน้าทีมผู้ตรวจ (Lead Auditor)",
  AUDITOR: "ผู้ตรวจติดตาม (Internal Auditor)",
  COMMITTEE: "คณะทำงาน (Working Committee)",
  SECRETARY: "เลขานุการ (Secretary)",
  ADVISOR: "ที่ปรึกษา (Advisor)",
};

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

type Props = {
  appt: AuditAppointmentRow;
  mode: "reviewer" | "approver";
};

export function AuditAppointmentApproveClient({ appt, mode }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const isReviewer = mode === "reviewer";
  const endpoint = `/api/audit/appointments/${appt.id}/${isReviewer ? "review" : "approve"}`;

  const copy = {
    bannerLabel: isReviewer
      ? "ประกาศแต่งตั้งนี้รอการตรวจสอบจากคุณ"
      : "ประกาศแต่งตั้งนี้รอการอนุมัติจากคุณ",
    bannerSub: isReviewer ? "Pending Review" : "Pending Approval",
    actionLabel: isReviewer ? "ตรวจสอบและลงนาม" : "อนุมัติและลงนาม",
    actionLabelEn: isReviewer ? "Review & Sign" : "Approve & Sign",
  };

  async function handleSign() {
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? "Action failed");
      setSuccessOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", { duration: Infinity });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/audit/appointments/${appt.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim(), signedRole: isReviewer ? "REVIEWER" : "APPROVER" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? "เกิดข้อผิดพลาด");
      toast.success("ส่งกลับแก้ไขเรียบร้อย");
      setRejectOpen(false);
      router.push("/approve");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setRejecting(false);
    }
  }

  const expectedStatus = isReviewer ? "PENDING_REVIEW" : "PENDING_APPROVAL";
  const alreadyActioned = appt.status !== expectedStatus;

  const ActionPanel = (
    <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {alreadyActioned ? (
        <div className="rounded-lg border border-muted bg-muted/30 p-6 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium">ดำเนินการแล้ว / Already Actioned</p>
          <p className="text-xs text-muted-foreground mt-1">
            ประกาศนี้ได้รับการดำเนินการแล้ว สถานะปัจจุบัน:{" "}
            <span className="font-semibold">{appt.status}</span>
          </p>
        </div>
      ) : null}
      {!alreadyActioned && appt.signoffs.length > 0 && (
        <div className="p-5 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">ประวัติการลงนาม</p>
          <div className="space-y-3">
            {appt.signoffs.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{s.signerNameSnapshot ?? "-"}</p>
                  <p className="text-xs text-slate-500">{s.signedRole}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{fmtDate(s.signedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="p-5 space-y-3">
        {!alreadyActioned && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{copy.bannerSub}</p>
            <Button
              className="w-full rounded-xl bg-primary hover:bg-[#161875] h-11 font-semibold"
              disabled={submitting}
              onClick={handleSign}
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              {submitting ? "กำลังดำเนินการ..." : copy.actionLabel}
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl h-10 text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              onClick={() => setRejectOpen(true)}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              ส่งกลับแก้ไข / Return
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          className="w-full rounded-xl text-slate-500 hover:text-slate-700 h-9 text-sm"
          onClick={() => router.push("/approve")}
        >
          กลับ / Back
        </Button>
      </div>
    </div>
  );

  const DetailContent = (
    <div className="space-y-4">
      {/* Main info */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-slate-400">{appt.appointmentNo}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{appt.title}</h2>
            <p className="text-sm text-slate-500 mt-1">ประจำปี พ.ศ. {appt.year}</p>
          </div>
          <span className="shrink-0 inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {copy.bannerSub}
          </span>
        </div>

        {appt.standards.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">มาตรฐาน</p>
            <div className="flex flex-wrap gap-2">
              {appt.standards.map((s) => (
                <span key={s} className="inline-flex items-center rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">ผู้จัดทำ / Preparer</p>
            <p className="text-sm font-medium text-slate-800">{appt.ownerNameSnapshot ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">ผู้ตรวจสอบ / Reviewer</p>
            <p className="text-sm font-medium text-slate-800">{appt.reviewerNameSnapshot ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">ผู้อนุมัติ / Approver</p>
            <p className="text-sm font-medium text-slate-800">{appt.approverNameSnapshot ?? "-"}</p>
          </div>
        </div>
      </div>

      {/* Members */}
      {appt.members.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              รายชื่อคณะทำงาน
              <span className="ml-2 text-xs font-normal text-slate-400">({appt.members.length} คน)</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {appt.members.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 shrink-0 text-xs font-bold text-slate-500">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{m.name}</p>
                  {m.department && <p className="text-xs text-slate-400">{m.department}</p>}
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {MEMBER_ROLE_LABELS[m.role] ?? m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
        <div className="mt-0.5 w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-violet-900">{copy.bannerLabel}</p>
          <p className="text-xs text-violet-700 mt-0.5">{appt.appointmentNo} — {appt.title}</p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/approve" className="hover:text-slate-600 transition-colors">Approve</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-slate-400">Appointment</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-slate-600 font-medium">{appt.appointmentNo}</span>
      </nav>

      {/* Desktop: two-column */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:items-start">
        <div>{DetailContent}</div>
        <div className="sticky top-6">{ActionPanel}</div>
      </div>

      {/* Mobile: stacked */}
      <div className="lg:hidden pb-24">{DetailContent}</div>

      {/* Mobile floating bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-medium">{copy.bannerSub}</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{appt.title}</p>
          </div>
          <button
            type="button"
            onClick={handleSign}
            disabled={submitting}
            className="shrink-0 h-10 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-[#161875] active:scale-95 transition-all disabled:opacity-50"
          >
            {copy.actionLabelEn}
          </button>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ดำเนินการเรียบร้อย
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            {isReviewer
              ? `ตรวจสอบประกาศ ${appt.appointmentNo} เรียบร้อยแล้ว`
              : `อนุมัติและเผยแพร่ประกาศ ${appt.appointmentNo} เรียบร้อยแล้ว`}
          </p>
          <DialogFooter>
            <Button
              className="rounded-xl bg-primary hover:bg-[#161875]"
              onClick={() => { setSuccessOpen(false); router.push("/approve"); router.refresh(); }}
            >
              กลับหน้า Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={(o) => { setRejectOpen(o); if (!o) setRejectReason(""); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-red-500" />
              ส่งกลับแก้ไข
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              ประกาศจะถูกส่งกลับสถานะ Draft ให้เจ้าของแก้ไขและส่งใหม่
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">เหตุผล <span className="text-red-500">*</span></label>
            <Textarea
              placeholder="ระบุเหตุผลที่ส่งกลับแก้ไข..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="resize-none rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setRejectOpen(false)} disabled={rejecting}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={!rejectReason.trim() || rejecting}
              onClick={handleReject}
            >
              {rejecting ? "กำลังส่งกลับ..." : "ยืนยันส่งกลับ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
