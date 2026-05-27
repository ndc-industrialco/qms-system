"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

const BG_PRESETS = [
  "#0F1059", "#1D6A8A", "#065F46", "#7C2D12",
  "#4C1D95", "#831843", "#1E3A5F", "#374151",
];

const TEXT_PRESETS = [
  "#FFFFFF", "#F8FAFC", "#FEF3C7", "#E0F2FE",
  "#1F2937", "#0F1059", "#7DD3FC", "#34D399",
];

type Tab = "color" | "image";

type Props = {
  bgColor: string;
  bgImageUrl: string | null;
  bgImageFile: File | null;
  textColor: string;
  onColorChange: (color: string) => void;
  onImageChange: (file: File | null) => void;
  onTextColorChange: (color: string) => void;
  isTh: boolean;
};

function Swatches({ presets, active, onChange }: { presets: string[]; active: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className="w-7 h-7 rounded-md border border-base-300 transition-transform hover:scale-110"
          style={{ background: c, outline: active === c ? `2px solid #1D6A8A` : "2px solid transparent", outlineOffset: 2 }} />
      ))}
      <label className="w-7 h-7 rounded-md border-2 border-dashed border-base-300 cursor-pointer flex items-center justify-center hover:border-primary transition-colors overflow-hidden relative">
        <span className="text-[9px] text-gray-400">+</span>
        <input type="color" value={active} onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </label>
    </div>
  );
}

export default function AnnouncementBgPicker({ bgColor, bgImageUrl, bgImageFile, textColor, onColorChange, onImageChange, onTextColorChange, isTh }: Props) {
  const [tab, setTab] = useState<Tab>(bgImageUrl || bgImageFile ? "image" : "color");
  const previewBg = tab === "image" ? (bgImageFile ? URL.createObjectURL(bgImageFile) : bgImageUrl) : bgColor;

  return (
    <div className="flex flex-col gap-4 p-3 bg-base-200/50 rounded-xl border border-base-300">
      {/* Background */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {isTh ? "พื้นหลัง" : "Background"}
        </label>
        <div className="flex rounded-lg border border-base-300 overflow-hidden w-fit">
          {(["color", "image"] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${tab === t ? "bg-primary text-white" : "bg-white text-gray-500 hover:bg-base-200"}`}>
              {t === "color" ? (isTh ? "สี" : "Color") : (isTh ? "รูปภาพ" : "Image")}
            </button>
          ))}
        </div>

        {tab === "color" && (
          <div className="flex flex-col gap-2">
            <Swatches presets={BG_PRESETS} active={bgColor} onChange={onColorChange} />
            <div className="h-8 rounded-lg border border-base-300 transition-all duration-300" style={{ background: bgColor }} />
          </div>
        )}

        {tab === "image" && (
          <div className="flex flex-col gap-2">
            <Input type="file" accept="image/*" className="w-full text-sm pt-1"
              onChange={(e) => onImageChange(e.target.files?.[0] ?? null)} />
            {(bgImageFile || bgImageUrl) ? (
              <div className="relative h-16 rounded-lg border border-base-300 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewBg ?? ""} alt="bg" className="w-full h-full object-cover" />
                <button type="button" onClick={() => onImageChange(null)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center hover:bg-black/80">✕</button>
              </div>
            ) : (
              <div className="h-8 rounded-lg border border-dashed border-base-300 flex items-center justify-center">
                <span className="text-[11px] text-gray-400">{isTh ? "ยังไม่มีรูปภาพ" : "No image"}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text color */}
      <div className="flex flex-col gap-2 pt-3 border-t border-base-300">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {isTh ? "สีตัวอักษร" : "Text Color"}
        </label>
        <Swatches presets={TEXT_PRESETS} active={textColor} onChange={onTextColorChange} />
        <div className="h-8 rounded-lg border border-base-300 flex items-center justify-center text-sm font-semibold transition-all duration-300"
          style={{ background: bgColor, color: textColor }}>
          {isTh ? "ตัวอย่างข้อความ" : "Preview text"}
        </div>
      </div>
    </div>
  );
}
