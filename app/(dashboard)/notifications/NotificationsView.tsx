"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  module: string;
  resourceId: string;
  resourceType: string;
  isRead: boolean;
  createdAt: string;
}

const MODULE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DAR:         { bg: "bg-blue-100",    text: "text-blue-700",    label: "DAR" },
  KPI:         { bg: "bg-green-100",   text: "text-green-700",   label: "KPI" },
  KPI_MONTHLY: { bg: "bg-emerald-100", text: "text-emerald-700", label: "KPI Monthly" },
  CAR:         { bg: "bg-orange-100",  text: "text-orange-700",  label: "CAR" },
};

function getActionPath(item: NotificationItem): string | null {
  if (item.module === "CAR") return `/car/${item.resourceId}`;
  if (item.module === "DAR") return `/dar/${item.resourceId}`;
  if (item.module === "KPI") return `/qms/kpi/${item.resourceId}`;
  return null;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อกี้";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} วันที่แล้ว`;
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(dateStr));
}

function fullDate(dateStr: string): string {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeStyle: "short" }).format(new Date(dateStr));
}

export default function NotificationsView() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // ponytail: same queryKey as NotificationBell — must return the same shape (full response)
  const { data: raw, isLoading } = useQuery<{ data: { notifications: NotificationItem[]; unreadCount: number } }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    refetchInterval: 30000,
  });
  const data = raw?.data;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    },
    onSuccess: (_d, id) => {
      if (selected?.id === id) setSelected(null);
      setCheckedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: (_d, ids) => {
      if (selected && ids.includes(selected.id)) setSelected(null);
      setCheckedIds(new Set());
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const all = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const filtered = all.filter((n) => {
    if (unreadOnly && n.isRead) return false;
    if (moduleFilter !== "ALL" && n.module !== moduleFilter) return false;
    return true;
  });

  function handleSelect(item: NotificationItem) {
    setSelected(item);
    if (!item.isRead) markRead.mutate(item.id);
  }

  function toggleCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  const allFilteredChecked = filtered.length > 0 && filtered.every((n) => checkedIds.has(n.id));

  function toggleCheckAll() {
    if (allFilteredChecked) {
      setCheckedIds((prev) => {
        const s = new Set(prev);
        filtered.forEach((n) => s.delete(n.id));
        return s;
      });
    } else {
      setCheckedIds((prev) => {
        const s = new Set(prev);
        filtered.forEach((n) => s.add(n.id));
        return s;
      });
    }
  }

  const modules = [...new Set(all.map((n) => n.module))];
  const checkedCount = [...checkedIds].filter((id) => filtered.some((n) => n.id === id)).length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-[#0f1059]" />
          <h1 className="text-base font-bold text-slate-900">การแจ้งเตือน</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk delete */}
          {checkedCount > 0 && (
            <button
              onClick={() => deleteBulk.mutate([...checkedIds].filter((id) => filtered.some((n) => n.id === id)))}
              disabled={deleteBulk.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              ลบที่เลือก ({checkedCount})
            </button>
          )}

          {/* Module filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f1059]/20"
          >
            <option value="ALL">ทุกระบบ</option>
            {modules.map((m) => (
              <option key={m} value={m}>{MODULE_COLORS[m]?.label ?? m}</option>
            ))}
          </select>

          {/* Unread toggle */}
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              unreadOnly
                ? "border-[#0f1059] bg-[#0f1059] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            ยังไม่อ่าน
          </button>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              อ่านทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* ── Body: list + detail ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left list pane ── */}
        <div className="w-80 shrink-0 overflow-y-auto border-r border-slate-100 bg-slate-50/50">
          {isLoading && (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white p-3 animate-pulse space-y-2">
                  <div className="h-3 w-16 rounded bg-slate-200" />
                  <div className="h-3.5 w-full rounded bg-slate-200" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
              <Bell className="h-8 w-8 opacity-30" />
              <p className="text-sm">ไม่มีการแจ้งเตือน</p>
            </div>
          )}

          {/* Select-all row */}
          {!isLoading && filtered.length > 0 && (
            <div className="flex items-center gap-2 px-3 pt-2 pb-1">
              <input
                type="checkbox"
                checked={allFilteredChecked}
                onChange={toggleCheckAll}
                className="h-3.5 w-3.5 rounded accent-[#0f1059] cursor-pointer"
              />
              <span className="text-[11px] text-slate-400">เลือกทั้งหมด</span>
            </div>
          )}

          <div className="flex flex-col gap-0.5 p-2 pt-1">
            {filtered.map((n) => {
              const mod = MODULE_COLORS[n.module];
              const isActive = selected?.id === n.id;
              const isChecked = checkedIds.has(n.id);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group relative flex items-start gap-2 rounded-xl p-3 transition-all cursor-pointer",
                    isActive
                      ? "bg-[#0f1059] text-white shadow-sm"
                      : n.isRead
                        ? "bg-white hover:bg-slate-100 text-slate-700"
                        : "bg-white hover:bg-blue-50/60 text-slate-800 border-l-2 border-[#0f1059]"
                  )}
                  onClick={() => handleSelect(n)}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onClick={(e) => toggleCheck(n.id, e)}
                    onChange={() => {}}
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded accent-[#0f1059] cursor-pointer"
                  />

                  {/* Module badge */}
                  <span className={cn(
                    "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    isActive ? "bg-white/20 text-white" : (mod?.bg ?? "bg-slate-100"),
                    isActive ? "" : (mod?.text ?? "text-slate-600"),
                  )}>
                    {mod?.label ?? n.module}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-xs font-semibold", isActive ? "text-white" : "text-slate-900")}>
                      {n.title}
                    </p>
                    <p className={cn("truncate text-[11px] mt-0.5", isActive ? "text-white/70" : "text-slate-500")}>
                      {n.body}
                    </p>
                    <p className={cn("text-[10px] mt-1", isActive ? "text-white/50" : "text-slate-400")}>
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.isRead && !isActive && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0f1059]" />
                  )}

                  {/* Inline delete on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteOne.mutate(n.id); }}
                    className={cn(
                      "absolute right-2 top-2 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                      isActive
                        ? "text-white/60 hover:text-white hover:bg-white/10"
                        : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                    )}
                    title="ลบ"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right detail pane ── */}
        <div className="flex-1 overflow-y-auto bg-white">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
              <Bell className="h-16 w-16 opacity-20" />
              <p className="text-sm">เลือกการแจ้งเตือนเพื่อดูรายละเอียด</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto p-8">
              {/* Detail header */}
              <div className="mb-6 pb-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const mod = MODULE_COLORS[selected.module];
                      return (
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", mod?.bg ?? "bg-slate-100", mod?.text ?? "text-slate-600")}>
                          {mod?.label ?? selected.module}
                        </span>
                      );
                    })()}
                    {!selected.isRead && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        ยังไม่ได้อ่าน
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteOne.mutate(selected.id)}
                    disabled={deleteOne.isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบ
                  </button>
                </div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">{selected.title}</h2>
                <p className="mt-1.5 text-sm text-slate-500">{fullDate(selected.createdAt)}</p>
              </div>

              {/* Detail body */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-6 py-5">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.body}</p>
              </div>

              {/* Action */}
              {getActionPath(selected) && (
                <div className="mt-6">
                  <Link
                    href={getActionPath(selected)!}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0f1059] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f1059]/90 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    เปิดรายการ {selected.module}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
