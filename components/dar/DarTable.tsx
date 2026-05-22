"use client";

import Link from "next/link";
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

export default function DarTable({ dars }: { dars: DarSummary[] }) {
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

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

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
    <div className="hidden md:block card-premium overflow-hidden border border-base-300 rounded-xl shadow-sm">
      <table className="table w-full">
        <thead>
          <tr className="border-b border-base-200">
            <th className="th-pro">{t.darNo}</th>
            <th className="th-pro">{t.date}</th>
            <th className="th-pro">{t.objective}</th>
            <th className="th-pro">{t.docType}</th>
            <th className="th-pro text-center">{t.items}</th>
            <th className="th-pro">{t.status}</th>
            <th className="th-pro" />
          </tr>
        </thead>
        <tbody>
          {dars.map((dar) => (
            <tr
              key={dar.id}
              className="border-b border-base-200 hover:bg-primary/5 transition-colors duration-200"
            >
              {/* DAR No. */}
              <td className="py-3.5 px-4">
                {dar.darNo ? (
                  <span className="text-xs md:text-sm font-semibold text-primary">{dar.darNo}</span>
                ) : (
                  <span className="inline-block px-2 py-0.5 text-[11px] rounded-md bg-base-200 text-gray-400 font-medium">
                    {t.draft}
                  </span>
                )}
              </td>

              {/* Date */}
              <td className="py-3.5 px-4 text-[11px] md:text-xs text-gray-500 whitespace-nowrap">
                {fmtDate(dar.requestDate)}
              </td>

              {/* Objective */}
              <td className="py-3.5 px-4 text-xs md:text-sm text-base-content">
                {objectiveLabel(dar.objective)}
              </td>

              {/* Doc Type */}
              <td className="py-3.5 px-4 text-xs md:text-sm text-base-content">
                {docTypeLabel(dar.docType)}
              </td>

              {/* Item Count */}
              <td className="py-3.5 px-4 text-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-base-200 text-[11px] font-semibold text-gray-500">
                  {dar.itemCount}
                </span>
              </td>

              {/* Status */}
              <td className="py-3.5 px-4">
                <DarStatusBadge status={dar.status} />
              </td>

              {/* Actions */}
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-2 justify-end">
                  <Link
                    href={`/dar/${dar.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold text-secondary border border-secondary/30 hover:bg-secondary/10 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {t.view}
                  </Link>

                  {dar.status === "DRAFT" && (
                    <Link
                      href={`/dar/${dar.id}/edit`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold text-gray-500 border border-base-300 hover:bg-base-200 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      {t.edit}
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
