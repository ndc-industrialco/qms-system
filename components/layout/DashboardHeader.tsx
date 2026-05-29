"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { UserRole } from "@/generated/prisma/client";
import SignOutButton from "./SignOutButton";
import AnnouncementTicker from "./AnnouncementTicker";

type Props = {
  role: UserRole;
  name: string;
  email: string;
  image?: string | null;
  locale: "th" | "en";
  onLocaleChange: (locale: "th" | "en") => void;
  onToggleSidebar?: () => void;
};

const ROUTE_LABELS: Record<string, { th: string; en: string }> = {
  "/dar":                    { th: "คำขอเอกสาร",     en: "Document Requests" },
  "/dar/new":                { th: "สร้างคำขอใหม่",   en: "New Request" },
  "/qms/dar":                { th: "จัดการ DAR",      en: "Manage DAR" },
  "/qms/announcements":      { th: "จัดการประกาศ",    en: "Manage Announcements" },
  "/qms/announcements/new":  { th: "ประกาศใหม่",      en: "New Announcement" },
  "/qms/sharepoint":         { th: "SharePoint Files", en: "SharePoint Files" },
  "/qms/mr":                 { th: "กำหนด MR",         en: "Set MR" },
  "/approve":                { th: "งานรออนุมัติ",     en: "Approve Queue" },
  "/it/users":               { th: "จัดการผู้ใช้",    en: "Manage Users" },
  "/it/departments":         { th: "จัดการแผนก",      en: "Manage Departments" },
};

function getBreadcrumbs(pathname: string, locale: "th" | "en") {
  const home = locale === "th" ? "หน้าหลัก" : "Home";
  const crumbs: string[] = [home];

  const match = ROUTE_LABELS[pathname];
  if (match) {
    crumbs.push(match[locale]);
  } else if (pathname.startsWith("/dar/")) {
    crumbs.push(locale === "th" ? "คำขอเอกสาร" : "Document Requests");
    if (pathname.includes("/edit")) crumbs.push(locale === "th" ? "แก้ไข" : "Edit");
    else crumbs.push(locale === "th" ? "รายละเอียด" : "Detail");
  } else if (pathname.startsWith("/it/departments/")) {
    crumbs.push(locale === "th" ? "จัดการแผนก" : "Manage Departments");
    crumbs.push(locale === "th" ? "รายละเอียด" : "Detail");
  } else if (pathname.startsWith("/approve/")) {
    crumbs.push(locale === "th" ? "งานรออนุมัติ" : "Approve Queue");
    if (pathname.endsWith("/reviewer")) crumbs.push(locale === "th" ? "ผู้ตรวจสอบ" : "Reviewer");
    if (pathname.endsWith("/approver")) crumbs.push(locale === "th" ? "ผู้อนุมัติ" : "Approver");
  }
  return crumbs;
}

const ROLE_LABELS: Record<UserRole, { th: string; en: string }> = {
  USER: { th: "ผู้ใช้งาน",         en: "User" },
  QMS:  { th: "เจ้าหน้าที่ QMS",   en: "QMS Officer" },
  MR:   { th: "ผู้แทนฝ่ายบริหาร",  en: "Management Rep." },
  IT:   { th: "เจ้าหน้าที่ IT",    en: "IT Officer" },
};

export default function DashboardHeader({ role, name, email, image, locale, onLocaleChange, onToggleSidebar }: Props) {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname, locale);
  const pageTitle = crumbs[crumbs.length - 1];
  const roleLabel = ROLE_LABELS[role][locale];
  const signOutLabel = locale === "th" ? "ออกจากระบบ" : "Sign Out";
  const notifLabel = locale === "th" ? "การแจ้งเตือน" : "Notifications";

  return (
    <header className="flex flex-col bg-base-100/80 backdrop-blur-md border-b border-base-300 shrink-0 z-30 sticky top-0">
      {/* Main row */}
      <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-3">
        {/* Left: hamburger (mobile) + page title / breadcrumb */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Hamburger — mobile only */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-base-200 transition-colors shrink-0 text-base-content"
              aria-label="Toggle menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Mobile: page title */}
          <p className="md:hidden text-[15px] font-semibold truncate min-w-0 flex-1 text-base-content">{pageTitle}</p>

          {/* Desktop: Breadcrumbs */}
          <div className="hidden md:flex items-center text-xs font-medium text-neutral">
            {crumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center">
                {idx > 0 && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mx-1.5 opacity-50 text-neutral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span className={idx === crumbs.length - 1 ? "text-base-content font-bold tracking-wide" : "hover:text-base-content transition-colors cursor-default"}>
                  {crumb}
                </span>
              </div>
            ))}
          </div>
        </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* TH / EN switcher */}
        <div className="flex items-center rounded-lg overflow-hidden border border-base-300 bg-base-100/50 p-0.5 gap-0.5">
          {(["th", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => onLocaleChange(l)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors duration-150 ${
                locale === l
                  ? "bg-primary text-primary-content font-bold tracking-wide"
                  : "text-neutral hover:text-base-content"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Notification bell */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-base-200 transition-colors text-neutral"
          aria-label={notifLabel}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Profile dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-base-200 transition-colors duration-150 outline-none">
              {image ? (
                <Image src={image} alt={name} width={28} height={28} className="w-7 h-7 rounded-full object-cover ring-2 ring-base-300" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold ring-2 ring-base-300 text-primary">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[13px] font-medium hidden md:block max-w-28 truncate text-base-content">{name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 hidden md:block text-neutral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-[9999] w-60 bg-base-100 rounded-xl border border-base-300 shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            >
              {/* User info block */}
              <div className="px-4 py-3 border-b border-base-300 flex items-center gap-3">
                {image ? (
                  <Image src={image} alt={name} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-base-300" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center text-[14px] font-bold shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-base-content truncate">{name}</p>
                  <p className="text-[11px] text-neutral truncate">{email}</p>
                  <p className="text-[11px] text-neutral mt-0.5">{roleLabel}</p>
                </div>
              </div>

              {/* Sign out */}
              <div className="p-1">
                <SignOutButton label={signOutLabel} />
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      </div>{/* end main row */}

      {/* Full-width ticker strip */}
      <AnnouncementTicker locale={locale} />
    </header>
  );
}
