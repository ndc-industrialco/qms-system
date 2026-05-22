"use client";

import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcement";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

function isAnnouncementActive(item: AnnouncementRow): boolean {
  const now = new Date();
  return (
    (!item.startDate || now >= new Date(item.startDate)) &&
    (!item.endDate || now <= new Date(item.endDate))
  );
}

export default function AnnouncementViewFields({ item }: { item: AnnouncementRow }) {
  const t = useT();
  const active = isAnnouncementActive(item);

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
      <div>
        <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldTitle")}</p>
        <p className="text-sm font-semibold text-neutral">{item.title}</p>
      </div>
      <div>
        <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldContent")}</p>
        <p className="text-xs text-neutral whitespace-pre-wrap">{item.content}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldSourceSystem")}</p>
          <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-primary/10 text-primary">{item.sourceSystem}</span>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldDisplayType")}</p>
          <span className={`inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold ${item.displayType === "SCROLLING" ? "bg-info/15 text-info" : "bg-base-200 text-neutral"}`}>
            {item.displayType === "SCROLLING" ? t("announcement.displayTypeMain") : t("announcement.displayTypeNormal")}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldStartDate")}</p>
          <p className="text-xs text-neutral">{formatDate(item.startDate)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldEndDate")}</p>
          <p className="text-xs text-neutral">{formatDate(item.endDate)}</p>
        </div>
      </div>
      <div>
        <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldAttachment")}</p>
        {item.fileName && item.spWebUrl ? (
          <a href={item.spWebUrl} target="_blank" rel="noreferrer" className="text-secondary hover:underline text-xs flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            {item.fileName}
          </a>
        ) : (
          <p className="text-xs text-neutral/50">{t("announcement.noAttachment")}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldStatus")}</p>
          {active ? (
            <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-success/15 text-success">{t("announcement.statusActive")}</span>
          ) : (
            <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-base-200 text-neutral">{t("announcement.statusInactive")}</span>
          )}
        </div>
        <div>
          <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldPushToCompany")}</p>
          <p className="text-xs text-neutral">{item.pushToCompanyCenter ? "Yes" : "No"}</p>
        </div>
      </div>
      <div>
        <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldCreatedBy")}</p>
        <p className="text-xs text-neutral">{item.createdBy.name}</p>
      </div>
      <div>
        <p className="text-[11px] text-gray-500 mb-1 font-semibold uppercase tracking-wide">{t("announcement.fieldCreatedAt")}</p>
        <p className="text-xs text-neutral">{formatDate(item.createdAt)}</p>
      </div>
    </div>
  );
}
