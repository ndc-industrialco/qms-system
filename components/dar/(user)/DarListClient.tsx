"use client";

import { useState, useMemo } from "react";
import type { DarSummary } from "@/types/dar";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS, DAR_STATUS_LABELS } from "@/types/dar";
import type { DarStatus, DarObjective, DarDocType } from "@/types/dar";
import DarListHeader from "@/components/dar/DarListHeader";
import DarTable from "@/components/dar/DarTable";
import DarCardList from "@/components/dar/DarCardList";
import DarDrawer from "@/components/dar/DarDrawer";
import DarEditDrawer from "@/components/dar/DarEditDrawer";
import FilterBar from "@/components/common/FilterBar";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { useUrlFilters } from "@/hooks/use-url-filters";

type RequesterInfo = {
  name: string | null;
  employeeId: string | null;
  department: string | null;
  requestDate: string;
};

type Props = {
  dars: DarSummary[];
  requesterInfo: RequesterInfo;
};

type SortKey = "requestDate" | "darNo" | "status";
type SortDir = "asc" | "desc";

const OBJECTIVE_LABELS_EN: Record<DarObjective, string> = {
  PREPARE_NEW: "Prepare New Doc",
  REQUEST_COPY_CONTROLLED: "Copy (Controlled)",
  REQUEST_COPY_UNCONTROLLED: "Copy (Uncontrolled)",
  REVISE: "Revise",
  CANCEL: "Cancel Doc",
};

const DOC_TYPE_LABELS_EN: Record<DarDocType, string> = {
  MANUAL: "Manual (M)",
  FORMAT: "Format (FM)",
  DRAWING: "Drawing",
  PROCEDURE: "Procedure (P)",
  SOP: "SOP",
  SIP: "SIP",
  IPQC: "IPQC",
  OTHER: "Other",
};

export default function DarListClient({ dars, requesterInfo }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDarId, setEditDarId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("requestDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const t = useT();
  const locale = useLocale();
  const isTh = locale === "th";

  // ── URL-bound filters (search debounced, others immediate) ─────────────────
  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ["search", "status", "objective"] as const,
    searchKey: "search",
    debounceMs: 300,
  });

  function objectiveLabel(key: DarObjective) {
    return isTh ? OBJECTIVE_LABELS[key] : OBJECTIVE_LABELS_EN[key];
  }

  function docTypeLabel(key: DarDocType) {
    return isTh ? DOC_TYPE_LABELS[key] : DOC_TYPE_LABELS_EN[key];
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

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
            docTypeLabel(d.docType),
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

  const isAllEmpty = dars.length === 0;
  const isFilteredEmpty = !isAllEmpty && filtered.length === 0;

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
      <DarListHeader onNewRequest={() => setDrawerOpen(true)} />

      {!isAllEmpty && (
        <FilterBar
          searchValue={rawValues.search}
          onSearchChange={(v) => setParam("search", v)}
          searchPlaceholder={isTh ? "ค้นหา DAR No., ประเภท..." : "Search DAR No., type..."}
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
        />
      )}

      {isAllEmpty ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] pb-4">
          <EmptyState
            title={t("emptyDarUser")}
            description={t("emptyDarUserDesc")}
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
          <DarTable dars={filtered} onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} onEdit={setEditDarId} />
          <DarCardList dars={filtered} onEdit={setEditDarId} />
        </>
      )}

      <DarDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        requesterInfo={requesterInfo}
      />

      <DarEditDrawer
        darId={editDarId}
        onClose={() => setEditDarId(null)}
      />
    </>
  );
}
