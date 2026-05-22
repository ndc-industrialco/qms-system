"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcement";

type Props = {
  row: AnnouncementRow;
  onView: (row: AnnouncementRow) => void;
  onEdit: (row: AnnouncementRow) => void;
  onDelete: (row: AnnouncementRow) => void;
  onToggle: (row: AnnouncementRow, active: boolean) => Promise<void>;
};

const SYSTEM_COLORS: Record<string, string> = {
  QMS: "bg-primary/10 text-primary",
  IT: "bg-secondary/10 text-secondary",
  HR: "bg-violet-100 text-violet-700",
  GA: "bg-amber-100 text-amber-700",
  SAFETY: "bg-red-100 text-red-700",
};

export default function AnnouncementTableRow({ row: a, onView, onEdit, onDelete, onToggle }: Props) {
  const t = useT();
  const isActive = a.status === "ACTIVE";

  const [toggling, setToggling] = useState(false);

  async function handleToggle(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    setToggling(true);
    try {
      await onToggle(a, e.target.checked);
    } finally {
      setToggling(false);
    }
  }

  const systemColor = SYSTEM_COLORS[a.sourceSystem] ?? "bg-base-200 text-neutral";

  function formatDate(d: Date | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
  }

  return (
    <tr
      className="hover:bg-base-50 transition-colors duration-100 cursor-pointer group"
      onClick={() => onView(a)}
    >
      {/* Title */}
      <td className="py-3.5 px-4 max-w-[220px]">
        <div className="flex items-start gap-2.5">
          {/* Color swatch from bgColor */}
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
            style={{ backgroundColor: a.bgColor ?? "#0F1059" }}
          />
          <div>
            <p className="text-xs font-semibold text-neutral leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {a.title}
            </p>
            {a.pushToCompanyCenter && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-secondary">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                หน้าหลัก
              </span>
            )}
          </div>
        </div>
      </td>

      {/* System badge */}
      <td className="py-3.5 px-4">
        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold ${systemColor}`}>
          {a.sourceSystem}
        </span>
      </td>

      {/* Display type */}
      <td className="py-3.5 px-4">
        {a.displayType === "SCROLLING" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-info/10 text-info">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Scrolling
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-base-200 text-gray-500">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List
          </span>
        )}
      </td>

      {/* Date range */}
      <td className="py-3.5 px-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-neutral">
            {formatDate(a.startDate) ?? (
              <span className="text-gray-400">{t("announcement.dateAlways")}</span>
            )}
          </span>
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {formatDate(a.endDate) ?? (
              <span className="italic">{t("announcement.dateNoEnd")}</span>
            )}
          </span>
        </div>
      </td>

      {/* Attachment */}
      <td className="py-3.5 px-4">
        {a.fileName && a.spWebUrl ? (
          <a
            href={a.spWebUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-secondary hover:text-primary transition-colors text-[11px] font-medium hover:underline"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="truncate max-w-[80px]">{a.fileName}</span>
          </a>
        ) : (
          <span className="text-gray-300 text-[11px]">—</span>
        )}
      </td>

      {/* Created by */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">
              {(a.createdBy.name ?? "?").charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-[11px] text-neutral truncate max-w-[100px]">{a.createdBy.name}</span>
        </div>
      </td>

      {/* Status toggle */}
      <td className="py-3.5 px-4">
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {toggling ? (
            <span className="loading loading-spinner loading-xs text-gray-400" />
          ) : (
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-success"
              checked={isActive}
              onChange={handleToggle}
              aria-label={isActive ? t("announcement.statusActive") : t("announcement.statusInactive")}
            />
          )}
          <span className={`text-[11px] font-semibold ${isActive ? "text-success" : "text-gray-400"}`}>
            {isActive ? t("announcement.statusActive") : t("announcement.statusInactive")}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4">
        <div
          className="flex items-center justify-end gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onView(a)}
            className="btn btn-ghost btn-xs btn-circle text-secondary hover:bg-secondary/10"
            title={t("common.view")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={() => onEdit(a)}
            className="btn btn-ghost btn-xs btn-circle text-warning hover:bg-warning/10"
            title={t("common.edit")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(a)}
            className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10"
            title={t("common.delete")}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
