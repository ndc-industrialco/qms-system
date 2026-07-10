"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RichTextEditor from "@/components/shared/RichTextEditor";
import { toast } from "sonner";
import { Loader2, Mail, Send } from "lucide-react";

interface KpiDept {
  id: string;
  name: string;
  emailGroup: string | null;
  isActive: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  kpiId: string;
  year: number;
  onSuccess: () => void;
}

export default function KpiMasterAnnounceDialog({ open, onClose, kpiId, year, onSuccess }: Props) {
  const [departments, setDepartments] = useState<KpiDept[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [wysiwygContent, setWysiwygContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await fetch("/api/departments");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setDepartments(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to load departments", err);
      } finally {
        setLoadingDepts(false);
      }
    }

    if (open) {
      void loadDepts();
      // Set default WYSIWYG content
      setWysiwygContent(
        `<p>เรียน ทุกท่าน,</p>` +
        `<p>ขอประกาศใช้แผนวัตถุประสงค์คุณภาพประจำปี <strong>FM-MR-01 ประจำปี ${year}</strong> ที่ได้รับการอนุมัติอย่างเป็นทางการแล้ว โดยท่านสามารถตรวจสอบแผนงานและดาวน์โหลดเอกสารแนบได้ทางลิงก์แนบในอีเมลนี้</p>` +
        `<p>จึงเรียนมาเพื่อทราบและถือปฏิบัติ</p>` +
        `<p>---<br>ฝ่ายควบคุมระบบคุณภาพ (QMS)</p>`
      );
    }
  }, [open, year]);

  const deptsWithGroup = departments.filter((d) => d.emailGroup && d.emailGroup.trim() !== "");

  const handleToggleTo = (email: string) => {
    setToEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleToggleCc = (email: string) => {
    setCcEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSelectAllTo = () => {
    if (toEmails.length === deptsWithGroup.length) {
      setToEmails([]);
    } else {
      setToEmails(deptsWithGroup.map((d) => d.emailGroup!));
    }
  };

  const handleSelectAllCc = () => {
    if (ccEmails.length === deptsWithGroup.length) {
      setCcEmails([]);
    } else {
      setCcEmails(deptsWithGroup.map((d) => d.emailGroup!));
    }
  };

  const handleSubmit = async () => {
    if (toEmails.length === 0) {
      toast.error("กรุณาเลือกผู้รับอย่างน้อย 1 กลุ่ม / Please select at least 1 recipient group");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/kpi/${kpiId}/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toGroupEmails: toEmails,
          ccGroupEmails: ccEmails,
          wysiwygContent: wysiwygContent,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Failed to publish announcement");
      }

      toast.success("ประกาศใช้และส่งอีเมลเรียบร้อยแล้ว / Announced and emails sent successfully");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการประกาศใช้";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !submitting && !val && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
            <Mail className="w-5 h-5 text-[#0F1059]" />
            <span>ประกาศใช้และประชาสัมพันธ์ FM-MR-01 / Announce FM-MR-01 ({year})</span>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loadingDepts ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#0F1059]" />
              <p className="text-xs">กำลังโหลดกลุ่มอีเมลแผนก...</p>
            </div>
          ) : deptsWithGroup.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              ไม่พบอีเมลกลุ่มหน่วยงานในระบบ กรุณาตรวจสอบการตั้งค่าหน่วยงาน
            </div>
          ) : (
            <div className="space-y-4">
              {/* To Group Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">
                    ส่งถึงกลุ่มหน่วยงาน (To) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllTo}
                    className="text-xs text-[#0F1059] font-medium hover:underline"
                  >
                    {toEmails.length === deptsWithGroup.length ? "ล้างทั้งหมด / Clear all" : "เลือกทั้งหมด / Select all"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {deptsWithGroup.map((dept) => (
                    <label
                      key={`to-${dept.id}`}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        toEmails.includes(dept.emailGroup!)
                          ? "bg-[#0F1059]/5 border-[#0F1059]/30 text-[#0F1059]"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={toEmails.includes(dept.emailGroup!)}
                        onChange={() => handleToggleTo(dept.emailGroup!)}
                        className="mt-0.5 rounded border-slate-300 text-[#0F1059] focus:ring-[#0F1059]"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold block truncate">{dept.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{dept.emailGroup}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* CC Group Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">
                    สำเนาถึง (CC)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllCc}
                    className="text-xs text-[#0F1059] font-medium hover:underline"
                  >
                    {ccEmails.length === deptsWithGroup.length ? "ล้างทั้งหมด / Clear all" : "เลือกทั้งหมด / Select all"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {deptsWithGroup.map((dept) => (
                    <label
                      key={`cc-${dept.id}`}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        ccEmails.includes(dept.emailGroup!)
                          ? "bg-slate-800/5 border-slate-800/30 text-slate-800"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={ccEmails.includes(dept.emailGroup!)}
                        onChange={() => handleToggleCc(dept.emailGroup!)}
                        className="mt-0.5 rounded border-slate-300 text-slate-800 focus:ring-slate-800"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold block truncate">{dept.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{dept.emailGroup}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* WYSIWYG Editor */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  รายละเอียดเพิ่มเติม (Email Content)
                </label>
                <RichTextEditor
                  value={wysiwygContent}
                  onChange={setWysiwygContent}
                  minHeight={150}
                  placeholder="พิมพ์ข้อความรายละเอียดที่นี่..."
                />
              </div>

              {/* Attachment Notice Banner */}
              <div className="rounded-xl border border-[#0F1059]/20 bg-[#0F1059]/5 px-4 py-3 text-xs text-[#0F1059] flex items-center gap-2">
                <Send className="w-4 h-4 shrink-0" />
                <span>อีเมลประกาศจะแนบไฟล์ตารางวัตถุประสงค์คุณภาพประจำปี (Excel Export) ไปด้วยโดยอัตโนมัติ</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl text-xs font-semibold"
          >
            ยกเลิก / Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loadingDepts || toEmails.length === 0}
            className="bg-[#0F1059] hover:bg-[#161875] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 px-5 h-9"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>ยืนยันส่งประกาศ / Send Announcement</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
