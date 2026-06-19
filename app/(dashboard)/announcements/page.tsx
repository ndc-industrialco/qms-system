"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import AnnouncementViewModal from "@/components/announcements/AnnouncementViewModal";
import type { AnnouncementRow } from "@/services/announcementService";
import { Megaphone, Link as LinkIcon, CalendarDays } from "lucide-react";

const SOURCE_COLORS: Record<string, string> = {
  QMS: "#0F1059", IT: "#1D6A8A", HR: "#7C3AED", GA: "#059669", SAFETY: "#DC2626",
};

type PublicAnnouncement = {
  id: string;
  title: string;
  content: string;
  sourceSystem: string;
  displayType: string;
  startDate: string | null;
  endDate: string | null;
  fileName: string | null;
  spWebUrl: string | null;
  bgColor: string | null;
  textColor: string | null;
  createdAt: string;
  createdBy: { name: string | null } | null;
};

export default function AnnouncementsPage() {
  const t = useT();
  const locale = useLocale();
  const [items, setItems] = useState<PublicAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState<AnnouncementRow | null>(null);

  useEffect(() => {
    fetch("/api/announcements/public")
      .then((r) => r.json())
      .then((j) => setItems(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  function toRow(a: PublicAnnouncement): AnnouncementRow {
    return {
      ...a,
      startDate: a.startDate ? new Date(a.startDate) : null,
      endDate: a.endDate ? new Date(a.endDate) : null,
      createdAt: new Date(a.createdAt),
      pushToCompanyCenter: true,
      status: "ACTIVE",
      bgImageUrl: null,
      bgImageSpId: null,
      createdByName: a.createdBy?.name ?? null,
    };
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pb-10 pt-6 px-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#0F1059]/10 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-[#0F1059]" />
        </div>
        <h1 className="text-xl font-bold text-[#0F1059]">{t("announcement.allTitle")}</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">{t("common.loading")}</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">{t("dashboard.announcements.empty")}</div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] divide-y divide-slate-100 overflow-hidden">
          {items.map((a) => {
            const color = SOURCE_COLORS[a.sourceSystem] ?? "#6B7280";
            const dateStr = new Date(a.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
              day: "2-digit", month: "short", year: "numeric",
            });
            return (
              <div
                key={a.id}
                onClick={() => setViewItem(toRow(a))}
                className="group flex gap-0 hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
              >
                <div
                  className="w-1 shrink-0 rounded-r-sm my-4 ml-5 transition-all duration-200 group-hover:w-1.5"
                  style={{ background: color }}
                />
                <div className="flex flex-1 items-start gap-3 px-5 py-4 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white"
                        style={{ background: color }}
                      >
                        {a.sourceSystem}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {dateStr}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 group-hover:text-[#0F1059] transition-colors leading-snug">
                      {a.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{a.content}</p>
                  </div>
                  {a.spWebUrl && (
                    <a
                      href={a.spWebUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 w-8 h-8 mt-0.5 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:border-[#0F1059] hover:text-[#0F1059] transition-all"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnnouncementViewModal
        item={viewItem}
        open={!!viewItem}
        onClose={() => setViewItem(null)}
      />
    </div>
  );
}
