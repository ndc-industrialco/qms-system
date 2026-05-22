"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcement";
import AnnouncementsTable from "@/components/announcements/AnnouncementsTable";
import AnnouncementViewDrawer from "@/components/announcements/AnnouncementViewDrawer";
import AnnouncementEditDrawer from "@/components/announcements/AnnouncementEditDrawer";
import AnnouncementDeleteModal from "@/components/announcements/AnnouncementDeleteModal";
import AnnouncementCreateDrawer from "@/components/announcements/AnnouncementCreateDrawer";

type Toast = { message: string; type: "success" | "error" };
type FilterStatus = "all" | "active" | "inactive" | "scrolling";

function getIsActive(a: AnnouncementRow): boolean {
  return a.status === "ACTIVE";
}

export default function AnnouncementsTableClient({ rows }: { rows: AnnouncementRow[] }) {
  const router = useRouter();
  const t = useT();

  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<AnnouncementRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<AnnouncementRow | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<AnnouncementRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const totalCount = rows.length;
  const activeCount = useMemo(() => rows.filter(getIsActive).length, [rows]);
  const scrollingCount = useMemo(() => rows.filter((r) => r.displayType === "SCROLLING").length, [rows]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (filter === "active") result = result.filter(getIsActive);
    else if (filter === "inactive") result = result.filter((r) => !getIsActive(r));
    else if (filter === "scrolling") result = result.filter((r) => r.displayType === "SCROLLING");
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.sourceSystem.toLowerCase().includes(q) ||
          (r.createdBy.name ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, filter, search]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleView(row: AnnouncementRow) { setViewItem(row); setViewOpen(true); }
  function handleEdit(row: AnnouncementRow) { setEditItem(row); setEditOpen(true); }
  function handleDelete(row: AnnouncementRow) { setDeleteItem(row); setDeleteModalOpen(true); }

  async function handleToggle(row: AnnouncementRow, active: boolean) {
    const res = await fetch(`/api/announcements/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    const json = await res.json() as { error: string | null };
    if (!res.ok || json.error) {
      showToast(json.error ?? t("announcement.updateFail"), "error");
      return;
    }
    showToast(t("announcement.updateSuccess"), "success");
    router.refresh();
  }

  function handleSaved(success: boolean, errorMessage?: string) {
    if (!success) { showToast(errorMessage ?? t("announcement.updateFail"), "error"); return; }
    setEditOpen(false);
    showToast(t("announcement.updateSuccess"), "success");
    router.refresh();
  }

  function handleCreated(success: boolean, errorMessage?: string) {
    if (!success) { showToast(errorMessage ?? t("announcement.createFail"), "error"); return; }
    setCreateOpen(false);
    showToast(t("announcement.createSuccess"), "success");
    router.refresh();
  }

  function handleDeleted(success: boolean, errorMessage?: string) {
    if (!success) { showToast(errorMessage ?? t("announcement.deleteFail"), "error"); return; }
    setDeleteModalOpen(false);
    showToast(t("announcement.deleteSuccess"), "success");
    router.refresh();
  }

  const filterTabs: { key: FilterStatus; label: string; count: number; color: string }[] = [
    { key: "all", label: t("announcement.all"), count: totalCount, color: "text-primary bg-primary/10" },
    { key: "active", label: t("announcement.statusActive"), count: activeCount, color: "text-success bg-success/10" },
    { key: "inactive", label: t("announcement.statusInactive"), count: totalCount - activeCount, color: "text-gray-500 bg-gray-100" },
    { key: "scrolling", label: "Scrolling", count: scrollingCount, color: "text-info bg-info/10" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col gap-5 pb-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100]">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all duration-300 ${
              toast.type === "success" ? "bg-success" : "bg-error"
            }`}
          >
            {toast.type === "success" ? (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div
        className="rounded-2xl overflow-hidden shadow-md"
        style={{ background: "linear-gradient(135deg, #0F1059 0%, #1a3a7a 50%, #1D6A8A 100%)" }}
      >
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white leading-tight">
                {t("announcement.title")}
              </h1>
              <p className="text-white/50 text-[11px] mt-0.5">
                จัดการประกาศและข่าวสารของระบบ
              </p>
            </div>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="btn btn-sm gap-2 rounded-lg font-semibold border border-white/30 bg-white/10 text-white hover:bg-white/20 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">{t("announcement.new")}</span>
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 border-t border-white/10 divide-x divide-white/10">
          {[
            {
              label: "ประกาศทั้งหมด",
              value: totalCount,
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
            },
            {
              label: "กำลังใช้งาน",
              value: activeCount,
              icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
            },
            {
              label: "Scrolling Ticker",
              value: scrollingCount,
              icon: "M13 10V3L4 14h7v7l9-11h-7z",
            },
          ].map((stat, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold text-white leading-none">{stat.value}</div>
                <div className="text-white/50 text-[11px] mt-0.5 hidden md:block">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + Search toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-base-200 rounded-lg p-1 shrink-0 overflow-x-auto max-w-full">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                filter === tab.key
                  ? "bg-white shadow-sm text-primary"
                  : "text-gray-500 hover:text-neutral hover:bg-base-300/50"
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  filter === tab.key ? tab.color : "bg-base-300 text-gray-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาชื่อ, ระบบ, ผู้สร้าง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered input-sm w-full pl-9 pr-8 text-xs rounded-lg"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-neutral transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <span className="text-xs text-gray-400 shrink-0 ml-auto">
          {filteredRows.length} รายการ
        </span>
      </div>

      {/* Table card */}
      <div className="border border-base-300 rounded-xl shadow-sm overflow-hidden bg-base-100">
        <div className="overflow-x-auto">
          <AnnouncementsTable
            rows={filteredRows}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        </div>
      </div>

      {/* Drawers & Modals */}
      <AnnouncementViewDrawer
        item={viewItem}
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        onEdit={(item) => { setViewOpen(false); handleEdit(item); }}
      />
      <AnnouncementEditDrawer
        item={editItem}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={handleSaved}
      />
      <AnnouncementDeleteModal
        item={deleteItem}
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={handleDeleted}
      />
      <AnnouncementCreateDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
