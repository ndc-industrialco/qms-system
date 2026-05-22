"use client";

import type { UserRole } from "@/generated/prisma/client";

type Props = { role: UserRole; isTh: boolean };

type Perm = { labelTh: string; labelEn: string };

const ROLE_LABELS: Record<UserRole, { th: string; en: string; color: string; bg: string }> = {
  USER: { th: "ผู้ใช้งาน",          en: "User",            color: "#374151", bg: "rgba(55,65,81,0.1)" },
  QMS:  { th: "เจ้าหน้าที่ QMS",    en: "QMS Officer",     color: "#1D6A8A", bg: "rgba(29,106,138,0.1)" },
  MR:   { th: "ผู้แทนฝ่ายบริหาร",   en: "Management Rep.", color: "#D97706", bg: "rgba(217,119,6,0.1)" },
  IT:   { th: "เจ้าหน้าที่ IT",     en: "IT Officer",      color: "#059669", bg: "rgba(5,150,105,0.1)" },
};

const ROLE_PERMS: Record<UserRole, Perm[]> = {
  USER: [
    { labelTh: "หน้าหลัก", labelEn: "Dashboard" },
    { labelTh: "คำขอ DAR", labelEn: "My DAR" },
  ],
  MR: [
    { labelTh: "หน้าหลัก", labelEn: "Dashboard" },
    { labelTh: "คำขอ DAR", labelEn: "My DAR" },
    { labelTh: "จัดการ DAR", labelEn: "Manage DAR" },
    { labelTh: "ประกาศ", labelEn: "Announcements" },
    { labelTh: "SharePoint", labelEn: "SharePoint" },
  ],
  QMS: [
    { labelTh: "หน้าหลัก", labelEn: "Dashboard" },
    { labelTh: "คำขอ DAR", labelEn: "My DAR" },
    { labelTh: "จัดการ DAR", labelEn: "Manage DAR" },
    { labelTh: "ประกาศ", labelEn: "Announcements" },
    { labelTh: "SharePoint", labelEn: "SharePoint" },
    { labelTh: "กำหนด MR", labelEn: "Set MR" },
  ],
  IT: [
    { labelTh: "หน้าหลัก", labelEn: "Dashboard" },
    { labelTh: "คำขอ DAR", labelEn: "My DAR" },
    { labelTh: "จัดการ DAR", labelEn: "Manage DAR" },
    { labelTh: "ประกาศ", labelEn: "Announcements" },
    { labelTh: "SharePoint", labelEn: "SharePoint" },
    { labelTh: "กำหนด MR", labelEn: "Set MR" },
    { labelTh: "จัดการผู้ใช้", labelEn: "Manage Users" },
    { labelTh: "จัดการแผนก", labelEn: "Departments" },
  ],
};

export default function DashboardRoleStrip({ role, isTh }: Props) {
  const rl = ROLE_LABELS[role];
  const perms = ROLE_PERMS[role];
  const accessLabel = isTh ? "สิทธิ์การเข้าถึง" : "Access";
  const roleLabel = isTh ? "บทบาท" : "Role";

  return (
    <div className="bg-white border border-base-300 rounded-xl px-5 py-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-gray-400">{roleLabel}:</span>
        <span
          className="px-2.5 py-0.5 text-[11px] font-bold rounded-full"
          style={{ color: rl.color, background: rl.bg }}
        >
          {isTh ? rl.th : rl.en}
        </span>
      </div>
      <div className="h-4 w-px bg-base-300 hidden sm:block shrink-0" />
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        <span className="text-[11px] text-gray-400 shrink-0">{accessLabel}:</span>
        {perms.map((p) => (
          <span
            key={p.labelEn}
            className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-primary/10 text-primary border border-primary/15"
          >
            {isTh ? p.labelTh : p.labelEn}
          </span>
        ))}
      </div>
    </div>
  );
}
