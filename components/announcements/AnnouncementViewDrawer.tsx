"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcement";
import AnnouncementViewFields from "@/components/announcements/AnnouncementViewFields";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type Props = {
  item: AnnouncementRow | null;
  open: boolean;
  onClose: () => void;
  onEdit: (item: AnnouncementRow) => void;
};

export default function AnnouncementViewDrawer({ item, open, onClose, onEdit }: Props) {
  const t = useT();

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
      <SheetContent side="right" className="flex flex-col p-0 w-full lg:max-w-md h-full" hideClose>
        {/* Mobile drag handle */}
        <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-slate-100 shrink-0 text-left relative">
          <SheetTitle className="text-lg font-semibold text-slate-800 leading-snug pr-8">
            {t("announcement.viewTitle")}
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
            aria-label={t("common.close")}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </SheetHeader>

        {/* Body */}
        {item && <AnnouncementViewFields item={item} />}

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t border-slate-100 shrink-0 flex flex-row justify-end gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {t("common.close")}
          </Button>
          {item && (
            <Button
              onClick={() => { onClose(); onEdit(item); }}
            >
              {t("common.edit")}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
