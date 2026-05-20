"use client";

import { useContext } from "react";
import Link from "next/link";
import { LocaleContext } from "@/lib/locale-context";
import HeroBanner from "@/components/dashboard/HeroBanner";
import type { Announcement, PublicDocument, Prisma } from "@/app/generated/prisma";

type RecentAttachment = Prisma.DarAttachmentGetPayload<{
  include: { darMaster: { include: { department: true } } };
}>;

interface Props {
  canManage: boolean;
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

  // Translate static strings
  const text = {
    tickerLabel: isTh ? "ประกาศ" : "Announcements",
    allTab: isTh ? "ทั้งหมด" : "All",
    allAnnouncements: isTh ? "ข่าวสารทั้งหมด" : "All Announcements",
    manageAnnouncements: isTh ? "จัดการข่าวสาร" : "Manage Announcements",
    viewAll: isTh ? "ดูทั้งหมด" : "View all",
    noAnnouncements: isTh ? "ไม่มีข่าวสารในขณะนี้" : "No announcements at this time",
    recentlyChangedDocs: isTh ? "เอกสารขึ้นทะเบียนเปลี่ยนแปลงล่าสุด" : "Recently Changed Documents",
    noRecentDocs: isTh ? "ไม่มีเอกสารอัปเดตล่าสุด" : "No recent document updates",
    recentDocs: isTh ? "เอกสารล่าสุด" : "Recent Documents",
    viewMore: isTh ? "ดูเพิ่ม" : "View more",
    noRecentAttachments: isTh ? "ไม่มีเอกสารล่าสุด" : "No recent documents",
    newLabel: isTh ? "ใหม่" : "NEW",
    kpiMonthly: isTh ? "KPI รายเดือน" : "KPI Monthly",
    kpiNoData: isTh ? "ยังไม่มีข้อมูลเดือนนี้" : "No data this month",
    car: "CAR",
    carComingSoon: isTh ? "กำลังพัฒนา" : "Coming soon",
  };

  return (
    <div className="max-w-350 mx-auto w-full flex flex-col gap-6 animate-in fade-in duration-500 pb-10">

      {/* ── 1. Ticker ── */}
      {tickerAnnouncements.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 text-base-content text-[13px] py-1.5 px-3 rounded-lg flex items-center gap-3 overflow-hidden shadow-sm">
          <span className="font-bold whitespace-nowrap bg-primary text-primary-content px-2 py-0.5 rounded text-[11px] uppercase shadow-sm shrink-0">
            {text.tickerLabel}
          </span>
          <div className="flex-1 overflow-hidden relative h-6">
            <div className="animate-marquee whitespace-nowrap absolute inset-0 flex items-center font-medium text-primary">
              {tickerAnnouncements.map(a => (
                <span key={a.id} className="mr-12 inline-flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-warning" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {a.title}
                  {a.content && <span className="text-neutral ml-1">— {a.content.substring(0, 50)}...</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Hero Banner ── */}
      <HeroBanner announcements={tickerAnnouncements} />

      {/* ── 4. Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column (Main) */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Announcements List */}
          <div className="card-premium">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
              <h2 className="text-sm md:text-base font-bold text-primary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {text.allAnnouncements}
              </h2>
              <div className="flex items-center gap-3">
                {canManage && (
                  <Link href="/qms/announcements" className="btn btn-sm btn-outline btn-primary rounded-lg">
                    {text.manageAnnouncements}
                  </Link>
                )}
                <button className="text-[13px] font-medium text-primary hover:underline flex items-center gap-1">
                  {text.viewAll}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {announcements.length > 0 ? announcements.map(a => (
                <div key={a.id} className="flex gap-4 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="w-12 h-12 rounded-xl bg-base-200 flex items-center justify-center shrink-0 border border-base-300 group-hover:border-primary transition-colors">
                    {a.spItemId ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-neutral group-hover:text-primary transition-colors truncate">
                      {a.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{a.content}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs font-medium">
                      <span className="bg-base-200 px-2 py-0.5 rounded text-gray-500">{a.sourceSystem}</span>
                      <span className="text-gray-500/70">
                        {new Date(a.createdAt).toLocaleDateString(isTh ? "th-TH" : "en-US", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  {a.spWebUrl && (
                    <a href={a.spWebUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost btn-square shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              )) : (
                <div className="py-8 text-center text-gray-500 text-sm">{text.noAnnouncements}</div>
              )}
            </div>
          </div>

          {/* Document Changes List */}
          <div className="card-premium">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
              <h2 className="text-sm md:text-base font-bold text-primary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                {text.recentlyChangedDocs}
              </h2>
              <button className="text-[13px] font-medium text-primary hover:underline flex items-center gap-1">
                {text.viewAll}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="p-5 flex flex-col divide-y divide-base-200">
              {recentPublicDocs.length > 0 ? recentPublicDocs.map(doc => (
                <div key={doc.id} className="py-3.5 flex items-center justify-between group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <a href={doc.spWebUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-neutral hover:text-primary transition-colors">
                        {doc.docNumber} - {doc.docName}
                      </a>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Rev.{doc.revision} • {new Date(doc.publishedDate).toLocaleDateString(isTh ? "th-TH" : "en-US")}
                      </div>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-600 rounded-full font-bold text-[10px] px-2 py-0.5 uppercase">{text.newLabel}</span>
                </div>
              )) : (
                <div className="py-8 text-center text-gray-500 text-sm">{text.noRecentDocs}</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* KPI Monthly */}
          <div className="card-premium">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {text.kpiMonthly}
              </h2>
              <span className="text-[11px] font-medium text-gray-400">{isTh ? `ทั้งหมด ${kpiTotal} ตัวชี้วัด` : `${kpiTotal} indicators`}</span>
            </div>
            {kpiTotal === 0 ? (
              <div className="p-5 text-center text-sm text-gray-400">{text.kpiNoData}</div>
            ) : (
              <div className="p-5 grid grid-cols-3 gap-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <p className="text-2xl font-bold text-success">{kpiOk}</p>
                  <p className="text-xs text-gray-500">OK</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-2xl font-bold text-error">{kpiNg}</p>
                  <p className="text-xs text-gray-500">NG</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-2xl font-bold text-warning">{kpiPending}</p>
                  <p className="text-xs text-gray-500">{isTh ? "รอดำเนินการ" : "Pending"}</p>
                </div>
              </div>
            )}
          </div>

          {/* CAR — Corrective Action Requests (mockup) */}
          <div className="card-premium">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {text.car}
              </h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {[
                { dept: isTh ? "แผนกผลิต" : "Production", due: isTh ? "31 พ.ค. 2569" : "31 May 2026" },
                { dept: isTh ? "แผนกคุณภาพ" : "Quality", due: isTh ? "15 มิ.ย. 2569" : "15 Jun 2026" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-base-200 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-neutral">{item.dept}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{isTh ? "ครบกำหนด" : "Due"}: {item.due}</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                    {isTh ? "รอแก้ไข" : "Open"}
                  </span>
                </div>
              ))}
              <p className="text-[11px] text-gray-400 text-center pt-1">{text.carComingSoon}</p>
            </div>
          </div>

          {/* Recent Docs List */}
          <div className="card-premium">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
              <h2 className="text-sm md:text-base font-bold text-primary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-neutral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {text.recentDocs}
              </h2>
              <button className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded hover:bg-primary/20">{text.viewMore}</button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              {recentAttachments.length > 0 ? recentAttachments.map((doc) => (
                <a key={doc.id} href={doc.spWebUrl} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-start group cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="mt-0.5">
                    {doc.fileName.toLowerCase().endsWith('.pdf') ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral group-hover:text-primary transition-colors leading-snug line-clamp-2">{doc.fileName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(doc.createdAt).toLocaleDateString(isTh ? "th-TH" : "en-US")} • {doc.darMaster?.department?.name || 'QMS'}</p>
                  </div>
                </a>
              )) : (
                <div className="text-xs text-gray-500 text-center py-4">{text.noRecentAttachments}</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
