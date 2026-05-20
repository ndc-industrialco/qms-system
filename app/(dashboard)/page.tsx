export const runtime = 'edge';

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardClientView from "@/components/dashboard/DashboardClientView";

export default async function CompanyCenterDashboard() {
  const session = await requireAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Fetch data
  const [announcements, tickerAnnouncements, recentPublicDocs, departments, recentAttachments, kpiStatusGroups, kpiTotal] = await Promise.all([
    prisma.announcement.findMany({
      where: {
        pushToCompanyCenter: true,
        displayType: "LIST",
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } }
            ]
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.announcement.findMany({
      where: {
        pushToCompanyCenter: true,
        displayType: "SCROLLING",
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } }
            ]
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.publicDocument.findMany({
      orderBy: { publishedDate: "desc" },
      take: 5,
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { name: true },
    }),
    prisma.darAttachment.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { darMaster: { include: { department: true } } },
    }),
    prisma.kpiMonthlyResult.groupBy({
      by: ["status"],
      where: { month: currentMonth, kpiMaster: { year: currentYear } },
      _count: { status: true },
    }),
    prisma.kpiMaster.count({ where: { year: currentYear } }),
  ]);

  const canManage = ["QMS", "IT", "MR"].includes(session.user.role);

  const kpiOk = kpiStatusGroups.find(g => g.status === "OK")?._count.status ?? 0;
  const kpiNg = kpiStatusGroups.find(g => g.status === "NG")?._count.status ?? 0;
  const kpiPending = kpiStatusGroups.find(g => g.status === "PENDING")?._count.status ?? 0;

  return (
    <DashboardClientView
      canManage={canManage}
      announcements={announcements}
      tickerAnnouncements={tickerAnnouncements}
      recentPublicDocs={recentPublicDocs}
      departments={departments}
      recentAttachments={recentAttachments}
      kpiOk={kpiOk}
      kpiNg={kpiNg}
      kpiPending={kpiPending}
      kpiTotal={kpiTotal}
    />
  );
}
