"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAuditStandards,
  useCreateAuditStandard,
  useDeleteAuditStandard,
} from "@/hooks/api/use-audit-standards";

export default function AuditStandardsManager() {
  const [name, setName] = useState("");
  const { data: standards = [], isLoading } = useAuditStandards();
  const createMutation = useCreateAuditStandard();
  const deleteMutation = useDeleteAuditStandard();

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed, {
      onSuccess: () => { toast.success("เพิ่มมาตรฐานสำเร็จ"); setName(""); },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
        <p className="text-sm font-semibold text-slate-800 mb-3">เพิ่มมาตรฐานใหม่</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            placeholder="เช่น ISO 9001:2015"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button onClick={handleAdd} disabled={createMutation.isPending || !name.trim()}>
            <Plus className="mr-1.5 h-4 w-4" />เพิ่ม
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">รายการมาตรฐาน</p>
        </div>
        {isLoading ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">กำลังโหลด...</div>
        ) : standards.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">ยังไม่มีมาตรฐาน</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {standards.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300 w-5 text-right">{i + 1}</span>
                  <span className="text-sm font-medium text-slate-700">{s.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    deleteMutation.mutate(s.id, {
                      onSuccess: () => toast.success("ลบแล้ว"),
                      onError: (err) => toast.error(err.message),
                    })
                  }
                  disabled={deleteMutation.isPending}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
