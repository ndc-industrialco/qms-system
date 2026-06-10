"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  darId: string;
}

export default function DarDraftActions({ darId }: Props) {
  const t = useT();
  const router = useRouter();

  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutate: deleteDar, isPending: deleting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dar/${darId}`, { method: "DELETE" });
      const json = await res.json() as { error: string | null };
      if (!res.ok || json.error) throw new Error(json.error || t("error"));
    },
    onSuccess: () => {
      router.push("/dar");
      router.refresh();
    },
    onError: (err) => setError(err.message || t("errorRetry")),
  });

  function handleDelete() {
    setError(null);
    deleteDar();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="h-11 min-w-11 inline-flex items-center gap-1.5 px-3 rounded-xl text-sm font-medium
                     text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {t("deleteDraft")}
        </button>
      </div>

      <Dialog open={showConfirm} onOpenChange={(open) => !deleting && setShowConfirm(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <DialogTitle className="text-base">{t("confirmDeleteDraft")}</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-slate-600">{t("deleteDraftMsg")}</p>
          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => { setShowConfirm(false); setError(null); }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={deleting}
              onClick={handleDelete}
              className="bg-rose-600 text-white hover:bg-rose-700 gap-2"
            >
              {deleting && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              {t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
