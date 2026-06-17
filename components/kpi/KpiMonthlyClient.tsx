"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useKpiList } from "@/hooks/api/use-kpi";
import { useKpiMonthlyList } from "@/hooks/api/use-kpi-monthly";
import { KpiMonthlyTable } from "@/components/kpi/KpiMonthlyTable";
import KpiMonthlyDetailModal from "@/components/kpi/KpiMonthlyDetailModal";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Building2, CalendarDays, CheckCircle2, ChevronRight,
  Clock, FileText, Info, ShieldCheck, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const STATUSES = ["DRAFT", "PENDING_REVIEW", "PENDING_APPROVAL", "APPROVED", "REJECTED"] as const;

type UserRole = "USER" | "IT" | "QMS" | "MR";
const PRIVILEGED_ROLES: UserRole[] = ["IT", "QMS", "MR"];
function isPrivileged(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

interface Props {
  userRole: UserRole;
  userId?: string;
}

type KpiDepartmentRow = {
  id: string;
  department: string;
  yearly: number;
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  objectives?: unknown[];
};

const KPI_STATUS_CONFIG: Record<KpiDepartmentRow["status"], { style: string; icon: React.ElementType | null; dot: string }> = {
  DRAFT:          { style: "bg-slate-50 text-slate-500 border-slate-200",   icon: null,         dot: "bg-slate-400"  },
  PENDING_REVIEW: { style: "bg-amber-50 text-amber-600 border-amber-200",   icon: Clock,        dot: "bg-amber-400"  },
  APPROVED:       { style: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-500" },
  REJECTED:       { style: "bg-rose-50 text-rose-600 border-rose-200",      icon: XCircle,      dot: "bg-rose-500"   },
};

function RoleBanner({ role }: { role: UserRole }) {
  const t = useT();
  const privileged = isPrivileged(role);
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border px-4 py-3",
      privileged
        ? "border-emerald-200 bg-emerald-50"
        : "border-sky-200 bg-sky-50"
    )}>
      {privileged
        ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        : <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
      }
      <p className={cn("text-sm", privileged ? "text-emerald-700" : "text-sky-700")}>
        {privileged
          ? <><span className="font-semibold">{role}</span>{" — "}{t("kpi.rolePrivilegedDesc")}</>
          : t("kpi.roleUserDesc")
        }
      </p>
    </div>
  );
}

function DepartmentSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-18 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

function KpiDepartmentList({
  data,
  isLoading,
  onSelect,
}: {
  data: KpiDepartmentRow[];
  isLoading: boolean;
  onSelect: (kpiId: string) => void;
}) {
  const t = useT();

  if (isLoading) return <DepartmentSkeleton />;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-6 py-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
          <Building2 className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700">{t("common.noData")}</p>
        <p className="mt-1 text-xs text-slate-400">{t("kpi.monthly.table.empty")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("kpi.monthly.table.department")}
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("kpi.monthly.table.objectives")}
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("kpi.monthly.table.month")}
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("kpi.monthly.table.status")}
              </th>
              <th className="w-8 px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((kpi) => {
              const cfg = KPI_STATUS_CONFIG[kpi.status];
              const Icon = cfg.icon;
              return (
                <tr
                  key={kpi.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50/70"
                  onClick={() => onSelect(kpi.id)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("h-2 w-2 shrink-0 rounded-full", cfg.dot)} />
                      <span className="text-sm font-semibold text-slate-800">{kpi.department}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      <FileText className="h-3 w-3" />
                      {kpi.objectives?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-600">
                      <CalendarDays className="h-3 w-3" />
                      12
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.style)}>
                      {Icon && <Icon className="h-3 w-3" />}
                      {t(`kpi.monthly.status.${kpi.status}` as Parameters<typeof t>[0])}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ChevronRight className="inline-block h-4 w-4 text-slate-300" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 lg:hidden">
        {data.map((kpi) => {
          const cfg = KPI_STATUS_CONFIG[kpi.status];
          const Icon = cfg.icon;
          return (
            <button
              key={kpi.id}
              type="button"
              className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors hover:bg-slate-50"
              onClick={() => onSelect(kpi.id)}
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className={cn("h-2 w-2 shrink-0 rounded-full", cfg.dot)} />
                  <p className="truncate text-sm font-semibold text-slate-800">{kpi.department}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  <FileText className="h-3 w-3" />{kpi.objectives?.length ?? 0}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-600">
                  <CalendarDays className="h-3 w-3" />12
                </span>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium", cfg.style)}>
                  {Icon && <Icon className="h-3 w-3" />}
                  {t(`kpi.monthly.status.${kpi.status}` as Parameters<typeof t>[0])}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

export default function KpiMonthlyClient({ userRole, userId }: Props) {
  const t = useT();
  const currentYear = new Date().getFullYear();
  const privileged = isPrivileged(userRole);

  const { params, setParam, setParams } = useUrlFilters({
    keys: ["mKpi", "mYear", "mMonth", "mDept", "mStatus", "mPage", "mReport"],
  });

  const year = Number(params.mYear) || currentYear;
  const month = (params.mMonth as (typeof MONTHS)[number]) || undefined;
  const status = (params.mStatus as (typeof STATUSES)[number]) || undefined;
  const page = Number(params.mPage) || 1;

  const kpiListQuery = useKpiList({ yearly: year, department: privileged ? params.mDept : undefined });
  const kpis = (kpiListQuery.data?.data ?? []) as KpiDepartmentRow[];

  const selectedKpiId = params.mKpi || null;
  const selectedKpi = selectedKpiId ? kpis.find((k) => k.id === selectedKpiId) : null;

  const { data, isLoading } = useKpiMonthlyList(selectedKpiId ?? "", {
    page, limit: 12, year, month, status,
  });

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i + 1);

  useEffect(() => {
    if (!params.mReport) return;
    setSelectedReportId(params.mReport);
    setModalOpen(true);
  }, [params.mReport]);

  function handleYearChange(value: string) {
    setParams({ mYear: value, mKpi: "", mMonth: "", mStatus: "", mPage: "", mReport: "" });
  }

  function handleSelectKpi(kpiId: string) {
    setParams({ mKpi: kpiId, mPage: "", mReport: "" });
  }

  function handleBackToDepartments() {
    setParams({ mKpi: "", mMonth: "", mStatus: "", mPage: "", mReport: "" });
    setModalOpen(false);
    setSelectedReportId(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("kpi.monthly.title")} subtitle={t("kpi.monthly.subtitle")} />

      <RoleBanner role={userRole} />

      {/* Filter / Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {selectedKpiId && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200 text-slate-600"
            onClick={handleBackToDepartments}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {t("common.back")}
          </Button>
        )}

        {selectedKpi && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary">
            <Building2 className="h-3.5 w-3.5" />
            {selectedKpi.department}
          </div>
        )}

        {/* Year selector */}
        <Select value={String(year)} onValueChange={handleYearChange}>
          <SelectTrigger className="h-9 w-28 rounded-xl border-slate-200 bg-slate-50/50 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedKpiId && (
          <>
            {/* Month filter */}
            <Select
              value={params.mMonth ?? "all"}
              onValueChange={(v) => setParam("mMonth", v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-36 rounded-xl border-slate-200 bg-slate-50/50 text-sm">
                <SelectValue placeholder={t("kpi.monthly.filter.allMonths")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("kpi.monthly.filter.allMonths")}</SelectItem>
                {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={params.mStatus ?? "all"}
              onValueChange={(v) => setParam("mStatus", v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-44 rounded-xl border-slate-200 bg-slate-50/50 text-sm">
                <SelectValue placeholder={t("kpi.monthly.filter.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("kpi.monthly.filter.allStatuses")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`kpi.monthly.status.${s}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

          </>
        )}
      </div>

      {/* Content */}
      {selectedKpiId ? (
        <KpiMonthlyTable
          data={data?.data ?? []}
          isLoading={isLoading}
          meta={data?.meta}
          onPageChange={(p) => setParam("mPage", String(p))}
          onRowClick={(row) => {
            setSelectedReportId(row.id);
            setModalOpen(true);
          }}
        />
      ) : (
        <KpiDepartmentList
          data={kpis}
          isLoading={kpiListQuery.isLoading}
          onSelect={handleSelectKpi}
        />
      )}

      <KpiMonthlyDetailModal
        kpiId={selectedKpiId}
        reportId={modalOpen ? selectedReportId : null}
        open={modalOpen}
        onOpenChange={setModalOpen}
        userRole={userRole}
        userId={userId}
      />

    </div>
  );
}
