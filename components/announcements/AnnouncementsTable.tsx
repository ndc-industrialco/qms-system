"use client";

import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcement";
import AnnouncementTableRow from "@/components/announcements/AnnouncementTableRow";

type Props = {
  rows: AnnouncementRow[];
  onView: (row: AnnouncementRow) => void;
  onEdit: (row: AnnouncementRow) => void;
  onDelete: (row: AnnouncementRow) => void;
  onToggle: (row: AnnouncementRow, active: boolean) => Promise<void>;
};

export default function AnnouncementsTable({ rows, onView, onEdit, onDelete, onToggle }: Props) {
  const t = useT();

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral">{t("announcement.empty")}</p>
          <p className="text-xs text-gray-400 mt-1">ยังไม่มีประกาศในระบบ</p>
        </div>
      </div>
    );
  }

  return (
    <table className="table w-full">
      <thead>
        <tr className="bg-base-200/50 border-b border-base-300">
          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
            {t("announcement.colTitle")}
          </th>
          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
            {t("announcement.colSystem")}
          </th>
          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
            {t("announcement.colType")}
          </th>
          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
            {t("announcement.colDateRange")}
          </th>
          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
            {t("announcement.colAttachment")}
          </th>
          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
            {t("announcement.colCreatedBy")}
          </th>
          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
            {t("announcement.colStatus")}
          </th>
          <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 text-right whitespace-nowrap">
            {t("announcement.colActions")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-base-200">
        {rows.map((row) => (
          <AnnouncementTableRow
            key={row.id}
            row={row}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
          />
        ))}
      </tbody>
    </table>
  );
}
