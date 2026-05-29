"use client";

import { useT } from "@/lib/i18n";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/common/EmptyState";
import type { KPI } from "@/generated/prisma/client";
import { Calendar, Briefcase, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  data: KPI[];
  isLoading: boolean;
  onEdit: (kpi: KPI) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  meta?: { page: number; limit: number; total: number };
  onPageChange?: (page: number) => void;
}

export function KpiMasterTable({ data, isLoading, onEdit, onDelete, canEdit, meta, onPageChange }: Props) {
  const t = useT();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="hidden lg:block bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}
          </div>
        </div>
        <div className="lg:hidden space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-16 flex justify-center items-center">
        <EmptyState title={t("kpi.reference.table.empty")} />
      </div>
    );
  }

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) || 1 : 1;

  return (
    <>
      {/* Mobile / Tablet List */}
      <div className="lg:hidden space-y-3">
        {data.map((kpi) => (
          <div key={kpi.id} className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-base text-primary leading-snug">{kpi.department}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
                  <Briefcase className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{kpi.prepare}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50/50 px-3 py-1.5 rounded-xl border border-slate-100 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-mono text-slate-700 text-sm">{kpi.yearly}</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>{t("kpi.form.reviewer")}: <span className="text-slate-600">{kpi.reviewer}</span></p>
              <p>{t("kpi.form.approver")}: <span className="text-slate-600">{kpi.approver}</span></p>
            </div>
            {canEdit && (
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50" onClick={() => onEdit(kpi)}>
                  <Pencil className="w-3.5 h-3.5" />{t("kpi.reference.action.edit")}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700" onClick={() => onDelete(kpi.id)}>
                  <Trash2 className="w-3.5 h-3.5" />{t("kpi.reference.action.delete")}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-20">{t("kpi.reference.table.year")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("kpi.form.department")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("kpi.form.prepare")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("kpi.form.reviewer")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("kpi.form.approver")}</TableHead>
              {canEdit && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((kpi) => (
              <TableRow key={kpi.id} className="hover:bg-slate-50/50">
                <TableCell className="font-mono text-sm text-slate-700">{kpi.yearly}</TableCell>
                <TableCell className="text-sm text-slate-800 font-medium">{kpi.department}</TableCell>
                <TableCell className="text-sm text-slate-600">{kpi.prepare}</TableCell>
                <TableCell className="text-sm text-slate-600">{kpi.reviewer}</TableCell>
                <TableCell className="text-sm text-slate-600">{kpi.approver}</TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-primary hover:bg-slate-100" onClick={() => onEdit(kpi)} title={t("kpi.reference.action.edit")}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => onDelete(kpi.id)} title={t("kpi.reference.action.delete")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-sm text-slate-500">
            {meta.page} / {totalPages}
            <span className="text-slate-400 ml-2">({meta.total} {t("kpi.reference.table.totalItems")})</span>
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-200" disabled={meta.page === 1} onClick={() => onPageChange?.(meta.page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 px-2">{meta.page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-200" disabled={meta.page >= totalPages} onClick={() => onPageChange?.(meta.page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
