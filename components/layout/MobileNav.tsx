"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/app/generated/prisma/edge";

type NavItem = { labelTh: string; labelEn: string; href: string; icon: React.ReactNode };
type Props = { role: UserRole; locale: "th" | "en" };

/* ── Icons ─────────────────────────────────────────────── */

function FileIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CheckIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function SharePointIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.707 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function UsersIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function BuildingIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

/* ── Nav data ───────────────────────────────────────────── */

function getAllNavItems(role: UserRole, activeMap: Record<string, boolean>): NavItem[] {
  const userItems: NavItem[] = [
    { labelTh: "คำขอเอกสาร", labelEn: "Requests", href: "/dar", icon: <FileIcon active={activeMap["/dar"] ?? false} /> },
  ];
  const qmsItems: NavItem[] = [
    { labelTh: "จัดการ DAR", labelEn: "DAR", href: "/qms/dar", icon: <CheckIcon active={activeMap["/qms/dar"] ?? false} /> },
    { labelTh: "SharePoint", labelEn: "SharePoint", href: "/qms/sharepoint", icon: <SharePointIcon active={activeMap["/qms/sharepoint"] ?? false} /> },
  ];
  const itItems: NavItem[] = [
    { labelTh: "ผู้ใช้", labelEn: "Users", href: "/it/users", icon: <UsersIcon active={activeMap["/it/users"] ?? false} /> },
    { labelTh: "แผนก", labelEn: "Dept.", href: "/it/departments", icon: <BuildingIcon active={activeMap["/it/departments"] ?? false} /> },
  ];

  if (role === "IT") return [...userItems, ...qmsItems, ...itItems];
  if (role === "QMS" || role === "MR") return [...userItems, ...qmsItems];
  return userItems;
}

/* ── Component ──────────────────────────────────────────── */

const MAX_VISIBLE = 4;

export default function MobileNav({ role, locale }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeMap: Record<string, boolean> = {};
  getAllNavItems(role, activeMap).forEach((item) => {
    activeMap[item.href] = pathname === item.href || pathname.startsWith(item.href + "/");
  });

  const allItems = getAllNavItems(role, activeMap);
  const visibleItems = allItems.slice(0, MAX_VISIBLE);
  const overflowItems = allItems.slice(MAX_VISIBLE);
  const hasOverflow = overflowItems.length > 0;
  const overflowActive = overflowItems.some((i) => activeMap[i.href]);

  const moreLabel = locale === "th" ? "เพิ่มเติม" : "More";
  const menuLabel = locale === "th" ? "เมนูเพิ่มเติม" : "More options";
  const closeLabel = locale === "th" ? "ปิด" : "Close";

  return (
    <>
      {/* ── Fixed bottom bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-100 border-t border-base-300 flex items-stretch h-16 safe-area-inset-bottom">
        {visibleItems.map((item) => {
          const isActive = activeMap[item.href] ?? false;
          const label = locale === "en" ? item.labelEn : item.labelTh;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors duration-150 px-1 ${
                isActive ? "text-primary" : "text-neutral"
              }`}
            >
              <div className="relative">
                {item.icon}
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="truncate max-w-full leading-none">{label}</span>
            </Link>
          );
        })}

        {hasOverflow && (
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors duration-150 px-1 ${
              overflowActive ? "text-primary" : "text-neutral"
            }`}
          >
            <div className="relative">
              <GridIcon />
              {overflowActive && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </div>
            <span className="leading-none">{moreLabel}</span>
          </button>
        )}
      </nav>

      {/* ── Overflow bottom sheet ── */}
      {hasOverflow && drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-base-content/30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-base-100 rounded-t-2xl border-t border-base-300 shadow-xl px-4 pt-4 pb-6">
            <div className="w-10 h-1 rounded-full bg-base-300 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-semibold text-base-content">{menuLabel}</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral hover:bg-base-200 transition-colors"
                aria-label={closeLabel}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {overflowItems.map((item) => {
                const isActive = activeMap[item.href] ?? false;
                const label = locale === "en" ? item.labelEn : item.labelTh;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl text-[12px] font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-content"
                        : "bg-base-200 text-base-content hover:bg-base-300"
                    }`}
                  >
                    {item.icon}
                    <span className="text-center leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
