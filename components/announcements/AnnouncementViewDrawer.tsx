"use client";

import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcement";
import AnnouncementViewFields from "@/components/announcements/AnnouncementViewFields";

type Props = {
  item: AnnouncementRow | null;
  open: boolean;
  onClose: () => void;
  onEdit: (item: AnnouncementRow) => void;
};

export default function AnnouncementViewDrawer({ item, open, onClose, onEdit }: Props) {
  const t = useT();

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="px-5 py-4 border-b border-base-200 flex items-center justify-between">
          <h2 className="text-sm md:text-base font-bold text-primary">{t("announcement.viewTitle")}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Close">✕</button>
        </div>

        {item && <AnnouncementViewFields item={item} />}

        <div className="px-5 py-4 border-t border-base-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost btn-sm">{t("common.close")}</button>
          {item && (
            <button onClick={() => { onClose(); onEdit(item); }} className="btn btn-primary btn-sm">
              {t("common.edit")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
