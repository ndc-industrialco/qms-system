"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcement";
import { useEditAnnouncement } from "@/hooks/use-edit-announcement";
import AnnouncementBgPicker from "@/components/announcements/AnnouncementBgPicker";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  item: AnnouncementRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: (success: boolean, errorMessage?: string) => void;
};

const inputCls = "w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors";
const labelCls = "text-slate-800 text-sm font-semibold mb-2 block";

export default function AnnouncementEditDrawer({ item, open, onClose, onSaved }: Props) {
  const t = useT();
  const { form, setForm, bgImageFile, setBgImageFile, clearBgImage, setClearBgImage, loading, handleSave } = useEditAnnouncement(item, onSaved);
  const isTh = t("common.cancel") === "ยกเลิก";

  const currentBgImageUrl = clearBgImage ? null : (item?.bgImageUrl ?? null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <SheetContent side="right" className="flex flex-col p-0 w-full lg:max-w-2xl h-full" hideClose>
        {/* Mobile drag handle */}
        <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-slate-100 shrink-0 text-left relative">
          <SheetTitle className="text-lg font-semibold text-slate-800 leading-snug pr-8">
            {t("announcement.editTitle")}
          </SheetTitle>
          {item && (
            <SheetDescription className="text-xs text-slate-500 mt-0.5 truncate max-w-64">
              {item.title}
            </SheetDescription>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t("common.cancel")}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          <div>
            <label className={labelCls}>{t("announcement.fieldTitle")} <span className="text-rose-600">*</span></label>
            <input
              type="text"
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={255}
            />
          </div>

          <div>
            <label className={labelCls}>{t("announcement.fieldContent")} <span className="text-rose-600">*</span></label>
            <Textarea
              className="min-h-[7.5rem]"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              maxLength={5000}
            />
          </div>

          <div>
            <label className={labelCls}>{t("announcement.fieldSourceSystem")}</label>
            <select
              className={inputCls}
              value={form.sourceSystem}
              onChange={(e) => setForm((f) => ({ ...f, sourceSystem: e.target.value }))}
            >
              {["QMS", "IT", "HR", "GA", "SAFETY"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>{t("announcement.fieldDisplayType")}</label>
            <select
              className={inputCls}
              value={form.displayType}
              onChange={(e) => setForm((f) => ({ ...f, displayType: e.target.value }))}
            >
              <option value="LIST">{t("announcement.displayTypeNormal")}</option>
              <option value="SCROLLING">{t("announcement.displayTypeMain")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("announcement.fieldStartDate")}</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{t("announcement.fieldEndDate")}</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer hover:bg-white transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border border-slate-300 accent-[#0F1059] cursor-pointer mt-0.5 focus:ring-2 focus:ring-[#0F1059] focus:ring-offset-2"
                checked={form.pushToCompanyCenter}
                onChange={(e) => setForm((f) => ({ ...f, pushToCompanyCenter: e.target.checked }))}
              />
              <span className="text-slate-800 text-sm font-medium">{t("announcement.fieldPushToCompany")}</span>
            </label>
          </div>

          <AnnouncementBgPicker
            bgColor={form.bgColor}
            bgImageUrl={currentBgImageUrl}
            bgImageFile={bgImageFile}
            textColor={form.textColor}
            onColorChange={(c) => setForm((f) => ({ ...f, bgColor: c }))}
            onImageChange={(f) => { setBgImageFile(f); setClearBgImage(!f); }}
            onTextColorChange={(c) => setForm((f) => ({ ...f, textColor: c }))}
            isTh={isTh}
          />
        </div>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t border-slate-100 shrink-0 flex flex-row justify-end gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !form.title.trim() || !form.content.trim()}
            className="min-w-28"
          >
            {loading && <div className="w-4 h-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {t("common.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
