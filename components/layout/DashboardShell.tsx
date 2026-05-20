"use client";

import { useState } from "react";
import type { UserRole } from "@/app/generated/prisma/edge";
import { LocaleContext } from "@/lib/locale-context";
import DashboardNavbar from "./DashboardNavbar";
import DashboardSidebar from "./DashboardSidebar";

type Props = {
  role: UserRole;
  name: string;
  email: string;
  image?: string | null;
  children: React.ReactNode;
};

export default function   ({ role, name, email, image, children }: Props) {
  const [locale, setLocale] = useState<"th" | "en">("th");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <LocaleContext.Provider value={locale}>
      <div className="flex h-screen overflow-hidden bg-base-200">
        {/* Mobile Sidebar Drawer */}
        <DashboardSidebar
          role={role}
          name={name}
          email={email}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          locale={locale}
        />

        {/* Main Column */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <DashboardNavbar
            role={role}
            name={name}
            email={email}
            image={image}
            locale={locale}
            onLocaleChange={setLocale}
            onToggleSidebar={() => setMobileSidebarOpen(true)}
          />

          {/* Scrollable content area */}
          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 pb-8">
            {children}
          </main>
        </div>
      </div>
    </LocaleContext.Provider>
  );
}
