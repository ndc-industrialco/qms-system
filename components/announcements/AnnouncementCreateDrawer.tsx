"use client";

import { useT } from "@/lib/i18n";
import { useCreateAnnouncement } from "@/hooks/use-create-announcement";
import AnnouncementBgPicker from "@/components/announcements/AnnouncementBgPicker";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (success: boolean, errorMessage?: string) => void;
};

export default function AnnouncementCreateDrawer({ open, onClose, onCreated }: Props) {
  const t = useT();
  const { form, setForm, file, setFile, bgImageFile, setBgImageFile, loading, handleSubmit } = useCreateAnnouncement(onCreated);
  const isTh = t("common.cancel") === "ยกเลิก";

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-base-200 flex items-center justify-between shrink-0">
          <h2 className="text-sm md:text-base font-bold text-primary">{t("announcement.createTitle")}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div className="form-control gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {t("announcement.fieldTitle")} <span className="text-error">*</span>
            </label>
            <input type="text" className="input input-bordered input-sm w-full text-sm"
              value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={255} />
          </div>

          <div className="form-control gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {t("announcement.fieldContent")} <span className="text-error">*</span>
            </label>
            <textarea className="textarea textarea-bordered w-full text-sm min-h-30"
              value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} maxLength={5000} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("announcement.fieldSourceSystem")}</label>
              <select className="select select-bordered select-sm w-full text-sm"
                value={form.sourceSystem} onChange={(e) => setForm((f) => ({ ...f, sourceSystem: e.target.value }))}>
                {["QMS", "IT", "HR", "GA", "SAFETY"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-control gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("announcement.fieldDisplayType")}</label>
              <select className="select select-bordered select-sm w-full text-sm"
                value={form.displayType} onChange={(e) => setForm((f) => ({ ...f, displayType: e.target.value }))}>
                <option value="LIST">{t("announcement.displayTypeNormal")}</option>
                <option value="SCROLLING">{t("announcement.displayTypeMain")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("announcement.fieldStartDate")}</label>
              <input type="datetime-local" className="input input-bordered input-sm w-full text-sm"
                value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="form-control gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("announcement.fieldEndDate")}</label>
              <input type="datetime-local" className="input input-bordered input-sm w-full text-sm"
                value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              <p className="text-[11px] text-gray-500">{t("announcement.endDateHint")}</p>
            </div>
          </div>

          <div className="form-control">
            <label className="cursor-pointer flex items-start gap-3 p-3 border border-base-300 rounded-lg bg-base-200/30">
              <input type="checkbox" className="checkbox checkbox-sm checkbox-primary mt-0.5"
                checked={form.pushToCompanyCenter} onChange={(e) => setForm((f) => ({ ...f, pushToCompanyCenter: e.target.checked }))} />
              <div>
                <span className="text-xs font-semibold block">{t("announcement.fieldPushToCompany")}</span>
                <span className="text-[11px] text-gray-500">{t("announcement.pushToCompanyHint")}</span>
              </div>
            </label>
          </div>

          <div className="form-control gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("announcement.fieldAttachment")}</label>
            <input type="file" className="file-input file-input-bordered file-input-sm w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <p className="text-[11px] text-primary flex items-center gap-1 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <AnnouncementBgPicker
            bgColor={form.bgColor}
            bgImageUrl={null}
            bgImageFile={bgImageFile}
            textColor={form.textColor}
            onColorChange={(c) => setForm((f) => ({ ...f, bgColor: c }))}
            onImageChange={setBgImageFile}
            onTextColorChange={(c) => setForm((f) => ({ ...f, textColor: c }))}
            isTh={isTh}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-base-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="btn btn-ghost btn-sm" disabled={loading}>{t("common.cancel")}</button>
          <button onClick={handleSubmit} className="btn btn-primary btn-sm min-w-28"
            disabled={loading || !form.title.trim() || !form.content.trim()}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : t("announcement.publish")}
          </button>
        </div>
      </div>
    </>
  );
}
