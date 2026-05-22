"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcement";

type Props = {
  item: AnnouncementRow | null;
  open: boolean;
  onClose: () => void;
  onDeleted: (success: boolean, errorMessage?: string) => void;
};

export default function AnnouncementDeleteModal({ item, open, onClose, onDeleted }: Props) {
  const t = useT();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!item) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements/${item.id}`, {
        method: "DELETE",
      });

      const json = (await res.json()) as { data: unknown; error: string | null };

      if (!res.ok || json.error) {
        onDeleted(false, json.error ?? undefined);
        return;
      }

      onDeleted(true);
    } catch {
      onDeleted(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog className={`modal ${open ? "modal-open" : ""}`}>
      <div className="modal-box rounded-xl">
        <h3 className="font-bold text-base text-primary mb-2">{t("announcement.deleteTitle")}</h3>
        <p className="text-sm text-gray-500 mb-6">
          {t("announcement.deleteConfirm")} &ldquo;
          <strong>{item?.title}</strong>
          &rdquo;? {t("announcement.deleteWarning")}
        </p>
        <div className="flex justify-end gap-3">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={loading}
          >
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-error btn-sm min-w-24"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner loading-xs" /> : t("common.delete")}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
