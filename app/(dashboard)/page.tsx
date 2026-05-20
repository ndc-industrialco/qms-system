export const runtime = 'nodejs';

import { and, desc, eq, gte, isNull, lte, or, count } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { announcements, publicDocuments, departments, darAttachments, darMasters, kpiMonthlyResults, kpiMasters } from "@/db/schema";
import DashboardClientView from "@/components/dashboard/DashboardClientView";

export default async function CompanyCenterDashboard() {
  const session = await requireAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const activeFilter = and(
    eq(announcements.pushToCompanyCenter, true),
    or(isNull(announcements.startDate), lte(announcements.startDate, now)),
    or(isNull(announcements.endDate), gte(announcements.endDate, now)),
  );

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
    db.select().from(announcements)
      .where(and(activeFilter, eq(announcements.displayType, "LIST")))
      .orderBy(desc(announcements.createdAt)).limit(5),

    db.select().from(announcements)
      .where(and(activeFilter, eq(announcements.displayType, "SCROLLING")))
      .orderBy(desc(announcements.createdAt)).limit(5),

    db.select().from(publicDocuments).orderBy(desc(publicDocuments.publishedDate)).limit(5),

    db.select({ name: departments.name }).from(departments).where(eq(departments.isActive, true)),

    db.select().from(darAttachments).orderBy(desc(darAttachments.createdAt)).limit(4),

    db.select({ cnt: count() }).from(kpiMonthlyResults)
      .innerJoin(kpiMasters, eq(kpiMonthlyResults.kpiMasterId, kpiMasters.id))
      .where(and(eq(kpiMonthlyResults.month, currentMonth), eq(kpiMonthlyResults.status, "OK"), eq(kpiMasters.year, currentYear))),

    db.select({ cnt: count() }).from(kpiMonthlyResults)
      .innerJoin(kpiMasters, eq(kpiMonthlyResults.kpiMasterId, kpiMasters.id))
      .where(and(eq(kpiMonthlyResults.month, currentMonth), eq(kpiMonthlyResults.status, "NG"), eq(kpiMasters.year, currentYear))),

    db.select({ cnt: count() }).from(kpiMonthlyResults)
      .innerJoin(kpiMasters, eq(kpiMonthlyResults.kpiMasterId, kpiMasters.id))
      .where(and(eq(kpiMonthlyResults.month, currentMonth), eq(kpiMonthlyResults.status, "PENDING"), eq(kpiMasters.year, currentYear))),

    db.select({ cnt: count() }).from(kpiMasters).where(eq(kpiMasters.year, currentYear)),
  ]);

  const canManage = ["QMS", "IT", "MR"].includes(session.user.role);

  return (
    <DashboardClientView
      canManage={canManage}
      announcements={announcementsList}
      tickerAnnouncements={tickerAnnouncements}
      recentPublicDocs={recentPublicDocs}
      departments={departmentList}
      recentAttachments={recentAttachments}
      kpiOk={Number(kpiOkCount[0]?.cnt ?? 0)}
      kpiNg={Number(kpiNgCount[0]?.cnt ?? 0)}
      kpiPending={Number(kpiPendingCount[0]?.cnt ?? 0)}
      kpiTotal={Number(kpiTotal[0]?.cnt ?? 0)}
    />
  );
}
