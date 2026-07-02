"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import {
  FileCode2,
  Calendar,
  Search,
  CheckCircle2,
  Bug,
  Sparkles,
  GitCommit,
  ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LogItem {
  id: string;
  titleTh: string;
  titleEn: string;
  date: string;
  type: "feature" | "bugfix" | "improvement";
  commit: string;
  detailsTh: string[];
  detailsEn: string[];
}

const LABELS = {
  th: {
    title: "บันทึกการพัฒนาและปรับปรุงระบบ",
    subtitle: "ประวัติการอัปเดตฟีเจอร์ การแก้ไขบั๊ก และรายละเอียดการเปลี่ยนแปลงของแอปพลิเคชัน QMS",
    searchPlaceholder: "ค้นหาหัวข้อหรือรายละเอียด...",
    all: "ทั้งหมด",
    feature: "ฟีเจอร์ใหม่",
    bugfix: "แก้ไขบั๊ก",
    improvement: "ปรับปรุงระบบ",
    commitHash: "รหัสบันทึก (Commit)",
    noLogs: "ไม่พบข้อมูลการอัปเดต",
    latestDeploy: "รอบการอัปเดตล่าสุด",
    loading: "กำลังโหลดข้อมูล...",
    error: "เกิดข้อผิดพลาดในการโหลดข้อมูล",
  },
  en: {
    title: "Development Logs & Changelog",
    subtitle: "History of new features, bug fixes, and system improvements implemented in QMS System",
    searchPlaceholder: "Search logs or details...",
    all: "All",
    feature: "Features",
    bugfix: "Bug Fixes",
    improvement: "Improvements",
    commitHash: "Commit Hash",
    noLogs: "No update logs found",
    latestDeploy: "Latest Deployment",
    loading: "Loading logs...",
    error: "Failed to load changelogs",
  }
};

export default function DevelopmentLogsPage() {
  const locale = useLocale() as "th" | "en";
  const text = LABELS[locale === "th" ? "th" : "en"];

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const res = await fetch("/api/development-logs");
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      search === "" ||
      log.titleTh.toLowerCase().includes(search.toLowerCase()) ||
      log.titleEn.toLowerCase().includes(search.toLowerCase()) ||
      log.detailsTh.some((d) => d.toLowerCase().includes(search.toLowerCase())) ||
      log.detailsEn.some((d) => d.toLowerCase().includes(search.toLowerCase()));

    const matchesType = filterType === "all" || log.type === filterType;

    return matchesSearch && matchesType;
  });

  const getBadgeClass = (type: string) => {
    switch (type) {
      case "feature":
        return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      case "bugfix":
        return "bg-rose-50 text-rose-600 border border-rose-100";
      case "improvement":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      default:
        return "bg-slate-50 text-slate-600 border border-slate-100";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "feature":
        return <Sparkles className="w-4 h-4" />;
      case "bugfix":
        return <Bug className="w-4 h-4" />;
      case "improvement":
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <FileCode2 className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return text[type as keyof typeof text] || type;
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pb-12">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F1059] tracking-tight flex items-center gap-2">
            <FileCode2 className="w-7 h-7 text-[#0F1059]" />
            {text.title}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{text.subtitle}</p>
        </div>
        {!loading && !error && logs.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs text-slate-500 font-semibold shrink-0">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{text.latestDeploy}: {new Date(logs[0].date).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
            placeholder={text.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-all disabled:opacity-50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {["all", "feature", "bugfix", "improvement"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              disabled={loading}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
                filterType === type
                  ? "bg-[#0F1059] text-white border-[#0F1059] shadow-sm shadow-indigo-950/20"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              } disabled:opacity-50`}
            >
              {type === "all" ? text.all : getTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="relative border-l-2 border-slate-100 ml-4 md:ml-6 pl-6 md:pl-8 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[35px] md:-left-[43px] top-1 w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center" />
              <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-32 rounded-lg" />
                  <Skeleton className="h-5 w-24 rounded-lg" />
                </div>
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-5/6 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-6 text-center text-sm font-semibold">
          <Bug className="w-10 h-10 text-rose-400 mx-auto mb-2" />
          {text.error}: {error}
        </div>
      )}

      {/* Timeline Section */}
      {!loading && !error && (
        filteredLogs.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
            <FileCode2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{text.noLogs}</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-4 md:ml-6 pl-6 md:pl-8 space-y-8">
            {filteredLogs.map((log) => {
              const formattedDate = new Date(log.date).toLocaleDateString(
                locale === "th" ? "th-TH" : "en-US",
                { day: "2-digit", month: "long", year: "numeric" }
              );

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[35px] md:-left-[43px] top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-[#0F1059] group-hover:text-[#0F1059] transition-all duration-300 shadow-sm">
                    {getIcon(log.type)}
                  </div>

                  {/* Timeline Card */}
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 p-5 md:p-6">
                    {/* Meta Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${getBadgeClass(log.type)}`}>
                          {getIcon(log.type)}
                          {getTypeLabel(log.type)}
                        </span>
                        <span className="text-slate-400 text-xs font-semibold flex items-center gap-1 ml-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formattedDate}
                        </span>
                      </div>

                      <a
                        href={`https://github.com/ndc-industrialco/qms-system/commit/${log.commit}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#0F1059] hover:underline bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg transition-colors font-mono"
                      >
                        <GitCommit className="w-3.5 h-3.5" />
                        {log.commit}
                        <ArrowUpRight className="w-3 h-3 opacity-60" />
                      </a>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-800 leading-snug group-hover:text-[#0F1059] transition-colors duration-200">
                      {locale === "th" ? log.titleTh : log.titleEn}
                    </h3>

                    {/* Details Bullet List */}
                    <ul className="mt-4 space-y-2.5 pl-4 border-l border-slate-100">
                      {(locale === "th" ? log.detailsTh : log.detailsEn).map((detail, idx) => (
                        <li key={idx} className="text-slate-600 text-sm leading-relaxed relative before:content-['•'] before:absolute before:-left-3 before:text-slate-300">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
