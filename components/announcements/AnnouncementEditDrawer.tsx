"use client";

import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcement";
import { useEditAnnouncement } from "@/hooks/use-edit-announcement";
import AnnouncementBgPicker from "@/components/announcements/AnnouncementBgPicker";

type Props = {
  item: AnnouncementRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: (success: boolean, errorMessage?: string) => void;
};

export default function AnnouncementEditDrawer({ item, open, onClose, onSaved }: Props) {
  const t = useT();
  const { form, setForm, bgImageFile, setBgImageFile, clearBgImage, setClearBgImage, loading, handleSave } = useEditAnnouncement(item, onSaved);
  const isTh = t("common.cancel") === "ยกเลิก";

  const currentBgImageUrl = clearBgImage ? null : (item?.bgImageUrl ?? null);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="px-5 py-4 border-b border-base-200 flex items-center justify-between">
          <h2 className="text-sm md:text-base font-bold text-primary">{t("announcement.editTitle")}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Close">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div className="form-control gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {t("announcement.fieldTitle")} <span className="text-error">*</span>
            </label>
            <input type="text" className="input input-bordered input-sm w-full text-sm" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={255} />
          </div>

          <div className="form-control gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {t("announcement.fieldContent")} <span className="text-error">*</span>
            </label>
            <textarea className="textarea textarea-bordered w-full text-sm min-h-[120px]" value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} maxLength={5000} />
          </div>

          <div className="form-control gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("announcement.fieldSourceSystem")}</label>
            <input type="text" className="input input-bordered input-sm w-full text-sm" value={form.sourceSystem}
              onChange={(e) => setForm((f) => ({ ...f, sourceSystem: e.target.value }))} maxLength={100} />
          </div>

          <div className="form-control gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("announcement.fieldDisplayType")}</label>
            <select className="select select-bordered select-sm w-full text-sm" value={form.displayType}
              onChange={(e) => setForm((f) => ({ ...f, displayType: e.target.value }))}>
              <option value="LIST">{t("announcement.displayTypeNormal")}</option>
              <option value="SCROLLING">{t("announcement.displayTypeMain")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("announcement.fieldStartDate")}</label>
              <input type="datetime-local" className="input input-bordered input-sm w-full text-sm" value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="form-control gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("announcement.fieldEndDate")}</label>
              <input type="datetime-local" className="input input-bordered input-sm w-full text-sm" value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>

          <div className="form-control">
            <label className="cursor-pointer flex items-center gap-3">
              <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={form.pushToCompanyCenter}
                onChange={(e) => setForm((f) => ({ ...f, pushToCompanyCenter: e.target.checked }))} />
              <span className="text-xs text-neutral">{t("announcement.fieldPushToCompany")}</span>
            </label>
          </div>

          <AnnouncementBgPicker
            bgColor={form.bgColor}
            bgImageUrl={currentBgImageUrl}
            bgImageFile={bgImageFile}
            textColor={form.textColor}
            onColorChange={(c) => setForm((f) => ({ ...f, bgColor: c }))}
            onImageChange={(f) => { setBgImageFile(f); if (!f) setClearBgImage(true); else setClearBgImage(false); }}
            onTextColorChange={(c) => setForm((f) => ({ ...f, textColor: c }))}
            isTh={isTh}
          />
        </div>

        <div className="px-5 py-4 border-t border-base-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost btn-sm" disabled={loading}>{t("common.cancel")}</button>
          <button onClick={handleSave} className="btn btn-primary btn-sm min-w-24"
            disabled={loading || !form.title.trim() || !form.content.trim()}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : t("common.save")}
          </button>
        </div>
      </div>
    </>
  );
}
