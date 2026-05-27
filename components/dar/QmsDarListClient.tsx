"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { DarSummary } from "@/types/dar";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS, DAR_STATUS_LABELS } from "@/types/dar";
import type { DarStatus, DarObjective } from "@/types/dar";
import DarTable from "@/components/dar/DarTable";
import DarCardList from "@/components/dar/DarCardList";
import FilterBar from "@/components/common/FilterBar";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLocale } from "@/lib/locale-context";
import { useUrlFilters } from "@/hooks/use-url-filters";

const OBJECTIVE_LABELS_EN: Record<DarObjective, string> = {
  PREPARE_NEW: "Prepare New Doc",
  REQUEST_COPY_CONTROLLED: "Copy (Controlled)",
  REQUEST_COPY_UNCONTROLLED: "Copy (Uncontrolled)",
  REVISE: "Revise",
  CANCEL: "Cancel Doc",
};

type StatusMeta = {
  label: string;
  labelTh: string;
  dot: string;
  count: string;
  active: string;
};

const STATUS_META: Record<DarStatus, StatusMeta> = {
  PENDING_REVIEW:  { label: "Pending Review",  labelTh: "รอตรวจสอบ",    dot: "bg-sky-400",     count: "text-sky-600",     active: "border-sky-300 bg-sky-50/50" },
  PENDING_APPROVE: { label: "Pending Approve", labelTh: "รออนุมัติ",     dot: "bg-violet-400",  count: "text-violet-600",  active: "border-violet-300 bg-violet-50/50" },
  QMS_PROCESSING:  { label: "QMS Processing",  labelTh: "QMS ดำเนินการ", dot: "bg-amber-400",   count: "text-amber-600",   active: "border-amber-300 bg-amber-50/50" },
  COMPLETED:       { label: "Completed",        labelTh: "เสร็จสิ้น",     dot: "bg-emerald-400", count: "text-emerald-600", active: "border-emerald-300 bg-emerald-50/50" },
  CANCELLED:       { label: "Cancelled",        labelTh: "ยกเลิก",        dot: "bg-rose-300",    count: "text-rose-400",    active: "border-rose-200 bg-rose-50/40" },
  DRAFT:           { label: "Draft",            labelTh: "ฉบับร่าง",      dot: "bg-slate-300",   count: "text-slate-500",   active: "border-slate-300 bg-slate-50" },
};

const ORDERED_STATUSES: DarStatus[] = [
  "PENDING_REVIEW",
  "PENDING_APPROVE",
  "QMS_PROCESSING",
  "COMPLETED",
  "CANCELLED",
  "DRAFT",
];

type SortKey = "requestDate" | "darNo" | "status";
type SortDir = "asc" | "desc";

export default function QmsDarListClient({ dars: initialDars }: { dars: DarSummary[] }) {
  const locale = useLocale();
  const isTh = locale === "th";
  const router = useRouter();

  const [dars, setDars] = useState(initialDars);
  const [sortKey, setSortKey] = useState<SortKey>("requestDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Delete state
  const [pendingDelete, setPendingDelete] = useState<{ id: string; darNo: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/dar/${pendingDelete.id}`, { method: "DELETE" });
      const json = await res.json() as { error: string | null };
      if (!res.ok || json.error) {
        setDeleteError(json.error ?? "เกิดข้อผิดพลาด");
        return;
      }
      setDars((prev) => prev.filter((d) => d.id !== pendingDelete.id));
      setPendingDelete(null);
      router.refresh();
    } catch {
      setDeleteError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setDeleting(false);
    }
  }

  // ── URL-bound filters ──────────────────────────────────────────────────────
  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ["search", "status", "objective"] as const,
    searchKey: "search",
    debounceMs: 300,
  });

  function objectiveLabel(key: DarObjective) {
    return isTh ? OBJECTIVE_LABELS[key] : OBJECTIVE_LABELS_EN[key];
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const counts = useMemo(
    () =>
      dars.reduce<Record<string, number>>((acc, d) => {
        acc[d.status] = (acc[d.status] ?? 0) + 1;
        return acc;
      }, {}),
    [dars],
  );

  const filtered = useMemo(() => {
    const q = params.search.trim().toLowerCase();
    return dars
      .filter((d) => {
        if (params.status && d.status !== (params.status as DarStatus)) return false;
        if (params.objective && d.objective !== (params.objective as DarObjective)) return false;
        if (q) {
          const haystack = [
            d.darNo ?? "",
            objectiveLabel(d.objective),
            (DOC_TYPE_LABELS as Record<string, string>)[d.docType] ?? d.docType,
            DAR_STATUS_LABELS[d.status],
          ].join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "requestDate") cmp = new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime();
        else if (sortKey === "darNo") cmp = (a.darNo ?? "").localeCompare(b.darNo ?? "");
        else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
        return sortDir === "asc" ? cmp : -cmp;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dars, params.search, params.status, params.objective, sortKey, sortDir, isTh]);

  const isFilteredEmpty = dars.length > 0 && filtered.length === 0;

  const statusOptions = [
    { value: "DRAFT",           label: isTh ? "ฉบับร่าง"     : "Draft" },
    { value: "PENDING_REVIEW",  label: isTh ? "รอตรวจสอบ"    : "Pending Review" },
    { value: "PENDING_APPROVE", label: isTh ? "รออนุมัติ"     : "Pending Approve" },
    { value: "QMS_PROCESSING",  label: isTh ? "QMS ดำเนินการ" : "QMS Processing" },
    { value: "COMPLETED",       label: isTh ? "เสร็จสิ้น"     : "Completed" },
    { value: "CANCELLED",       label: isTh ? "ยกเลิก"        : "Cancelled" },
  ];

  const objectiveOptions = (Object.keys(OBJECTIVE_LABELS) as DarObjective[]).map((k) => ({
    value: k,
    label: objectiveLabel(k),
  }));

  return (
    <>
      {/* Status count cards — clickable, synced to URL */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {ORDERED_STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const active = params.status === s;
          const count = counts[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => setParam("status", active ? "" : s)}
              className={[
                "rounded-xl px-3 py-3 text-left border transition-all duration-150",
                active
                  ? meta.active
                  : "bg-white border-slate-100 hover:border-slate-200",
              ].join(" ")}
            >
              <div className={`w-1.5 h-1.5 rounded-full mb-2.5 ${meta.dot}`} />
              <p className={`text-2xl font-semibold leading-none mb-1 ${active ? meta.count : "text-slate-700"}`}>
                {count}
              </p>
              <p className="text-[11px] text-slate-400 leading-snug">
                {isTh ? meta.labelTh : meta.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      {dars.length > 0 && (
        <FilterBar
          searchValue={rawValues.search}
          onSearchChange={(v) => setParam("search", v)}
          searchPlaceholder={isTh ? "ค้นหา DAR No., ประเภท, สถานะ..." : "Search DAR No., type, status..."}
          filters={[
            {
              key: "status",
              label: isTh ? "สถานะ" : "Status",
              options: statusOptions,
              allLabel: isTh ? "ทุกสถานะ" : "All Statuses",
            },
            {
              key: "objective",
              label: isTh ? "วัตถุประสงค์" : "Objective",
              options: objectiveOptions,
              allLabel: isTh ? "ทุกวัตถุประสงค์" : "All Objectives",
              minWidth: "12rem",
            },
          ]}
          filterValues={{ status: params.status, objective: params.objective }}
          onFilterChange={setParam}
          hasActiveFilters={hasFilters}
          onClearAll={clearAll}
          clearLabel={isTh ? "ล้างตัวกรอง" : "Clear"}
          resultCount={filtered.length}
          totalCount={dars.length}
          countLabel={isTh ? "รายการ" : "items"}
        >
          {/* Sort controls */}
          <div className="flex items-center gap-1.5 self-end">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-8 px-2 py-1 text-[13px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0F1059] transition-colors"
            >
              <option value="requestDate">{isTh ? "วันที่ขอ" : "Date"}</option>
              <option value="darNo">{isTh ? "เลขที่ DAR" : "DAR No."}</option>
              <option value="status">{isTh ? "สถานะ" : "Status"}</option>
            </select>
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#0F1059] transition-colors"
              title={sortDir === "asc" ? (isTh ? "น้อย → มาก" : "Ascending") : (isTh ? "มาก → น้อย" : "Descending")}
            >
              {sortDir === "asc" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
            </button>
          </div>
        </FilterBar>
      )}

      {/* Empty / filtered-empty / table */}
      {dars.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <EmptyState
            title={isTh ? "ยังไม่มีคำขอเอกสาร" : "No document requests yet"}
            description={isTh ? "คำขอที่ผู้ใช้ส่งมาจะแสดงที่นี่" : "Requests submitted by users will appear here"}
          />
        </div>
      ) : isFilteredEmpty ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] pb-8">
          <EmptyState
            title={isTh ? "ไม่พบผลลัพธ์" : "No results found"}
            description={isTh ? "ลองปรับตัวกรองหรือคำค้นหา" : "Try adjusting your filters or search term"}
          />
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={clearAll}>
              {isTh ? "ล้างตัวกรอง" : "Clear Filters"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <DarTable
            dars={filtered}
            onSort={toggleSort}
            sortKey={sortKey}
            sortDir={sortDir}
            onDelete={(id, darNo) => { setPendingDelete({ id, darNo }); setDeleteError(null); }}
          />
          <DarCardList dars={filtered} />
        </>
      )}

      {/* Delete confirm dialog */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open && !deleting) { setPendingDelete(null); setDeleteError(null); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <DialogTitle className="text-base">
                {isTh
                  ? `ลบคำขอ ${pendingDelete?.darNo ?? ""}?`
                  : `Delete ${pendingDelete?.darNo ?? "request"}?`}
              </DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            {isTh
              ? "การลบคำขอเอกสารนี้จะลบข้อมูลทั้งหมดรวมถึงไฟล์แนบ และไม่สามารถกู้คืนได้"
              : "This will permanently delete the DAR and all its attachments. This action cannot be undone."}
          </p>
          {deleteError && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => { setPendingDelete(null); setDeleteError(null); }}
            >
              {isTh ? "ยกเลิก" : "Cancel"}
            </Button>
            <Button
              disabled={deleting}
              onClick={confirmDelete}
              className="bg-rose-600 text-white hover:bg-rose-700 gap-2"
            >
              {deleting && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              {isTh ? "ยืนยันลบ" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
