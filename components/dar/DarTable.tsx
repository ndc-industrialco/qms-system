"use client";

import Link from "next/link";
import { fmtDate } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DarSummary } from "@/types/dar";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS } from "@/types/dar";
import DarStatusBadge from "./DarStatusBadge";
import { useLocale } from "@/lib/locale-context";

const OBJECTIVE_LABELS_EN: Record<string, string> = {
  PREPARE_NEW:                "Prepare New Doc",
  REQUEST_COPY_CONTROLLED:    "Copy (Controlled)",
  REQUEST_COPY_UNCONTROLLED:  "Copy (Uncontrolled)",
  REVISE:                     "Revise",
  CANCEL:                     "Cancel Doc",
};

const DOC_TYPE_LABELS_EN: Record<string, string> = {
  MANUAL:    "Manual (M)",
  FORMAT:    "Format (FM)",
  DRAWING:   "Drawing",
  PROCEDURE: "Procedure (P)",
  SOP:       "SOP",
  SIP:       "SIP",
  IPQC:      "IPQC",
  OTHER:     "Other",
};

type SortKey = "requestDate" | "darNo" | "status";
type SortDir = "asc" | "desc";

type Props = {
  dars: DarSummary[];
  onSort?: (key: SortKey) => void;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, darNo: string | null) => void;
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
  return dir === "asc" ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[#0F1059]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[#0F1059]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
    </svg>
  );
}

export default function DarTable({ dars, onSort, sortKey, sortDir = "desc", onEdit, onDelete }: Props) {
  const locale = useLocale();

  const t = {
    darNo:     locale === "th" ? "เลขที่ DAR"   : "DAR No.",
    date:      locale === "th" ? "วันที่ขอ"     : "Date",
    objective: locale === "th" ? "วัตถุประสงค์" : "Objective",
    docType:   locale === "th" ? "ประเภทเอกสาร" : "Doc Type",
    items:     locale === "th" ? "รายการ"       : "Items",
    status:    locale === "th" ? "สถานะ"        : "Status",
    view:      locale === "th" ? "ดูรายละเอียด" : "View",
    edit:      locale === "th" ? "แก้ไข"        : "Edit",
    draft:     locale === "th" ? "ร่าง"         : "Draft",
  };

  function objectiveLabel(key: string) {
    return locale === "th"
      ? (OBJECTIVE_LABELS as Record<string, string>)[key] ?? key
      : OBJECTIVE_LABELS_EN[key] ?? key;
  }

  function docTypeLabel(key: string) {
    return locale === "th"
      ? (DOC_TYPE_LABELS as Record<string, string>)[key] ?? key
      : DOC_TYPE_LABELS_EN[key] ?? key;
  }

  return (
    <div className="hidden lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button onClick={() => onSort?.("darNo")} className="inline-flex items-center gap-1.5 hover:text-[#0F1059] transition-colors">
                {t.darNo}
                <SortIcon active={sortKey === "darNo"} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="text-center">
              <button onClick={() => onSort?.("requestDate")} className="inline-flex items-center gap-1.5 hover:text-[#0F1059] transition-colors">
                {t.date}
                <SortIcon active={sortKey === "requestDate"} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead>{t.objective}</TableHead>
            <TableHead>{t.docType}</TableHead>
            <TableHead className="text-center">{t.items}</TableHead>
            <TableHead>
              <button onClick={() => onSort?.("status")} className="inline-flex items-center gap-1.5 hover:text-[#0F1059] transition-colors">
                {t.status}
                <SortIcon active={sortKey === "status"} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dars.map((dar) => (
            <TableRow key={dar.id}>
              <TableCell>
                {dar.darNo ? (
                  <span className="text-sm font-semibold text-[#0F1059]">{dar.darNo}</span>
                ) : (
                  <Badge variant="draft">{t.draft}</Badge>
                )}
              </TableCell>

              <TableCell className="text-center">
                <span className="text-sm font-mono text-slate-600 whitespace-nowrap">{fmtDate(dar.requestDate, locale)}</span>
              </TableCell>

              <TableCell>
                <span className="text-sm text-slate-600">{objectiveLabel(dar.objective)}</span>
              </TableCell>

              <TableCell>
                <span className="text-sm text-slate-600">{docTypeLabel(dar.docType)}</span>
              </TableCell>

              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                  {dar.itemCount}
                </span>
              </TableCell>

              <TableCell>
                <DarStatusBadge status={dar.status} />
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-xl text-xs font-medium text-[#1D6A8A] border-[#1D6A8A]/30 hover:bg-sky-50"
                  >
                    <Link href={`/dar/${dar.id}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {t.view}
                    </Link>
                  </Button>

                  {dar.status === "DRAFT" && onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(dar.id)}
                      className="h-9 px-3 rounded-xl text-xs font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      {t.edit}
                    </Button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(dar.id, dar.darNo)}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                      title={locale === "th" ? "ลบ" : "Delete"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
