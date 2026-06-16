"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcementService";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Props = {
  row: AnnouncementRow;
  onView: (row: AnnouncementRow) => void;
  onEdit: (row: AnnouncementRow) => void;
  onDelete: (row: AnnouncementRow) => void;
  onToggle: (row: AnnouncementRow, active: boolean) => Promise<void>;
};

const SYSTEM_COLORS: Record<string, string> = {
  QMS:    "bg-[#0F1059]/10 text-[#0F1059]",
  IT:     "bg-sky-50 text-sky-600",
  HR:     "bg-emerald-50 text-emerald-600",
  GA:     "bg-amber-50 text-amber-600",
  SAFETY: "bg-rose-50 text-rose-600",
};

export default function AnnouncementTableRow({ row: a, onView, onEdit, onDelete, onToggle }: Props) {
  const t = useT();
  const isActive = a.status === "ACTIVE";
  const [toggling, setToggling] = useState(false);

  async function handleToggle(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    setToggling(true);
    try { await onToggle(a, e.target.checked); }
    finally { setToggling(false); }
  }

  const systemColor = SYSTEM_COLORS[a.sourceSystem] ?? "bg-slate-100 text-slate-500";

  function formatDate(d: Date | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
  }

  return (
    <TableRow
      className="cursor-pointer group"
      onClick={() => onView(a)}
    >
      {/* Title */}
      <TableCell className="max-w-56">
        <div className="flex items-start gap-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
            style={{ backgroundColor: a.bgColor ?? "#0F1059" }}
          />
          <div>
            <p className="text-sm font-medium text-[#0F1059] leading-snug line-clamp-2 group-hover:text-[#161875] transition-colors">
              {a.title}
            </p>
            {a.pushToCompanyCenter && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs text-sky-600">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                หน้าหลัก
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {/* System badge */}
      <TableCell>
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${systemColor}`}>
          {a.sourceSystem}
        </span>
      </TableCell>

      {/* Display type */}
      <TableCell>
        {a.displayType === "SCROLLING" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-600">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Scrolling
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List
          </span>
        )}
      </TableCell>

      {/* Date range */}
      <TableCell className="text-center">
        <div className="flex flex-col gap-0.5 items-center">
          <span className="text-xs font-mono text-slate-600">
            {formatDate(a.startDate) ?? <span className="text-slate-400 not-italic">{t("announcement.dateAlways")}</span>}
          </span>
          <span className="text-xs font-mono text-slate-400">
            {formatDate(a.endDate) ?? <span className="italic text-slate-400">{t("announcement.dateNoEnd")}</span>}
          </span>
        </div>
      </TableCell>

      {/* Attachment */}
      <TableCell>
        {a.fileName && a.spWebUrl ? (
          <a
            href={a.spWebUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-sky-700 hover:underline text-xs font-medium"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="truncate max-w-20">{a.fileName}</span>
          </a>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </TableCell>

      {/* Created by */}
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#0F1059]/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[#0F1059]">
              {(a.createdByName ?? "?").charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-slate-600 truncate max-w-24">{a.createdByName}</span>
        </div>
      </TableCell>

      {/* Status toggle */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {toggling ? (
            <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-[#0F1059] animate-spin" />
          ) : (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isActive}
                onChange={handleToggle}
                aria-label={isActive ? t("announcement.statusActive") : t("announcement.statusInactive")}
              />
              <div className="w-9 h-5 bg-slate-200 peer-checked:bg-emerald-500 rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
            </label>
          )}
          <span className={`text-xs font-medium ${isActive ? "text-emerald-600" : "text-slate-400"}`}>
            {isActive ? t("announcement.statusActive") : t("announcement.statusInactive")}
          </span>
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onView(a)}
            title={t("common.view")}
            className="text-sky-700 hover:bg-sky-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(a)}
            title={t("common.edit")}
            className="text-amber-600 hover:bg-amber-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(a)}
            title={t("common.delete")}
            className="text-rose-500 hover:bg-rose-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
