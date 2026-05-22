"use client";

import { useContext } from "react";
import Link from "next/link";
import { LocaleContext } from "@/lib/locale-context";
import type { Announcement, PublicDocument, DarAttachment, UserRole } from "@/generated/prisma/client";
import HeroBanner from "@/components/dashboard/HeroBanner";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import DashboardRoleStrip from "@/components/dashboard/DashboardRoleStrip";
import DashboardAnnouncementsFeed from "@/components/dashboard/DashboardAnnouncementsFeed";
import DashboardDocsFeed from "@/components/dashboard/DashboardDocsFeed";
import DashboardKpiWidget from "@/components/dashboard/DashboardKpiWidget";
import { DashboardCarWidget, DashboardAttachmentsWidget } from "@/components/dashboard/DashboardCarWidget";

type RecentAttachment = DarAttachment;

interface Props {
  canManage: boolean;
  role: UserRole;
  announcements: Announcement[];
  tickerAnnouncements: Announcement[];
  recentPublicDocs: PublicDocument[];
  departments: { name: string }[];
  recentAttachments: RecentAttachment[];
  kpiOk: number;
  kpiNg: number;
  kpiPending: number;
  kpiTotal: number;
}

export default function DashboardClientView({
  canManage,
  role,
  announcements,
  tickerAnnouncements,
  recentPublicDocs,
  recentAttachments,
  kpiOk,
  kpiNg,
  kpiPending,
  kpiTotal,
}: Props) {
  const locale = useContext(LocaleContext);
  const isTh = locale === "th";

  return (
    <div className="max-w-350 mx-auto w-full flex flex-col gap-5 pb-10">
      {/* Hero */}
      <HeroBanner announcements={tickerAnnouncements} />

      {/* Role Strip */}
      <DashboardRoleStrip role={role} isTh={isTh} />

      {/* Quick Actions */}
      <DashboardQuickActions isTh={isTh} role={role} />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 8 cols */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Announcements */}
          <div className="bg-white border border-base-300 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-base-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                {isTh ? "ข่าวสารและประกาศ" : "Announcements"}
              </h2>
              {canManage && (
                <Link href="/qms/announcements" className="text-xs text-primary font-semibold hover:underline">
                  {isTh ? "จัดการ" : "Manage"}
                </Link>
              )}
            </div>
            <DashboardAnnouncementsFeed
              announcements={announcements}
              canManage={canManage}
              isTh={isTh}
            />
          </div>

          {/* Documents */}
          <div className="bg-white border border-base-300 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-base-200">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {isTh ? "เอกสารเปลี่ยนแปลงล่าสุด" : "Recently Changed Documents"}
              </h2>
            </div>
            <DashboardDocsFeed docs={recentPublicDocs} isTh={isTh} />
          </div>
        </div>

        {/* Right: 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* KPI Widget */}
          <div className="bg-white border border-base-300 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-base-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-primary">{isTh ? "KPI รายเดือน" : "KPI Monthly"}</h2>
              <span className="text-[11px] text-gray-400">{kpiTotal} {isTh ? "ตัวชี้วัด" : "indicators"}</span>
            </div>
            <div className="p-5">
              <DashboardKpiWidget
                kpiOk={kpiOk}
                kpiNg={kpiNg}
                kpiPending={kpiPending}
                kpiTotal={kpiTotal}
                isTh={isTh}
              />
            </div>
          </div>

          <DashboardCarWidget isTh={isTh} />
          <DashboardAttachmentsWidget recentAttachments={recentAttachments} isTh={isTh} />
        </div>
      </div>
    </div>
  );
}
