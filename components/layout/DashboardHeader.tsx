"use client";

import { usePathname } from "next/navigation";
import type { UserRole } from "@/app/generated/prisma/edge";
import SignOutButton from "./SignOutButton";

type Props = {
  role: UserRole;
  name: string;
  email: string;
  image?: string | null;
  locale: "th" | "en";
  onLocaleChange: (locale: "th" | "en") => void;
};

const ROUTE_LABELS: Record<string, { th: string; en: string }> = {
  "/dar":              { th: "คำขอเอกสาร",   en: "Document Requests" },
  "/dar/new":          { th: "สร้างคำขอใหม่",  en: "New Request" },
  "/qms/dar":          { th: "จัดการ DAR",    en: "Manage DAR" },
  "/qms/sharepoint":   { th: "SharePoint Files", en: "SharePoint Files" },
  "/it/users":         { th: "จัดการผู้ใช้",   en: "Manage Users" },
  "/it/departments":   { th: "จัดการแผนก",    en: "Manage Departments" },
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
  }
  return crumbs;
}

const ROLE_LABELS: Record<UserRole, { th: string; en: string }> = {
  USER: { th: "ผู้ใช้งาน",         en: "User" },
  QMS:  { th: "เจ้าหน้าที่ QMS",   en: "QMS Officer" },
  MR:   { th: "ผู้แทนฝ่ายบริหาร",  en: "Management Rep." },
  IT:   { th: "เจ้าหน้าที่ IT",    en: "IT Officer" },
};

export default function DashboardHeader({ role, name, email, image, locale, onLocaleChange }: Props) {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname, locale);
  const pageTitle = crumbs[crumbs.length - 1];
  const roleLabel = ROLE_LABELS[role][locale];
  const signOutLabel = locale === "th" ? "ออกจากระบบ" : "Sign Out";
  const notifLabel = locale === "th" ? "การแจ้งเตือน" : "Notifications";

  return (
    <header className="h-14 px-4 md:px-6 flex items-center justify-between topbar-surface shrink-0 gap-3 z-30 sticky top-0">
      {/* Left: page title (mobile) / breadcrumb (desktop) */}
      <div className="min-w-0 flex-1">
        <p className="md:hidden text-[15px] font-semibold text-base-content truncate">{pageTitle}</p>

        <nav className="breadcrumbs text-[13px] text-neutral hidden md:block">
          <ul>
            {crumbs.map((crumb, i) => (
              <li key={i} className={i === crumbs.length - 1 ? "text-base-content font-medium" : ""}>
                {crumb}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* TH / EN switcher */}
        <div className="join border border-base-300 rounded-xl overflow-hidden">
          <button
            onClick={() => onLocaleChange("th")}
            className={`join-item btn btn-xs px-2.5 ${locale === "th" ? "btn-primary" : "btn-ghost text-neutral"}`}
          >
            TH
          </button>
          <button
            onClick={() => onLocaleChange("en")}
            className={`join-item btn btn-xs px-2.5 ${locale === "en" ? "btn-primary" : "btn-ghost text-neutral"}`}
          >
            EN
          </button>
        </div>

        {/* Notification bell */}
        <button className="btn btn-ghost btn-sm btn-circle" aria-label={notifLabel}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Profile dropdown */}
        <div className="dropdown dropdown-end">
          <button tabIndex={0} className="btn btn-ghost btn-sm gap-2 px-2 rounded-xl">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={name} className="w-7 h-7 rounded-full object-cover ring-2 ring-base-300" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center text-[12px] font-bold ring-2 ring-base-300">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[13px] text-base-content hidden md:block max-w-30 truncate">{name}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-neutral hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div tabIndex={0} className="dropdown-content z-50 mt-1 w-60 bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden">
            {/* User info block */}
            <div className="px-4 py-3 border-b border-base-300 flex items-center gap-3">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
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
          </div>
        </div>
      </div>
    </header>
  );
}
