"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import PageHeader from "@/components/common/PageHeader";
import { useKpiList, useCreateKpi } from "@/hooks/api/use-kpi";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, Plus, CheckCircle2, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { KPI } from "@/generated/prisma/client";

interface Department { id: string; name: string }

interface Props {
  role: "USER" | "IT" | "QMS" | "MR";
  userId: string;
  userDepartmentId?: string | null;
}

const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",          class: "bg-slate-50 text-slate-500 border-slate-200" },
  PENDING_REVIEW: { label: "Pending Review", class: "bg-amber-50 text-amber-600 border-amber-200" },
  APPROVED:       { label: "Approved",       class: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  REJECTED:       { label: "Rejected",       class: "bg-rose-50 text-rose-600 border-rose-200" },
} as const;

export default function KpiObjectivesClient({ role, userDepartmentId }: Props) {
  const t = useT();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const canEdit = role === "QMS" || role === "MR" || role === "IT";

  const { data: deptResp, isLoading: deptLoading } = useQuery<{ data: Department[] }>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to load departments");
      return res.json();
    },
  });

  const { data: kpiResp, isLoading: kpiLoading } = useKpiList({ yearly: year, limit: 100 });

  const allDepts: Department[] = deptResp?.data ?? [];
  const allKpis: KPI[] = kpiResp?.data ?? [];

  const createMutation = useCreateKpi();

  const visibleDepts = role === "USER" && userDepartmentId
    ? allDepts.filter(d => d.id === userDepartmentId || d.name === userDepartmentId)
    : allDepts;

  const kpiByDept = new Map<string, KPI>();
  for (const kpi of allKpis) {
    kpiByDept.set(kpi.department.toLowerCase(), kpi);
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const isLoading = deptLoading || kpiLoading;

  async function handleCreateKpi(deptName: string) {
    try {
      const created = await createMutation.mutateAsync({
        yearly: year,
        department: deptName,
        prepare: "",
        reviewer: "",
        approver: "",
      });
      router.push(`/qms/kpi/${created.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  function handleRowClick(dept: Department) {
    const kpi = kpiByDept.get(dept.name.toLowerCase());
    if (kpi) {
      router.push(`/qms/kpi/${kpi.id}`);
    } else if (canEdit) {
      handleCreateKpi(dept.name);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("kpi.reference.title")}
        subtitle={`${year}`}
        actions={
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        }
      />

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex gap-4 items-center">
                <div className="h-4 w-4 bg-slate-100 rounded" />
                <div className="h-4 bg-slate-100 rounded w-48" />
                <div className="h-5 bg-slate-100 rounded w-24 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : visibleDepts.length === 0 ? (
        <div className="py-20 text-center text-sm text-slate-400">{t("common.noData")}</div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 py-3 text-left">{t("kpi.form.department")}</th>
                  <th className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 py-3 text-center">{t("kpi.objective.table.objective")}</th>
                  <th className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 py-3 text-center">{t("kpi.form.year")}</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {visibleDepts.map(dept => {
                  const kpi = kpiByDept.get(dept.name.toLowerCase());
                  const status = kpi?.status as keyof typeof STATUS_CONFIG | undefined;
                  const cfg = status ? STATUS_CONFIG[status] : null;
                  const objCount = (kpi as (KPI & { objectives?: unknown[] }) | undefined)?.objectives?.length ?? 0;

                  return (
                    <tr
                      key={dept.id}
                      className={cn(
                        "border-b border-slate-50 last:border-0 transition-colors",
                        (kpi || canEdit) ? "hover:bg-slate-50 cursor-pointer" : "opacity-60"
                      )}
                      onClick={() => handleRowClick(dept)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm font-semibold text-slate-800">{dept.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {kpi ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                            <FileText className="w-3 h-3" />
                            {objCount}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cfg ? (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border", cfg.class)}>
                            {status === "APPROVED" && <CheckCircle2 className="w-3 h-3" />}
                            {status === "PENDING_REVIEW" && <Clock className="w-3 h-3" />}
                            {cfg.label}
                          </span>
                        ) : canEdit ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs rounded-lg border-dashed border-slate-300 text-slate-400 hover:text-primary hover:border-primary"
                            onClick={e => { e.stopPropagation(); handleCreateKpi(dept.name); }}
                            disabled={createMutation.isPending}
                          >
                            <Plus className="w-3 h-3 mr-1" />{t("kpi.reference.add")}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(kpi || canEdit) && <ChevronRight className="w-4 h-4 text-slate-300 inline-block" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden space-y-3">
            {visibleDepts.map(dept => {
              const kpi = kpiByDept.get(dept.name.toLowerCase());
              const status = kpi?.status as keyof typeof STATUS_CONFIG | undefined;
              const cfg = status ? STATUS_CONFIG[status] : null;

              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => handleRowClick(dept)}
                  disabled={!kpi && !canEdit}
                  className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 hover:border-primary/30 transition-all group disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{dept.name}</p>
                        {cfg ? (
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border mt-0.5", cfg.class)}>
                            {cfg.label}
                          </span>
                        ) : canEdit ? (
                          <p className="text-xs text-slate-400 mt-0.5">{t("kpi.reference.add")}</p>
                        ) : null}
                      </div>
                    </div>
                    {(kpi || canEdit) && (
                      <ChevronRight className={cn("w-4 h-4 text-slate-300 shrink-0 transition-colors group-hover:text-primary")} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
