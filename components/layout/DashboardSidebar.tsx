"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/generated/prisma/client";
import SignOutButton from "./SignOutButton";

type NavItem = { labelTh: string; labelEn: string; href: string; icon: React.ReactNode; exact?: boolean };
type Props = {
  role: UserRole;
  name: string;
  email: string;
  image?: string | null;
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

function UserStarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function KpiTargetIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function KpiMonthlyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function getSections(role: UserRole, locale: "th" | "en"): { label: string; items: NavItem[] }[] {
  const userItems: NavItem[] = [
    { labelTh: "หน้าหลัก", labelEn: "Dashboard", href: "/", icon: <HomeIcon /> },
    { labelTh: "คำขอเอกสาร", labelEn: "My Requests", href: "/dar", icon: <FileIcon /> },
    { labelTh: "เอกสารทั้งหมด", labelEn: "Document Control", href: "/qms/document-controls", icon: <FileIcon /> },
    { labelTh: "โปรไฟล์ของฉัน", labelEn: "My Profile", href: "/profile", icon: <ProfileIcon /> },
    { labelTh: "งานรออนุมัติ", labelEn: "Approve Queue", href: "/approve", icon: <CheckIcon /> },
    { labelTh: "วัตถุประสงค์ KPI", labelEn: "KPI Objectives", href: "/qms/kpi", icon: <KpiTargetIcon />, exact: true },
    { labelTh: "รายงาน KPI รายเดือน", labelEn: "Monthly KPI", href: "/qms/kpi/monthly", icon: <KpiMonthlyIcon /> },
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

  const setMrItem: NavItem = { labelTh: "กำหนด MR", labelEn: "Set MR", href: "/qms/mr", icon: <UserStarIcon /> };

  if (role === "QMS" || role === "MR") {
    sections.push({ label: "QMS", items: [...qmsItems, setMrItem] });
  } else if (role === "IT") {
    sections.push({ label: "QMS", items: [...qmsItems, setMrItem] });
    sections.push({ label: locale === "th" ? "ระบบ IT" : "IT Admin", items: itItems });
  }

  return sections;
}

/* ── Component ───────────────────────────────────────────────── */

export default function DashboardSidebar({ role, name, email, image, isOpen, onClose, locale }: Props) {
  const pathname = usePathname();
  const sections = getSections(role, locale);
  const signOutLabel = locale === "th" ? "ออกจากระบบ" : "Sign Out";

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto flex flex-col shrink-0 h-screen w-60 overflow-hidden sidebar-surface transform transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ── Brand ── */}
        <div
          className="flex items-center justify-between h-16 px-5 shrink-0"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/logo/logo.webp"
              alt="NDC Industrial"
              width={150}
              height={40}
              className="h-10 w-auto brightness-0 invert object-contain"
            />
          </Link>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150 hover:bg-white/10"
            style={{ color: "var(--sidebar-text-muted)" }}
            aria-label={locale === "en" ? "Close sidebar" : "ปิดเมนู"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-4">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              <p
                className="px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] mt-3 flex items-center gap-2"
                style={{ color: "var(--sidebar-text-muted)" }}
              >
                {section.label}
              </p>

              {section.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                const label = locale === "en" ? item.labelEn : item.labelTh;

                return (
                  <div key={item.href} className="relative group">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3.5 px-4 py-3 text-[13px] font-medium ${
                        isActive ? "sidebar-item-active" : "sidebar-item"
                      }`}
                    >
                      <span className="scale-110" style={{ color: isActive ? "var(--sidebar-icon-active)" : "var(--sidebar-text-muted)" }}>
                        {item.icon}
                      </span>
                      <span
                        className="truncate"
                        style={{ color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)" }}
                      >
                        {label}
                      </span>
                      {isActive && (
                        <span
                          className="ml-auto w-1.5 h-6 rounded-full shrink-0"
                          style={{ background: "var(--sidebar-icon-active)" }}
                        />
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer: user info + sign out ── */}
        <div
          className="px-4 py-5 mt-auto shrink-0"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <Link href="/profile" onClick={onClose} className="flex items-center gap-3.5 px-1 min-w-0 mb-4 rounded-lg py-1 hover:bg-white/5 transition-colors group">
            {image ? (
              <Image
                src={image}
                alt={name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white/20"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ring-2 ring-white/10"
                style={{
                  background: "linear-gradient(135deg, oklch(36% 0.16 264), oklch(28% 0.13 264))",
                  color: "var(--sidebar-text-active)",
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: "var(--sidebar-text-active)" }}>
                {name}
              </p>
              <p className="text-[11px] truncate leading-tight mt-1" style={{ color: "var(--sidebar-text-muted)" }}>
                {email}
              </p>
            </div>
          </Link>
          <SignOutButton label={signOutLabel} />
        </div>
      </aside>
    </>
  );
}
