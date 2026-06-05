"use client";

import { useT } from "@/lib/i18n";

export function EmptyState({ label }: { label: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
        <span className="text-slate-400 text-xl">○</span>
      </div>
      <p className="text-slate-800 font-semibold text-base mb-1">{t("common.noItems")}</p>
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
  );
}
