export const runtime = 'nodejs';

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardClientView from "@/components/dashboard/DashboardClientView";

export default async function CompanyCenterDashboard() {
  const session = await requireAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const activeFilter = {
    pushToCompanyCenter: true,
    OR: [{ startDate: null }, { startDate: { lte: now } }],
    AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
  };

  const [
    announcementsList,
    tickerAnnouncements,
    recentPublicDocs,
    departmentList,
    recentAttachments,
    kpiOkCount,
    kpiNgCount,
    kpiPendingCount,
    kpiTotal,
  ] = await Promise.all([
    db.announcement.findMany({
      where: { ...activeFilter, displayType: "LIST" },
      orderBy: { createdAt: "desc" },
      take: 5,
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

    db.department.findMany({
      where: { isActive: true },
      select: { name: true },
    }),

    db.darAttachment.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
    }),

    db.kpiMonthlyResult.count({
      where: { month: currentMonth, status: "OK", kpiMaster: { year: currentYear } },
    }),

    db.kpiMonthlyResult.count({
      where: { month: currentMonth, status: "NG", kpiMaster: { year: currentYear } },
    }),

    db.kpiMonthlyResult.count({
      where: { month: currentMonth, status: "PENDING", kpiMaster: { year: currentYear } },
    }),

    db.kpiMaster.count({ where: { year: currentYear } }),
  ]);

  const canManage = ["QMS", "IT", "MR"].includes(session.user.role);

  return (
    <DashboardClientView
      canManage={canManage}
      role={session.user.role}
      announcements={announcementsList}
      tickerAnnouncements={tickerAnnouncements}
      recentPublicDocs={recentPublicDocs}
      departments={departmentList}
      recentAttachments={recentAttachments}
      kpiOk={kpiOkCount}
      kpiNg={kpiNgCount}
      kpiPending={kpiPendingCount}
      kpiTotal={kpiTotal}
    />
  );
}
