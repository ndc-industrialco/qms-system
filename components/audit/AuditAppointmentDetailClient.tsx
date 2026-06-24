"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronLeft,
  FileText,
  Users,
  Send,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditAppointmentStatusBadge } from "./AuditAppointmentStatusBadge";
import { useAuditAppointment, useSubmitAuditAppointment } from "@/hooks/api/use-audit-appointments";
import type { AuditAppointmentRow } from "@/types/audit";

const MEMBER_ROLE_LABELS: Record<string, string> = {
  LEAD_AUDITOR: "หัวหน้าทีมผู้ตรวจ",
  AUDITOR: "ผู้ตรวจติดตาม",
  COMMITTEE: "คณะทำงาน",
  SECRETARY: "เลขานุการ",
  ADVISOR: "ที่ปรึกษา",
};

const SIGNOFF_ROLE_LABELS: Record<string, { th: string; en: string }> = {
  REVIEWER: { th: "ผู้ตรวจสอบ", en: "Reviewer" },
  APPROVER: { th: "ผู้อนุมัติ", en: "Approver" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(iso));
}

type Props = {
  initialData: AuditAppointmentRow;
  canSubmit: boolean;
};

export function AuditAppointmentDetailClient({ initialData, canSubmit }: Props) {
  const router = useRouter();
  const { data: appt = initialData } = useAuditAppointment(initialData.id, initialData);
  const submitMutation = useSubmitAuditAppointment();
  const [submitting, setSubmitting] = useState(false);
  const hasSidebar = (canSubmit && appt.status === "DRAFT") || appt.signoffs.length > 0;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitMutation.mutateAsync(appt.id);
      toast.success("ส่งประกาศเพื่อตรวจสอบเรียบร้อยแล้ว");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/audit/appointments" className="hover:text-slate-600 transition-colors flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> ประกาศแต่งตั้ง
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-600 font-medium">{appt.appointmentNo}</span>
      </nav>

      {/* Reject reason banner */}
      {appt.rejectReason && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <RotateCcw className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">ถูกส่งกลับแก้ไข</p>
            <p className="text-xs text-red-700 mt-0.5">{appt.rejectReason}</p>
          </div>
        </div>
      )}

      <div className={hasSidebar ? "lg:grid lg:grid-cols-[1fr_280px] lg:gap-6 lg:items-start space-y-5 lg:space-y-0" : ""}>
        {/* Main content */}
        <div className="space-y-4">
          {/* Header card */}
          <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-semibold text-slate-400">{appt.appointmentNo}</span>
                  <AuditAppointmentStatusBadge status={appt.status} />
                </div>
                <h1 className="text-lg font-bold text-slate-900 leading-snug">{appt.title}</h1>
                <p className="text-sm text-slate-500 mt-1">ประจำปี พ.ศ. {appt.year}</p>
              </div>
            </div>

            {appt.standards.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">มาตรฐาน</p>
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
                <p className="text-xs text-slate-400 mb-0.5">ผู้จัดทำ</p>
                <p className="text-sm font-medium text-slate-800">{appt.ownerNameSnapshot ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">ผู้ตรวจสอบ</p>
                <p className="text-sm font-medium text-slate-800">{appt.reviewerNameSnapshot ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">ผู้อนุมัติ</p>
                <p className="text-sm font-medium text-slate-800">{appt.approverNameSnapshot ?? "-"}</p>
              </div>
            </div>
          </div>

          {/* Members table */}
          {appt.members.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">
                  รายชื่อคณะทำงาน
                  <span className="ml-2 text-xs font-normal text-slate-400">({appt.members.length} คน)</span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>ชื่อ-สกุล</TableHead>
                      <TableHead>หน่วยงาน</TableHead>
                      <TableHead>บทบาท</TableHead>
                      <TableHead>มาตรฐาน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appt.members.map((m, i) => (
                      <TableRow key={m.id} className="hover:bg-slate-50/60">
                        <TableCell className="text-slate-400 text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium text-slate-800">{m.name}</TableCell>
                        <TableCell className="text-slate-500 text-xs">{m.department ?? "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {MEMBER_ROLE_LABELS[m.role] ?? m.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {m.standards.length > 0 ? m.standards.join(", ") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          {canSubmit && appt.status === "DRAFT" && (
            <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ดำเนินการ</p>
              <Button
                className="w-full rounded-xl bg-primary hover:bg-[#161875] h-11 font-semibold"
                onClick={handleSubmit}
                disabled={submitting}
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? "กำลังส่ง..." : "ส่งตรวจสอบ"}
              </Button>
            </div>
          )}

          {/* Signoffs */}
          {appt.signoffs.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800">ประวัติการลงนาม</h3>
              </div>
              <div className="space-y-3">
                {appt.signoffs.map((s, i) => {
                  const roleLabel = SIGNOFF_ROLE_LABELS[s.signedRole] ?? { th: s.signedRole, en: s.signedRole };
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{s.signerNameSnapshot ?? "-"}</p>
                        <p className="text-xs text-slate-500">{roleLabel.th} / {roleLabel.en}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{fmtDate(s.signedAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Published info */}
          {appt.status === "PUBLISHED" && appt.publishedAt && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm">
              <p className="font-semibold text-emerald-800">เผยแพร่แล้ว</p>
              <p className="text-xs text-emerald-600 mt-0.5">เมื่อ {fmtDate(appt.publishedAt)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
