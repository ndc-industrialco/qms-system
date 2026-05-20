"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/app/generated/prisma/edge";

type NavItem = { labelTh: string; labelEn: string; href: string; icon: React.ReactNode };
type Props = {
  role: UserRole;
  name: string;
  email: string;
  isOpen: boolean;
  onClose: () => void;
  locale: "th" | "en";
};

/* ── Icons ─────────────────────────────────────────────────── */

function FileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function SharePointIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.707 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}


function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}


function getSections(role: UserRole, locale: "th" | "en"): { label: string; items: NavItem[] }[] {
  const userItems: NavItem[] = [
    { labelTh: "หน้าหลัก", labelEn: "Dashboard", href: "/", icon: <HomeIcon /> },
    { labelTh: "คำขอเอกสาร", labelEn: "My Requests", href: "/dar", icon: <FileIcon /> },
  ];
  const qmsItems: NavItem[] = [
    { labelTh: "จัดการข่าวสาร", labelEn: "Manage Announcements", href: "/qms/announcements", icon: <MegaphoneIcon /> },
    { labelTh: "จัดการ DAR", labelEn: "Manage DAR", href: "/qms/dar", icon: <CheckIcon /> },
    { labelTh: "SharePoint Files", labelEn: "SharePoint Files", href: "/qms/sharepoint", icon: <SharePointIcon /> },
  ];
  const itItems: NavItem[] = [
    { labelTh: "จัดการผู้ใช้", labelEn: "Manage Users", href: "/it/users", icon: <UsersIcon /> },
    { labelTh: "จัดการแผนก", labelEn: "Manage Departments", href: "/it/departments", icon: <BuildingIcon /> },
  ];

  const sections: { label: string; items: NavItem[] }[] = [
    { label: locale === "th" ? "งานของฉัน" : "My Work", items: userItems },
  ];

  if (role === "QMS" || role === "MR" || role === "IT") {
    sections.push({ label: locale === "th" ? "QMS" : "QMS", items: qmsItems });
  }
  if (role === "IT") {
    sections.push({ label: locale === "th" ? "ระบบ IT" : "IT Admin", items: itItems });
  }

  return sections;
}

/* ── Component ───────────────────────────────────────────────── */

export default function DashboardSidebar({ role, name, email, isOpen, onClose, locale }: Props) {
  const pathname = usePathname();
  const sections = getSections(role, locale);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 h-screen w-65 overflow-hidden sidebar-surface transform transition-transform duration-300 ease-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ── Brand ── */}
      <div
        className="flex items-center justify-between h-20 px-4 shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/logo.webp"
          alt="NDC Industrial"
          className="h-10 w-auto brightness-0 invert object-contain"
        />

        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150 hover:bg-white/10"
          style={{ color: "var(--sidebar-text-muted)" }}
          aria-label={locale === "en" ? "Close sidebar" : "ปิดเมนู"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.label} className="flex flex-col gap-0.5">
            {/* Section label */}
            <p className="px-3 mb-1 text-[11px] font-bold uppercase tracking-widest mt-2" style={{ color: "var(--sidebar-text-muted)" }}>
              {section.label}
            </p>

            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const label = locale === "en" ? item.labelEn : item.labelTh;

              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium ${
                      isActive ? "sidebar-item-active" : "sidebar-item"
                    }`}
                  >
                    <span style={{ color: isActive ? "var(--sidebar-icon-active)" : "var(--sidebar-text-muted)" }}>
                      {item.icon}
                    </span>
                    <span className="truncate" style={{ color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)" }}>
                      {label}
                    </span>
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="ml-auto w-1 h-5 rounded-full shrink-0" style={{ background: "var(--sidebar-icon-active)" }} />
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer: user info ── */}
      <div
        className="px-4 py-4 mt-auto"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-3 px-1 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ring-2 ring-base-content/10"
            style={{ background: "oklch(34% 0.16 264)", color: "var(--sidebar-text-active)" }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium truncate leading-tight" style={{ color: "var(--sidebar-text-active)" }}>
              {name}
            </p>
            <p className="text-[12px] truncate leading-tight mt-0.5" style={{ color: "var(--sidebar-text-muted)" }}>
              {email}
            </p>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
