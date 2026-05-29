"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

type PendingDarItem = {
  darId: string;
  darNo: string | null;
  status: string;
  requestDate: string;
  requesterName: string | null;
  stepRole: string;
};

type PendingSummary = {
  totalPending: number;
  pendingDarCount: number;
  pendingKpiReviewCount: number;
  pendingKpiApproveCount: number;
  pendingDarItems: PendingDarItem[];
  pendingKpiReviewItems: Array<{
    id: string;
    kpiId: string;
    department: string;
    month: string | null;
    year: number;
    status: string;
    source: "OBJECTIVE" | "MONTHLY";
  }>;
  pendingKpiApproveItems: Array<{
    id: string;
    kpiId: string;
    department: string;
    month: string | null;
    year: number;
    status: string;
    source: "OBJECTIVE" | "MONTHLY";
  }>;
};

function formatDate(value: string, locale: "th" | "en") {
  return new Date(value).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function ApprovePageClient() {
  const t = useT();
  const locale = useLocale();

  const query = useQuery<PendingSummary>({
    queryKey: ["approvals", "pending-summary"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/pending-summary");
      const json = await res.json();
      return (json.data ?? null) as PendingSummary;
    },
  });

  const data = query.data;
  const totalKpi = (data?.pendingKpiReviewCount ?? 0) + (data?.pendingKpiApproveCount ?? 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">{t("approve.title")}</h1>
        <p className="text-base text-slate-600 mt-1">{t("approve.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5 border border-slate-100">
          <p className="text-sm text-slate-600">{t("approve.totalPending")}</p>
          <p className="text-3xl font-bold text-[#0F1059] mt-2">{data?.totalPending ?? 0}</p>
        </div>
        <div className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5 border border-amber-200 bg-amber-50/40">
          <p className="text-sm text-amber-700">{t("approve.pendingDar")}</p>
          <p className="text-3xl font-bold text-amber-700 mt-2">{data?.pendingDarCount ?? 0}</p>
        </div>
        <div className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5 border border-sky-200 bg-sky-50/40">
          <p className="text-sm text-sky-700">{t("approve.pendingKpi")}</p>
          <p className="text-3xl font-bold text-sky-700 mt-2">{totalKpi}</p>
        </div>
      </div>

      <div className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{t("approve.pendingDarList")}</h2>
        </div>
        {query.isLoading ? (
          <div className="p-5 text-sm text-slate-500">{t("common.loading")}</div>
        ) : data && data.pendingDarItems.length > 0 ? (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">DAR</th>
                    <th className="px-5 py-3 text-left">{t("approve.requester")}</th>
                    <th className="px-5 py-3 text-left">{t("approve.date")}</th>
                    <th className="px-5 py-3 text-right">{t("approve.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pendingDarItems.map((item) => (
                    <tr key={`${item.darId}-${item.stepRole}`} className="border-t border-slate-100">
                      <td className="px-5 py-3 font-semibold text-[#0F1059]">{item.darNo ?? item.darId}</td>
                      <td className="px-5 py-3 text-slate-700">{item.requesterName ?? "-"}</td>
                      <td className="px-5 py-3 text-slate-600">{formatDate(item.requestDate, locale)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/approve/${item.darId}/${item.stepRole === "REVIEWER" ? "reviewer" : "approver"}?type=dar`} className="rounded-xl bg-[#0F1059] hover:bg-[#161875] text-white text-sm px-4 py-2 inline-block">
                          {t("approve.openAction")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden divide-y divide-slate-100">
              {data.pendingDarItems.map((item) => (
                <div key={`${item.darId}-${item.stepRole}`} className="p-5 space-y-2">
                  <p className="text-sm font-semibold text-[#0F1059]">{item.darNo ?? item.darId}</p>
                  <p className="text-xs text-slate-500">{t("approve.requester")}: {item.requesterName ?? "-"}</p>
                  <p className="text-xs text-slate-500">{t("approve.date")}: {formatDate(item.requestDate, locale)}</p>
                  <Link href={`/approve/${item.darId}/${item.stepRole === "REVIEWER" ? "reviewer" : "approver"}?type=dar`} className="rounded-xl bg-[#0F1059] hover:bg-[#161875] text-white text-sm px-4 py-2 inline-block">
                    {t("approve.openAction")}
                  </Link>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-5 text-sm text-slate-500">{t("approve.empty")}</div>
        )}
      </div>

      <div className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{t("approve.pendingKpiReviewList")}</h2>
        </div>
        {query.isLoading ? (
          <div className="p-5 text-sm text-slate-500">{t("common.loading")}</div>
        ) : data && data.pendingKpiReviewItems.length > 0 ? (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">{t("approve.department")}</th>
                    <th className="px-5 py-3 text-left">{t("approve.type")}</th>
                    <th className="px-5 py-3 text-left">{t("approve.period")}</th>
                    <th className="px-5 py-3 text-right">{t("approve.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pendingKpiReviewItems.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 text-slate-700">{item.department}</td>
                      <td className="px-5 py-3 text-slate-600">{item.source === "OBJECTIVE" ? t("approve.typeObjective") : t("approve.typeMonthly")}</td>
                      <td className="px-5 py-3 text-slate-600">{item.month ? `${item.month} ${item.year}` : String(item.year)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={item.source === "OBJECTIVE" ? `/approve/${item.kpiId}/reviewer?type=kpi` : `/approve/${item.id}/reviewer?type=kpi-monthly&kpiId=${item.kpiId}&year=${item.year}${item.month ? `&month=${item.month}` : ""}`} className="rounded-xl bg-[#0F1059] hover:bg-[#161875] text-white text-sm px-4 py-2 inline-block">
                          {t("approve.openAction")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden divide-y divide-slate-100">
              {data.pendingKpiReviewItems.map((item) => (
                <div key={item.id} className="p-5 space-y-2">
                  <p className="text-sm font-semibold text-[#0F1059]">{item.department}</p>
                  <p className="text-xs text-slate-500">{item.source === "OBJECTIVE" ? t("approve.typeObjective") : t("approve.typeMonthly")}</p>
                  <p className="text-xs text-slate-500">{item.month ? `${item.month} ${item.year}` : String(item.year)}</p>
                  <Link href={item.source === "OBJECTIVE" ? `/approve/${item.kpiId}/reviewer?type=kpi` : `/approve/${item.id}/reviewer?type=kpi-monthly&kpiId=${item.kpiId}&year=${item.year}${item.month ? `&month=${item.month}` : ""}`} className="rounded-xl bg-[#0F1059] hover:bg-[#161875] text-white text-sm px-4 py-2 inline-block">
                    {t("approve.openAction")}
                  </Link>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-5 text-sm text-slate-500">{t("approve.emptyKpiReview")}</div>
        )}
      </div>

      <div className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{t("approve.pendingKpiApproveList")}</h2>
        </div>
        {query.isLoading ? (
          <div className="p-5 text-sm text-slate-500">{t("common.loading")}</div>
        ) : data && data.pendingKpiApproveItems.length > 0 ? (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">{t("approve.department")}</th>
                    <th className="px-5 py-3 text-left">{t("approve.type")}</th>
                    <th className="px-5 py-3 text-left">{t("approve.period")}</th>
                    <th className="px-5 py-3 text-right">{t("approve.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pendingKpiApproveItems.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 text-slate-700">{item.department}</td>
                      <td className="px-5 py-3 text-slate-600">{item.source === "OBJECTIVE" ? t("approve.typeObjective") : t("approve.typeMonthly")}</td>
                      <td className="px-5 py-3 text-slate-600">{item.month ? `${item.month} ${item.year}` : String(item.year)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={item.source === "OBJECTIVE" ? `/approve/${item.kpiId}/approver?type=kpi` : `/approve/${item.id}/approver?type=kpi-monthly&kpiId=${item.kpiId}&year=${item.year}${item.month ? `&month=${item.month}` : ""}`} className="rounded-xl bg-[#0F1059] hover:bg-[#161875] text-white text-sm px-4 py-2 inline-block">
                          {t("approve.openAction")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden divide-y divide-slate-100">
              {data.pendingKpiApproveItems.map((item) => (
                <div key={item.id} className="p-5 space-y-2">
                  <p className="text-sm font-semibold text-[#0F1059]">{item.department}</p>
                  <p className="text-xs text-slate-500">{item.source === "OBJECTIVE" ? t("approve.typeObjective") : t("approve.typeMonthly")}</p>
                  <p className="text-xs text-slate-500">{item.month ? `${item.month} ${item.year}` : String(item.year)}</p>
                  <Link href={item.source === "OBJECTIVE" ? `/approve/${item.kpiId}/approver?type=kpi` : `/approve/${item.id}/approver?type=kpi-monthly&kpiId=${item.kpiId}&year=${item.year}${item.month ? `&month=${item.month}` : ""}`} className="rounded-xl bg-[#0F1059] hover:bg-[#161875] text-white text-sm px-4 py-2 inline-block">
                    {t("approve.openAction")}
                  </Link>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-5 text-sm text-slate-500">{t("approve.emptyKpiApprove")}</div>
        )}
      </div>
    </div>
  );
}
