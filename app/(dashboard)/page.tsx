
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDepartments } from "@/lib/departmentCache";
import { UnauthorizedError } from "@/lib/errors";
import DashboardClientView from "@/components/dashboard/DashboardClientView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function CompanyCenterDashboard() {
  const session = await requireAuth();
  const now = new Date();
  // currentMonth reserved for future filtering
  const currentYear = now.getFullYear();

  const activeFilter = {
    pushToCompanyCenter: true,
    OR: [{ startDate: null }, { startDate: { lte: now } }],
    AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
  };

  let departmentList;
  try {
    departmentList = await getDepartments(session.user.accessToken);
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/api/auth/signout?callbackUrl=/");
    throw e;
  }

  const [
    announcementsList,
    tickerAnnouncements,
    recentPublicDocs,
    departmentDocStats,
    recentAttachments,
    kpiOkCount,
    kpiNgCount,
    kpiPendingCount,
    kpiTotal,
    approvedKpisRaw,
  ] = await Promise.all([
    db.announcement.findMany({
      where: activeFilter,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    db.announcement.findMany({
      where: { ...activeFilter, displayType: "SCROLLING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    db.publicDocument.findMany({
      orderBy: { publishedDate: "desc" },
      take: 5,
    }),

    db.documentControl.groupBy({
      by: ["departmentId"],
      _count: { _all: true },
      _max: { updatedAt: true },
      where: { departmentId: { not: null } },
    }),

    db.darAttachment.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
    }),

    db.kPIMonthlyDetail.count({
      where: { achievedStatus: "OK", monthlyReport: { year: currentYear } },
    }),

    db.kPIMonthlyDetail.count({
      where: { achievedStatus: "NOT_OK", monthlyReport: { year: currentYear } },
    }),

    db.kPIMonthlyDetail.count({
      where: { achievedStatus: "PENDING", monthlyReport: { year: currentYear } },
    }),

    db.kPI.count({ where: { yearly: currentYear } }),

    db.kPI.findMany({
      where: { yearly: currentYear, status: 'APPROVED' },
      select: {
        id: true,
        department: true,
        monthlyReports: { select: { month: true, status: true } },
      },
    }),
  ]);

  const canManage = ["QMS", "IT", "MR"].includes(session.user.role);

  const KPI_MONTHS_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const approvedDeptNames = new Set(approvedKpisRaw.map((k) => k.department.toLowerCase()));
  const noKpiDepartments = departmentList
    .filter((d) => !approvedDeptNames.has(d.displayName.toLowerCase()) && !approvedDeptNames.has(d.code.toLowerCase()))
    .map((d) => d.displayName);
  const kpiMatrix = approvedKpisRaw.map((kpi) => {
    const months: Record<string, string | null> = Object.fromEntries(KPI_MONTHS_ORDER.map((m) => [m, null]));
    for (const r of kpi.monthlyReports) months[r.month] = r.status;
    return { department: kpi.department, kpiId: kpi.id, months };
  });
  const docStatsByDepartment = new Map(
    departmentDocStats
      .filter((row) => row.departmentId)
      .map((row) => [row.departmentId as string, { count: row._count._all, latest: row._max.updatedAt ?? null }]),
  );

  const mappedDepartments = departmentList
    .map((dept) => ({
      id: dept.code,
      name: dept.displayName,
      documentCount: docStatsByDepartment.get(dept.code)?.count ?? 0,
      latestDocUpdatedAt: docStatsByDepartment.get(dept.code)?.latest ?? null,
    }))
    .sort((a, b) => {
      const aTime = a.latestDocUpdatedAt ? new Date(a.latestDocUpdatedAt).getTime() : 0;
      const bTime = b.latestDocUpdatedAt ? new Date(b.latestDocUpdatedAt).getTime() : 0;
      return bTime - aTime;
    })
    .map(({ id, name, documentCount }) => ({ id, name, documentCount }));

  return (
    <DashboardClientView
      canManage={canManage}
      role={session.user.role}
      announcements={announcementsList}
      tickerAnnouncements={tickerAnnouncements}
      recentPublicDocs={recentPublicDocs}
      departments={mappedDepartments}
      recentAttachments={recentAttachments}
      kpiOk={kpiOkCount}
      kpiNg={kpiNgCount}
      kpiPending={kpiPendingCount}
      kpiTotal={kpiTotal}
      kpiMonthlyMatrix={{ year: currentYear, noKpiDepartments, matrix: kpiMatrix }}
    />
  );
}
