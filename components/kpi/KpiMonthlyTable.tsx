"use client";

import { useT } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MonthlyStatus, AchievedStatus } from "@/generated/prisma/client";

interface KpiObjectiveSnapshot {
  id: string;
  objective: string;
  target: number;
}

interface DetailSnapshot {
  id: string;
  actualResult: number | null;
  achievedStatus: AchievedStatus;
  kpiObjective: KpiObjectiveSnapshot;
}

interface KpiMonthlyReportRow {
  id: string;
  month: string;
  year: number;
  status: MonthlyStatus;
  kpi: { id: string; department: string };
  details: DetailSnapshot[];
}

interface Meta {
  page: number;
  total: number;
  limit: number;
}

interface Props {
  data: KpiMonthlyReportRow[];
  isLoading: boolean;
  meta?: Meta;
  onPageChange?: (page: number) => void;
  onRowClick: (row: KpiMonthlyReportRow) => void;
}

const STATUS_STYLES: Record<MonthlyStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-500 border border-slate-200",
  PENDING_REVIEW: "bg-amber-50 text-amber-600 border border-amber-200",
  PENDING_APPROVAL: "bg-blue-50 text-blue-600 border border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-600 border border-rose-200",
};


function StatusBadge({ status }: { status: MonthlyStatus }) {
  const t = useT();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {t(`kpi.monthly.status.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}


function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function KpiMonthlyTable({ data, isLoading, meta, onPageChange, onRowClick }: Props) {
  const t = useT();
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) || 1 : 1;

  if (isLoading) return <TableSkeleton />;
  if (!data.length) return <EmptyState message={t("kpi.monthly.table.empty")} />;

  const okCount = (details: DetailSnapshot[]) => details.filter(d => d.achievedStatus === "OK").length;
  const notOkCount = (details: DetailSnapshot[]) => details.filter(d => d.achievedStatus === "NOT_OK").length;

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                {t("kpi.monthly.table.month")}
              </th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                {t("kpi.monthly.table.department")}
              </th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                {t("kpi.monthly.table.objectives")}
              </th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                {t("kpi.monthly.table.ok")}
              </th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                {t("kpi.monthly.table.notOk")}
              </th>
              <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                {t("kpi.monthly.table.status")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => onRowClick(row)}>
                <td className="px-5 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                  {row.month} {row.year}
                </td>
                <td className="px-5 py-3.5 text-slate-600">{row.kpi.department}</td>
                <td className="px-5 py-3.5 text-center text-slate-700">{row.details.length}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-emerald-600 font-semibold">{okCount(row.details)}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-rose-600 font-semibold">{notOkCount(row.details)}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-3">
        {data.map((row) => (
          <div key={row.id}
            className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => onRowClick(row)}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{row.month} {row.year}</p>
                <p className="text-xs text-slate-400">{row.kpi.department}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="flex gap-4 text-xs text-slate-500 mt-2">
              <span>{t("kpi.monthly.table.objectives")}: <strong>{row.details.length}</strong></span>
              <span className="text-emerald-600">{t("kpi.monthly.table.ok")}: <strong>{okCount(row.details)}</strong></span>
              <span className="text-rose-600">{t("kpi.monthly.table.notOk")}: <strong>{notOkCount(row.details)}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-400">{meta.page} / {totalPages} ({meta.total})</p>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="rounded-xl" disabled={meta.page <= 1}
              onClick={() => onPageChange?.(meta.page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={meta.page >= totalPages}
              onClick={() => onPageChange?.(meta.page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
