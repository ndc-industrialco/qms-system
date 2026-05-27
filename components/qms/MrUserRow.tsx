"use client";

import type { UserWithDept } from "@/types/user";
import type { UserRole } from "@/generated/prisma/client";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  user: UserWithDept;
  onToggle: (userId: string, newRole: "MR" | "USER") => void;
  loading: boolean;
  isTh: boolean;
};

const ROLE_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  USER: "secondary",
  MR:   "default",
  QMS:  "outline",
  IT:   "default",
};

const ROLE_LABEL_TH: Record<UserRole, string> = { USER: "ผู้ใช้งาน", QMS: "QMS", MR: "ผู้แทนฝ่ายบริหาร", IT: "IT" };
const ROLE_LABEL_EN: Record<UserRole, string> = { USER: "User", QMS: "QMS", MR: "Mgmt. Rep.", IT: "IT" };

export default function MrUserRow({ user, onToggle, loading, isTh }: Props) {
  const canToggle = user.role === "USER" || user.role === "MR";
  const isMr = user.role === "MR";
  const roleLabel = isTh ? ROLE_LABEL_TH[user.role] : ROLE_LABEL_EN[user.role];

  return (
    <TableRow>
      <TableCell className="font-semibold text-neutral">
        {user.name ?? "—"}
        {isMr && (
          <Badge variant="default" className="ml-2 px-1.5 py-0.5 text-[9px] uppercase tracking-wide bg-amber-500 hover:bg-amber-600">
            MR
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-gray-500 hidden md:table-cell">{user.email}</TableCell>
      <TableCell className="text-gray-500 hidden md:table-cell">{user.department?.name ?? "—"}</TableCell>
      <TableCell>
        <Badge variant={ROLE_BADGE[user.role] ?? "secondary"}>{roleLabel}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {canToggle ? (
          <Button
            size="sm"
            variant={isMr ? "outline" : "default"}
            disabled={loading}
            onClick={() => onToggle(user.id, isMr ? "USER" : "MR")}
            className={isMr ? "text-amber-600 border-amber-200 hover:bg-amber-50" : ""}
          >
            {loading ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> : null}
            {isMr
              ? (isTh ? "ยกเลิก MR" : "Remove MR")
              : (isTh ? "ตั้งเป็น MR" : "Set as MR")}
          </Button>
        ) : (
          <span className="text-[11px] text-gray-400 italic">{isTh ? "ไม่สามารถเปลี่ยนได้" : "Protected"}</span>
        )}
      </TableCell>
    </TableRow>
  );
}
