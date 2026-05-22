"use client";

import type { Announcement } from "@/generated/prisma/client";

const SOURCE_COLORS: Record<string, string> = {
  QMS: "#0F1059", IT: "#1D6A8A", HR: "#7C3AED", GA: "#059669", SAFETY: "#DC2626",
};

type Props = { announcements: Announcement[]; canManage: boolean; isTh: boolean };

export default function DashboardAnnouncementsFeed({ announcements, isTh }: Props) {
  if (announcements.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm text-gray-400">{isTh ? "ไม่มีข่าวสารในขณะนี้" : "No announcements at this time"}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-base-200">
      {announcements.map((a) => {
        const color = SOURCE_COLORS[a.sourceSystem] ?? "#6B7280";
        const dateStr = new Date(a.createdAt).toLocaleDateString(isTh ? "th-TH" : "en-US", {
          day: "2-digit", month: "short", year: "numeric",
        });

        return (
          <div key={a.id} className="group flex gap-0 hover:bg-base-200/50 transition-colors duration-150">
            {/* Left color bar */}
            <div className="w-[3px] shrink-0 rounded-r-sm my-3 ml-5 transition-all duration-200 group-hover:w-1"
              style={{ background: color }} />

            <div className="flex flex-1 items-start gap-3 px-4 py-3.5 min-w-0">
              <div className="flex-1 min-w-0">
                {/* Source + date */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm text-white"
                    style={{ background: color }}>
                    {a.sourceSystem}
                  </span>
                  <span className="text-[11px] text-gray-400">{dateStr}</span>
                </div>
                <h3 className="text-sm font-semibold text-neutral group-hover:text-primary transition-colors truncate leading-snug">
                  {a.title}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">{a.content}</p>
              </div>

              {a.spWebUrl && (
                <a href={a.spWebUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 w-7 h-7 mt-0.5 rounded-lg border border-base-300 flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-all duration-150 hover:scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
