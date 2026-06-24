"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Plus, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuditAppointments } from "@/hooks/api/use-audit-appointments";
import { AuditAppointmentStatusBadge } from "./AuditAppointmentStatusBadge";
import type { AuditAppointmentRow } from "@/types/audit";

const MEMBER_ROLE_LABELS: Record<string, string> = {
  LEAD_AUDITOR: "Lead Auditor",
  AUDITOR: "Auditor",
  COMMITTEE: "Committee",
  SECRETARY: "Secretary",
  ADVISOR: "Advisor",
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(iso));
}

function AppointmentCard({ appt }: { appt: AuditAppointmentRow }) {
  return (
    <Link
      href={`/audit/appointments/${appt.id}`}
      className="block rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-5 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold text-slate-400">{appt.appointmentNo}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">ปี {appt.year}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{appt.title}</h3>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <AuditAppointmentStatusBadge status={appt.status} />
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </div>
      {appt.standards.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {appt.standards.map((s) => (
            <span key={s} className="inline-flex items-center rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{appt.members.length} คน</span>
        <span>{fmtDate(appt.createdAt)}</span>
      </div>
      {appt.rejectReason && (
        <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          ถูกส่งกลับ: {appt.rejectReason}
        </div>
      )}
    </Link>
  );
}

type Props = {
  initialData?: AuditAppointmentRow[];
  canCreate: boolean;
  onCreateClick: () => void;
};

export function AuditAppointmentListClient({ initialData, canCreate, onCreateClick }: Props) {
  const [search, setSearch] = useState("");
  const { data: items = [] } = useAuditAppointments(initialData);

  const filtered = items.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.appointmentNo.toLowerCase().includes(q) ||
      String(a.year).includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาประกาศ..."
            className="pl-9 rounded-xl border-slate-200"
          />
        </div>
        {canCreate && (
          <Button
            onClick={onCreateClick}
            className="rounded-xl bg-primary hover:bg-[#161875] shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            สร้างประกาศ
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 py-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mb-1 text-base font-semibold text-slate-800">ยังไม่มีประกาศแต่งตั้ง</p>
          <p className="text-sm text-slate-400">No appointment letters found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {filtered.map((appt) => (
            <AppointmentCard key={appt.id} appt={appt} />
          ))}
        </div>
      )}
    </div>
  );
}

export { MEMBER_ROLE_LABELS };
