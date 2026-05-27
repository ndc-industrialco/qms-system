"use client";

import type { DarDetail } from "@/types/dar";
import type { SignatureType } from "@/types/dar";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS } from "@/types/dar";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import DarStatusBadge from "./DarStatusBadge";
import DarItemsTable from "./DarItemsTable";
import DarApprovalPanelWrapper from "./DarApprovalPanelWrapper";
import DarAttachmentUpload from "./DarAttachmentUpload";
import DarDraftActions from "./DarDraftActions";
import QmsDarActions from "./QmsDarActions";

interface Props {
  dar: DarDetail;
  currentUserId?: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  isQms?: boolean;
}

const card = "bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden";
const cardHead = "px-6 py-4 border-b border-slate-100 flex items-center justify-between";
const cardBody = "p-6";
const sectionLabel = "text-xs text-slate-400 mb-1";
const sectionValue = "text-sm font-medium text-slate-800";

export default function DarReadOnlyDetail({ dar, currentUserId, savedSignatureUrl, savedSignatureType, isQms = false }: Props) {
  const t = useT();
  const locale = useLocale();
  const isDraft = dar.status === "DRAFT";

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "th-TH", {
      day: "2-digit", month: "long", year: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* Header card — DAR No. + status + actions */}
      <div className={card}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">{t("fieldDarNo")}</p>
            {dar.darNo ? (
              <p className="text-2xl font-bold text-[#0F1059] leading-tight tracking-tight">{dar.darNo}</p>
            ) : (
              <p className="text-lg font-semibold text-slate-400">{t("fieldDarNoDraft")}</p>
            )}
            <p className="text-xs text-slate-400 mt-1 font-mono">{fmtDate(dar.requestDate)}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <DarStatusBadge status={dar.status} />
            {isQms
              ? <QmsDarActions darId={dar.id} darNo={dar.darNo} />
              : isDraft && <DarDraftActions darId={dar.id} />
            }
          </div>
        </div>
      </div>

      {/* Requester info */}
      <div className={card}>
        <div className={cardHead}>
          <h2 className="text-base font-semibold text-slate-800">{t("sectionRequester")}</h2>
        </div>
        <div className={`${cardBody} grid grid-cols-2 md:grid-cols-4 gap-4`}>
          <div>
            <p className={sectionLabel}>{t("fieldFullName")}</p>
            <p className={sectionValue}>{dar.requester.name ?? "—"}</p>
          </div>
          <div>
            <p className={sectionLabel}>{t("fieldEmpId")}</p>
            <p className={`${sectionValue} font-mono`}>{dar.requester.employeeId ?? "—"}</p>
          </div>
          <div>
            <p className={sectionLabel}>{t("fieldDepartment")}</p>
            <p className={sectionValue}>{dar.requester.department?.name ?? "—"}</p>
          </div>
          <div>
            <p className={sectionLabel}>{t("fieldDate")}</p>
            <p className={`${sectionValue} font-mono`}>{fmtDate(dar.requestDate)}</p>
          </div>
        </div>
      </div>

      {/* Objective & Doc type */}
      <div className={card}>
        <div className={cardHead}>
          <h2 className="text-base font-semibold text-slate-800">{t("sectionObjective")}</h2>
        </div>
        <div className={`${cardBody} grid grid-cols-1 md:grid-cols-2 gap-4`}>
          <div>
            <p className={sectionLabel}>{t("fieldObjective")}</p>
            <p className={sectionValue}>{OBJECTIVE_LABELS[dar.objective]}</p>
          </div>
          <div>
            <p className={sectionLabel}>{t("fieldDocType")}</p>
            <p className={sectionValue}>
              {DOC_TYPE_LABELS[dar.docType]}
              {dar.docTypeOther && (
                <span className="text-slate-500"> — {dar.docTypeOther}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Reason */}
      <div className={card}>
        <div className={cardHead}>
          <h2 className="text-base font-semibold text-slate-800">{t("sectionReason")}</h2>
        </div>
        <div className={cardBody}>
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{dar.reason}</p>
        </div>
      </div>

      {/* Items */}
      <div className={card}>
        <div className={cardHead}>
          <h2 className="text-base font-semibold text-slate-800">{t("sectionItems")}</h2>
          <span className="text-xs text-slate-400">
            {dar.items.length} {locale === "en" ? "items" : "รายการ"}
          </span>
        </div>
        <div className={cardBody}>
          <DarItemsTable items={dar.items} />
        </div>
      </div>

      {/* Distribution */}
      <div className={card}>
        <div className={cardHead}>
          <h2 className="text-base font-semibold text-slate-800">{t("sectionDistrib")}</h2>
          <span className="text-xs text-slate-400">
            {dar.distributions.length} {locale === "en" ? "dept(s)" : "แผนก"}
          </span>
        </div>
        <div className={cardBody}>
          {dar.distributions.length === 0 ? (
            <p className="text-sm text-slate-400">{t("noDeptFound")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {dar.distributions.map((d) => (
                <span
                  key={d.departmentId}
                  className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-slate-50 text-slate-600 border border-slate-200"
                >
                  {d.department.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attachments */}
      <div className={card}>
        <div className={cardHead}>
          <h2 className="text-base font-semibold text-slate-800">{t("sectionAttach")}</h2>
        </div>
        <div className={cardBody}>
          <DarAttachmentUpload
            mode="saved"
            darId={dar.id}
            initialAttachments={dar.attachments}
            canEdit={
              !!currentUserId &&
              dar.status !== "COMPLETED" &&
              dar.status !== "CANCELLED"
            }
          />
        </div>
      </div>

      {/* Approval panel */}
      {currentUserId && dar.status !== "DRAFT" && (
        <DarApprovalPanelWrapper
          initialDar={dar}
          currentUserId={currentUserId}
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
        />
      )}
    </div>
  );
}
