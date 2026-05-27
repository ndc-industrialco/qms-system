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
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Toast from "@/components/common/Toast";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useUrlFilters } from "@/hooks/use-url-filters";

type FilterStatus = "all" | "active" | "inactive" | "scrolling";

function getIsActive(a: AnnouncementRow): boolean {
  return a.status === "ACTIVE";
}

export default function AnnouncementsTableClient({ rows }: { rows: AnnouncementRow[] }) {
  const router = useRouter();
  const t = useT();
  const { toast, showToast, hideToast } = useToast();

  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<AnnouncementRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<AnnouncementRow | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<AnnouncementRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // ── URL-bound filters ──────────────────────────────────────────────────────
  const { params, rawValues, setParam } = useUrlFilters({
    keys: ["search", "status"] as const,
    searchKey: "search",
    debounceMs: 300,
  });

  const filter = (params.status || "all") as FilterStatus;
  const debouncedSearch = useDebounce(rawValues.search, 300);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalCount = rows.length;
  const activeCount = useMemo(() => rows.filter(getIsActive).length, [rows]);
  const scrollingCount = useMemo(() => rows.filter((r) => r.displayType === "SCROLLING").length, [rows]);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let result = rows;
    if (filter === "active") result = result.filter(getIsActive);
    else if (filter === "inactive") result = result.filter((r) => !getIsActive(r));
    else if (filter === "scrolling") result = result.filter((r) => r.displayType === "SCROLLING");
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.sourceSystem.toLowerCase().includes(q) ||
          (r.createdBy.name ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [rows, filter, debouncedSearch]);

  // ── Handlers ───────────────────────────────────────────────────────────────
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
      showToast("error", json.error ?? t("announcement.updateFail"));
      return;
    }
    showToast("success", t("announcement.updateSuccess"));
    router.refresh();
  }

  function handleSaved(success: boolean, errorMessage?: string) {
    if (!success) { showToast("error", errorMessage ?? t("announcement.updateFail")); return; }
    setEditOpen(false);
    showToast("success", t("announcement.updateSuccess"));
    router.refresh();
  }

  function handleCreated(success: boolean, errorMessage?: string) {
    if (!success) { showToast("error", errorMessage ?? t("announcement.createFail")); return; }
    setCreateOpen(false);
    showToast("success", t("announcement.createSuccess"));
    router.refresh();
  }

  function handleDeleted(success: boolean, errorMessage?: string) {
    if (!success) { showToast("error", errorMessage ?? t("announcement.deleteFail")); return; }
    setDeleteModalOpen(false);
    showToast("success", t("announcement.deleteSuccess"));
    router.refresh();
  }

  // ── Filter tabs ────────────────────────────────────────────────────────────
  type TabDef = { key: FilterStatus; label: string; count: number };
  const filterTabs: TabDef[] = [
    { key: "all",       label: t("announcement.all"),            count: totalCount },
    { key: "active",    label: t("announcement.statusActive"),   count: activeCount },
    { key: "inactive",  label: t("announcement.statusInactive"), count: totalCount - activeCount },
    { key: "scrolling", label: "Scrolling",                      count: scrollingCount },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title={t("announcement.title")}
        subtitle="จัดการประกาศและข่าวสารของระบบ"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {t("announcement.new")}
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800 leading-none">{totalCount}</p>
            <p className="text-xs text-slate-400 mt-1">ประกาศทั้งหมด</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600 leading-none">{activeCount}</p>
            <p className="text-xs text-slate-400 mt-1">{t("announcement.statusActive")}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-sky-600 leading-none">{scrollingCount}</p>
            <p className="text-xs text-slate-400 mt-1">Scrolling Ticker</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 flex flex-wrap items-center gap-3">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setParam("status", tab.key === "all" ? "" : tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filter === tab.key
                  ? "bg-white shadow-sm text-[#0F1059]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span className={`inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 rounded-full text-[10px] font-bold ${
                filter === tab.key ? "bg-[#0F1059]/10 text-[#0F1059]" : "bg-slate-200 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            type="text"
            placeholder="ค้นหาชื่อ, ระบบ, ผู้สร้าง..."
            value={rawValues.search}
            onChange={(e) => setParam("search", e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {rawValues.search && (
            <button
              onClick={() => setParam("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <span className="text-xs text-slate-400 shrink-0 ml-auto">
          {filteredRows.length} / {totalCount} รายการ
        </span>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
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
      <AnnouncementViewDrawer item={viewItem} open={viewOpen} onClose={() => setViewOpen(false)} onEdit={(item) => { setViewOpen(false); handleEdit(item); }} />
      <AnnouncementEditDrawer item={editItem} open={editOpen} onClose={() => setEditOpen(false)} onSaved={handleSaved} />
      <AnnouncementDeleteModal item={deleteItem} open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onDeleted={handleDeleted} />
      <AnnouncementCreateDrawer open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />

      {/* Toast — error has no auto-dismiss (duration=0) */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
          duration={toast.type === "error" ? 0 : 4000}
        />
      )}
    </div>
  );
}
