"use client";

import { useContext, useMemo, useState } from "react";
import Link from "next/link";
import { LocaleContext } from "@/lib/locale-context";
import type {
  Announcement,
  PublicDocument,
  DarAttachment,
  UserRole,
} from "@/generated/prisma/client";
import HeroBanner from "@/components/dashboard/HeroBanner";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import DashboardAnnouncementsFeed from "@/components/dashboard/DashboardAnnouncementsFeed";
import DashboardDocsFeed from "@/components/dashboard/DashboardDocsFeed";
import DashboardKpiWidget from "@/components/dashboard/DashboardKpiWidget";
import {
  DashboardCarWidget,
  DashboardAttachmentsWidget,
} from "@/components/dashboard/DashboardCarWidget";
import {
  Laptop,
  ClipboardCheck,
  Truck,
  ShieldCheck,
  Users,
  BadgeCheck,
  FolderOpen,
  ChevronRight,
  Network,
} from "lucide-react";

type RecentAttachment = DarAttachment;

interface Props {
  canManage: boolean;
  role: UserRole;
  announcements: Announcement[];
  tickerAnnouncements: Announcement[];
  recentPublicDocs: PublicDocument[];
  departments: { id: string; name: string; documentCount: number }[];
  recentAttachments: RecentAttachment[];
  kpiOk: number;
  kpiNg: number;
  kpiPending: number;
  kpiTotal: number;
}

function getDeptIcon(name: string) {
  const n = name.toUpperCase();
  if (n.includes("IT")) return <Laptop className="w-6 h-6 text-white" />;
  if (n.includes("QA") || n.includes("QC") || n.includes("ตรวจสอบ"))
    return <ClipboardCheck className="w-6 h-6 text-white" />;
  if (
    n.includes("PROCUR") ||
    n.includes("PURCHAS") ||
    n.includes("BUY") ||
    n.includes("จัดซื้อ")
  )
    return <Truck className="w-6 h-6 text-white" />;
  if (
    n.includes("SAFE") ||
    n.includes("SECURE") ||
    n.includes("HEALTH") ||
    n.includes("ความปลอดภัย")
  )
    return <ShieldCheck className="w-6 h-6 text-white" />;
  if (
    n.includes("HR") ||
    n.includes("HUMAN") ||
    n.includes("PEOPLE") ||
    n.includes("บุคคล")
  )
    return <Users className="w-6 h-6 text-white" />;
  if (n.includes("QMS") || n.includes("ISO") || n.includes("QUAL"))
    return <BadgeCheck className="w-6 h-6 text-white" />;
  return <FolderOpen className="w-6 h-6 text-white" />;
}

export default function DashboardClientView({
  canManage,
  role,
  announcements,
  tickerAnnouncements,
  recentPublicDocs,
  departments,
  recentAttachments,
  kpiOk,
  kpiNg,
  kpiPending,
  kpiTotal,
}: Props) {
  const locale = useContext(LocaleContext);
  const isTh = locale === "th";
  const [deptFilter, setDeptFilter] = useState("");
  const [deptSelected, setDeptSelected] = useState("all");
  const previewDepartments = useMemo(() => {
    const q = deptFilter.trim().toLowerCase();
    return departments.filter((dept) => {
      const matchesDropdown = deptSelected === "all" || dept.id === deptSelected;
      const matchesText = !q || dept.name.toLowerCase().includes(q);
      return matchesDropdown && matchesText;
    });
  }, [departments, deptFilter, deptSelected]);

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 pb-10">
      <HeroBanner announcements={tickerAnnouncements} />

      <DashboardQuickActions isTh={isTh} role={role} />

      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[rgb(15,16,89)]/10 flex items-center justify-center">
              <Network className="w-4 h-4 text-[rgb(15,16,89)]" />
            </div>
            <h2 className="text-base font-semibold text-[rgb(15,16,89)]">
              {isTh ? "แผนกที่ใช้งานเอกสาร" : "Document Departments"}
            </h2>
          </div>
          <Link
            href="/qms/document-controls"
            className="h-11 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {isTh ? "ดูทั้งหมด" : "View all"}
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={deptSelected}
              onChange={(e) => setDeptSelected(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[rgb(15,16,89)]/20"
            >
              <option value="all">{isTh ? "ทุกแผนก" : "All departments"}</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              placeholder={isTh ? "ค้นหาแผนก..." : "Filter departments..."}
              className="w-full md:col-span-2 h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[rgb(15,16,89)]/20"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 pr-1 snap-x snap-mandatory scrollbar-thin">
          {previewDepartments.map((dept) => (
            <Link
              key={dept.id}
              href={`/qms/document-controls/dept/${dept.id}`}
              className="group relative shrink-0 w-42 flex flex-col items-center justify-center p-4 bg-linear-to-br from-[#101257] to-[#080936] rounded-xl border border-white/5 shadow-md hover:shadow-xl hover:shadow-indigo-950/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer min-h-33 snap-start"
            >
              <div className="absolute -top-5 -right-5 w-16 h-16 bg-white/5 rounded-full border border-white/5 pointer-events-none transition-transform duration-500 group-hover:scale-110" />
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-white/20">
                {getDeptIcon(dept.name)}
              </div>
              <span className="text-white font-semibold text-sm mt-3 tracking-wide group-hover:text-sky-300 transition-colors duration-200 text-center line-clamp-2">
                {dept.name}
              </span>
              <span className="text-slate-300/80 font-medium text-[11px] mt-1">
                {dept.documentCount} {isTh ? "เอกสาร" : "documents"}
              </span>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300">
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[rgb(15,16,89)] flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
                {isTh ? "ข่าวสารและประกาศ" : "Announcements"}
              </h2>
              {canManage && (
                <Link
                  href="/qms/announcements"
                  className="text-xs text-[rgb(15,16,89)] font-semibold hover:underline"
                >
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

          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-[rgb(15,16,89)] flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {isTh
                  ? "เอกสารเปลี่ยนแปลงล่าสุด"
                  : "Recently Changed Documents"}
              </h2>
            </div>
            <DashboardDocsFeed docs={recentPublicDocs} isTh={isTh} />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[rgb(15,16,89)]">
                {isTh ? "KPI รายเดือน" : "KPI Monthly"}
              </h2>
              <span className="text-xs text-slate-400">
                {kpiTotal} {isTh ? "ตัวชี้วัด" : "indicators"}
              </span>
            </div>
            <div className="p-6">
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
          <DashboardAttachmentsWidget
            recentAttachments={recentAttachments}
            isTh={isTh}
          />
        </div>
      </div>
    </div>
  );
}
