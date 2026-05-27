"use client";

import { useEffect, useState } from "react";
import DarForm from "./DarForm";
import { useLocale } from "@/lib/locale-context";
import type { DarDetail } from "@/types/dar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import ConfirmModal from "@/components/common/ConfirmModal";

type Department = { id: string; name: string };

type Props = {
  darId: string | null;
  onClose: () => void;
};

export default function DarEditDrawer({ darId, onClose }: Props) {
  const locale = useLocale();
  const isOpen = darId !== null;

  const [dar, setDar] = useState<DarDetail | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempId] = useState(() => crypto.randomUUID());

  // Delete confirm modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isTh = locale === "th";

  async function load(id: string) {
    setLoading(true);
    setError(null);
    try {
      const [darRes, depsRes] = await Promise.all([
        fetch(`/api/dar/${id}`),
        fetch("/api/departments"),
      ]);
      const darJson = await darRes.json() as { data: DarDetail | null; error: string | null };
      const depsJson = await depsRes.json() as { data: Department[] | null; error: string | null };

      if (!darRes.ok || darJson.error || !darJson.data) throw new Error();
      if (!depsRes.ok || depsJson.error || !depsJson.data) throw new Error();

      setDar(darJson.data);
      setDepartments(depsJson.data);
    } catch {
      setError(isTh ? "โหลดข้อมูลไม่สำเร็จ" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!darId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/dar/${darId}`, { method: "DELETE" });
      const json = await res.json() as { error: string | null };
      if (!res.ok || json.error) throw new Error(json.error ?? "");
      setShowDeleteConfirm(false);
      onClose();
      // Reload the list
      window.location.reload();
    } catch (e) {
      setDeleteError(e instanceof Error && e.message ? e.message : (isTh ? "ลบไม่สำเร็จ" : "Delete failed"));
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (darId) load(darId);
    else { setDar(null); setError(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darId]);


  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, showDeleteConfirm]);

  if (!isOpen) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(val) => {
        if (!val) {
          if (showDeleteConfirm) setShowDeleteConfirm(false);
          else onClose();
        }
      }}>
        <SheetContent side="right" className="flex flex-col p-0 w-full lg:max-w-2xl h-full" hideClose>
          {/* Mobile drag handle */}
          <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-slate-200" />
          </div>

          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-slate-100 shrink-0 text-left relative flex flex-row items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-semibold text-slate-800 leading-snug pr-8">
                {isTh ? "แก้ไขคำขอเอกสาร (DAR)" : "Edit Document Request"}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 mt-0.5">
                {dar?.darNo
                  ? (isTh ? `เลขที่ ${dar.darNo}` : `DAR No. ${dar.darNo}`)
                  : (isTh ? "ฉบับร่าง" : "Draft")}
              </SheetDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Delete button — only shown for DRAFT */}
              {dar?.status === "DRAFT" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  aria-label={isTh ? "ลบคำขอ" : "Delete request"}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">{isTh ? "ลบ" : "Delete"}</span>
                </Button>
              )}

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={isTh ? "ปิด" : "Close"}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#0F1059] animate-spin" />
                <span className="text-slate-400 text-sm">{isTh ? "กำลังโหลดข้อมูล..." : "Loading..."}</span>
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <p className="text-slate-800 font-semibold text-base mb-1">
                  {isTh ? "โหลดข้อมูลไม่สำเร็จ" : "Something went wrong"}
                </p>
                <p className="text-slate-400 text-sm mb-4">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => darId && load(darId)}
                >
                  {isTh ? "ลองใหม่" : "Try Again"}
                </Button>
              </div>
            )}

            {!loading && !error && dar && (
              <DarForm
                mode="edit"
                tempId={tempId}
                initialData={dar}
                departments={departments}
                requesterInfo={{
                  name: dar.requester.name,
                  employeeId: dar.requester.employeeId,
                  department: dar.requester.department?.name ?? null,
                  requestDate: dar.requestDate,
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title={isTh ? "ยืนยันการลบ" : "Delete Draft?"}
          message={
            (dar?.darNo ?? (isTh ? "ฉบับร่าง" : "Draft")) + "\n" +
            (isTh ? "คำขอนี้จะถูกลบถาวร ไม่สามารถกู้คืนได้" : "This draft will be permanently deleted and cannot be recovered.") +
            (deleteError ? `\n\nError: ${deleteError}` : "")
          }
          confirmLabel={isTh ? "ลบถาวร" : "Delete"}
          cancelLabel={isTh ? "ยกเลิก" : "Cancel"}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
          loading={deleting}
          danger={true}
        />
      )}
    </>
  );
}
