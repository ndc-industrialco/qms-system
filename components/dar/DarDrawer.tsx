"use client";

import { useEffect, useState } from "react";
import DarForm from "./DarForm";
import { useLocale } from "@/lib/locale-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type RequesterInfo = {
  name: string | null;
  employeeId: string | null;
  department: string | null;
  requestDate: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  requesterInfo: RequesterInfo;
};

type Department = { id: string; name: string };

export default function DarDrawer({ isOpen, onClose, requesterInfo }: Props) {
  const locale = useLocale();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  const [depsError, setDepsError] = useState<string | null>(null);
  const [tempId] = useState(() => crypto.randomUUID());

  const isTh = locale === "th";

  async function fetchDepartments() {
    setDepsLoading(true);
    setDepsError(null);
    try {
      const res = await fetch("/api/departments");
      const json = await res.json() as { data: Department[] | null; error: string | null };
      if (!res.ok || json.error || !json.data) throw new Error();
      setDepartments(json.data);
    } catch {
      setDepsError(isTh ? "โหลดข้อมูลไม่สำเร็จ" : "Failed to load departments");
    } finally {
      setDepsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && departments.length === 0 && !depsLoading) fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);


  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Esc to close (§18 keyboard shortcuts)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <SheetContent side="right" className="flex flex-col p-0 w-full lg:max-w-2xl h-full" hideClose>
        {/* Mobile drag handle */}
        <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-slate-100 shrink-0 text-left relative">
          <SheetTitle className="text-lg font-semibold text-slate-800 leading-snug pr-8">
            {isTh ? "สร้างคำขอเอกสาร (DAR)" : "New Document Request"}
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500 mt-0.5">
            {isTh ? "กรอกรายละเอียดคำขอเอกสารด้านล่าง" : "Fill in the request details below"}
          </SheetDescription>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={isTh ? "ปิด" : "Close"}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {depsLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#0F1059] animate-spin" />
              <span className="text-slate-400 text-sm">{isTh ? "กำลังโหลดข้อมูล..." : "Loading..."}</span>
            </div>
          )}

          {depsError && !depsLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <p className="text-slate-800 font-semibold text-base mb-1">
                {isTh ? "โหลดข้อมูลไม่สำเร็จ" : "Something went wrong"}
              </p>
              <p className="text-slate-400 text-sm mb-4">{depsError}</p>
              <Button
                variant="outline"
                onClick={fetchDepartments}
              >
                {isTh ? "ลองใหม่" : "Try Again"}
              </Button>
            </div>
          )}

          {!depsLoading && !depsError && (
            <DarForm
              mode="create"
              tempId={tempId}
              departments={departments}
              requesterInfo={requesterInfo}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
