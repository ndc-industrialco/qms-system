"use client";

import type { UserWithDept } from "@/types/user";
import type { UserRole } from "@/generated/prisma/client";

type Props = {
  user: UserWithDept;
  onToggle: (userId: string, newRole: "MR" | "USER") => void;
  loading: boolean;
  isTh: boolean;
};

const ROLE_BADGE: Record<string, string> = {
  USER: "px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-base-200 text-neutral",
  MR:   "px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-warning/15 text-warning",
  QMS:  "px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-info/15 text-info",
  IT:   "px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-success/15 text-success",
};

const ROLE_LABEL_TH: Record<UserRole, string> = { USER: "ผู้ใช้งาน", QMS: "QMS", MR: "ผู้แทนฝ่ายบริหาร", IT: "IT" };
const ROLE_LABEL_EN: Record<UserRole, string> = { USER: "User", QMS: "QMS", MR: "Mgmt. Rep.", IT: "IT" };

export default function MrUserRow({ user, onToggle, loading, isTh }: Props) {
  const canToggle = user.role === "USER" || user.role === "MR";
  const isMr = user.role === "MR";
  const roleLabel = isTh ? ROLE_LABEL_TH[user.role] : ROLE_LABEL_EN[user.role];

  return (
    <tr className="border-b border-base-200 hover:bg-base-100 transition-colors">
      <td className="py-3 px-4 text-[13px] font-semibold text-neutral">
        {user.name ?? "—"}
        {isMr && (
          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-warning/20 text-warning uppercase tracking-wide">MR</span>
        )}
      </td>
      <td className="py-3 px-4 text-[11px] text-gray-500 hidden md:table-cell">{user.email}</td>
      <td className="py-3 px-4 text-[11px] text-gray-500 hidden md:table-cell">{user.department?.name ?? "—"}</td>
      <td className="py-3 px-4">
        <span className={ROLE_BADGE[user.role] ?? ROLE_BADGE.USER}>{roleLabel}</span>
      </td>
      <td className="py-3 px-4">
        {canToggle ? (
          <button
            className={`btn btn-xs rounded-md gap-1 ${isMr ? "btn-warning btn-outline" : "btn-primary"}`}
            disabled={loading}
            onClick={() => onToggle(user.id, isMr ? "USER" : "MR")}
          >
            {loading ? <span className="loading loading-spinner loading-xs" /> : null}
            {isMr
              ? (isTh ? "ยกเลิก MR" : "Remove MR")
              : (isTh ? "ตั้งเป็น MR" : "Set as MR")}
          </button>
        ) : (
          <span className="text-[11px] text-gray-400 italic">{isTh ? "ไม่สามารถเปลี่ยนได้" : "Protected"}</span>
        )}
      </td>
    </tr>
  );
}
