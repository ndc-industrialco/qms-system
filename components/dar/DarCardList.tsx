"use client";

import Link from "next/link";
import { fmtDate } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default function DarCardList({ dars, onEdit }: { dars: DarSummary[]; onEdit?: (id: string) => void }) {
  const locale = useLocale();

  const t = {
    noDarNo:   locale === "th" ? "ยังไม่มีเลขที่" : "Draft",
    objective: locale === "th" ? "วัตถุประสงค์"   : "Objective",
    docType:   locale === "th" ? "ประเภท"         : "Doc Type",
    itemCount: locale === "th" ? "จำนวนรายการ"    : "Items",
    date:      locale === "th" ? "วันที่ขอ"       : "Date",
    itemUnit:  locale === "th" ? "รายการ"         : "item(s)",
    view:      locale === "th" ? "ดูรายละเอียด"   : "View",
    edit:      locale === "th" ? "แก้ไข"          : "Edit",
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
    <div className="lg:hidden space-y-3">
      {dars.map((dar) => (
        <Card
          key={dar.id}
          className="p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              {dar.darNo ? (
                <p className="text-slate-800 font-semibold text-sm">{dar.darNo}</p>
              ) : (
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500 font-medium">
                  {t.noDarNo}
                </span>
              )}
              <p className="text-xs font-mono text-slate-400 mt-0.5">{fmtDate(dar.requestDate, locale)}</p>
            </div>
            <DarStatusBadge status={dar.status} />
          </div>

          <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">{t.objective}</span>
              <span className="text-xs text-slate-600 font-medium">{objectiveLabel(dar.objective)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">{t.docType}</span>
              <span className="text-xs text-slate-600 font-medium">{docTypeLabel(dar.docType)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">{t.itemCount}</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                {dar.itemCount}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-4 justify-end">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-sky-600 border-sky-200 hover:bg-sky-50 font-medium"
            >
              <Link href={`/dar/${dar.id}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {t.view}
              </Link>
            </Button>

            {dar.status === "DRAFT" && (
              <Button
                size="sm"
                onClick={() => onEdit?.(dar.id)}
                className="font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {t.edit}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
