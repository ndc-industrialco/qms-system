
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
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
      include: {
        _count: { select: { docControls: true } },
        docControls: {
          select: { updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
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
  ]);

  const canManage = ["QMS", "IT", "MR"].includes(session.user.role);

  const mappedDepartments = departmentList
    .map((dept) => ({
      id: dept.id,
      name: dept.name,
      documentCount: dept._count.docControls,
      latestDocUpdatedAt: dept.docControls[0]?.updatedAt ?? null,
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
    />
  );
}
