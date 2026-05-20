export const runtime = 'edge';

import { signIn, auth } from "@/lib/auth-node";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="min-h-screen flex">
      {/* ── Left: dark brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col px-12 py-14 relative overflow-hidden"
        style={{ background: "linear-gradient(165deg, var(--sidebar-bg-from), var(--sidebar-bg-to))" }}
      >
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(34% 0.16 264 / 0.5) 0%, transparent 70%)",
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{
            background: "linear-gradient(to top, oklch(18% 0.10 264 / 0.6) 0%, transparent 100%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col flex-1">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(34% 0.16 264)" }}
            >
              <QmsLogoIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-[17px] font-semibold text-white">QMS System</span>
          </div>

          {/* Main hero text */}
          <div className="flex flex-col gap-5 mt-16">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium w-fit"
              style={{ background: "oklch(34% 0.16 264)", color: "var(--sidebar-icon-active)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              NDC Quality Management System
            </div>

            <h1
              className="text-[34px] font-bold leading-tight tracking-tight text-white"
            >
              ระบบบริหาร<br />
              จัดการคุณภาพ
            </h1>
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: "var(--sidebar-text-muted)" }}
            >
              เข้าสู่ระบบเพื่อจัดการคำขอเอกสาร<br />
              ติดตามสถานะ และเข้าถึงไฟล์ SharePoint
            </p>

            {/* Feature list */}
            <ul className="flex flex-col gap-2.5 mt-2">
              {[
                "จัดการคำขอเอกสาร DAR",
                "ติดตามสถานะแบบเรียลไทม์",
                "รองรับ Microsoft 365",
                "ระบบสิทธิ์ตามบทบาทหน้าที่",
              ].map((text) => (
                <li key={text} className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "oklch(34% 0.16 264)" }}
                  >
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-xs md:text-sm" style={{ color: "var(--sidebar-text)" }}>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom: version tag */}
        <p className="relative z-10 text-[11px] mt-12" style={{ color: "var(--sidebar-text-muted)" }}>
          v1.0 · NDC · 2025
        </p>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-base-100 px-6 py-12 sm:px-12">
        <div className="w-full max-w-[340px] flex flex-col gap-8">
          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <QmsLogoIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-[18px] font-bold text-base-content">QMS System</span>
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold text-primary tracking-tight">
              ยินดีต้อนรับ
            </h2>
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
              เข้าสู่ระบบด้วยบัญชี Microsoft 365 ขององค์กร
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-base-300" />

          {/* Sign in button */}
          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="btn btn-primary w-full h-11 gap-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <MicrosoftIcon />
              <span className="text-[13.5px] font-medium">เข้าสู่ระบบด้วย Microsoft 365</span>
            </button>
          </form>

          {/* Footer note */}
          <p className="text-[11px] md:text-xs text-gray-500 text-center leading-relaxed">
            ระบบนี้รองรับเฉพาะบัญชีอีเมลของบริษัท
            <br />
            ที่เชื่อมต่อกับ Microsoft Entra ID เท่านั้น
          </p>
        </div>
      </div>
    </div>
  );
}

function QmsLogoIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
