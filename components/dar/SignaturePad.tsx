"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { SignatureType } from "@/types/dar";

interface Props {
  onConfirm: (dataUrl: string, type: SignatureType) => void;
  onCancel: () => void;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
}

type Mode = "DRAW" | "TYPE" | "IMAGE";

const CANVAS_W = 500;
const CANVAS_H = 160;

// ── Draw mode ─────────────────────────────────────────────────────────────────
function DrawPad({ onChange }: { onChange: (url: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasContent = useRef(false);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.preventDefault();
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f1059";
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasContent.current = true;
    e.preventDefault();
  }

  function stopDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(hasContent.current ? canvas.toDataURL("image/png") : null);
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    hasContent.current = false;
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full border border-base-300 rounded-lg bg-base-100 cursor-crosshair touch-none"
        style={{ maxHeight: 160 }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs self-end text-neutral"  type="button"   onClick={clear}>
        ล้างลายมือชื่อ
      </Button>
    </div>
  );
}

// ── Type mode ─────────────────────────────────────────────────────────────────
const TYPE_FONTS = [
  { label: "สคริปต์", value: "Dancing Script, cursive" },
  { label: "สไตล์", value: "Pacifico, cursive" },
  { label: "ตัวเอียง", value: "Great Vibes, cursive" },
];

function TypePad({ onChange }: { onChange: (url: string | null) => void }) {
  const [text, setText] = useState("");
  const [font, setFont] = useState(TYPE_FONTS[0].value);

  const renderToCanvas = useCallback(
    (t: string, f: string): string | null => {
      if (!t.trim()) return null;
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#0f1059";
      ctx.font = `48px ${f}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t, CANVAS_W / 2, CANVAS_H / 2);
      return canvas.toDataURL("image/png");
    },
    [],
  );

  useEffect(() => {
    onChange(renderToCanvas(text, font));
  }, [text, font, onChange, renderToCanvas]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="พิมพ์ชื่อของคุณ"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={40}
      />
      <div className="flex gap-2 flex-wrap">
        {TYPE_FONTS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFont(f.value)}
            className={`h-8 px-3 text-xs rounded-md font-medium transition-colors ${font === f.value ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            <span style={{ fontFamily: f.value }}>{text || "ตัวอย่าง"}</span>
          </button>
        ))}
      </div>
      {text.trim() && (
        <div
          className="w-full border border-base-300 rounded-lg bg-base-100 flex items-center justify-center"
          style={{ height: 100 }}
        >
          <span style={{ fontFamily: font, fontSize: 40 }} className="text-primary">{text}</span>
        </div>
      )}
    </div>
  );
}

// ── Image upload mode ─────────────────────────────────────────────────────────
function ImagePad({ onChange }: { onChange: (url: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("ไฟล์ต้องมีขนาดไม่เกิน 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPreview(url);
      onChange(url);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-base-300 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors duration-150 bg-base-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-neutral mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span className="text-[14px] text-neutral">คลิกเพื่ออัปโหลดรูปลายมือชื่อ</span>
        <span className="text-[12px] text-neutral opacity-60 mt-1">PNG, JPG — ไม่เกิน 2MB</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {preview && (
        <div className="border border-base-300 rounded-lg bg-base-100 p-3 flex items-center justify-center" style={{ height: 120 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="ลายมือชื่อ" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SignaturePad({ onConfirm, onCancel, savedSignatureUrl, savedSignatureType }: Props) {
  const [mode, setMode] = useState<Mode>("DRAW");
  const [pending, setPending] = useState<string | null>(null);
  const [saveToProfile, setSaveToProfile] = useState(false);

  const handleConfirm = () => {
    if (!pending) return;
    onConfirm(pending, mode);
  };

  const tabs: { key: Mode; label: string }[] = [
    { key: "DRAW", label: "วาดลายมือชื่อ" },
    { key: "TYPE", label: "พิมพ์ชื่อ" },
    { key: "IMAGE", label: "อัปโหลดรูป" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Saved signature shortcut */}
      {savedSignatureUrl && (
        <div className="bg-base-200 rounded-lg p-3 flex items-center gap-3">
          <div className="bg-base-100 border border-base-300 rounded-lg p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={savedSignatureUrl} alt="ลายมือชื่อที่บันทึก" className="h-10 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-base-content font-medium">ใช้ลายมือชื่อที่บันทึกไว้</p>
            <p className="text-[12px] text-neutral">ประเภท: {savedSignatureType}</p>
          </div>
          <Button size="sm" className="" 
            type="button"
             
            onClick={() => {
              if (savedSignatureType) onConfirm(savedSignatureUrl, savedSignatureType);
            }}
          >
            ใช้เลย
          </Button>
        </div>
      )}

      {/* Mode tabs */}
      <div className="tabs tabs-boxed bg-base-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab text-[14px] ${mode === t.key ? "tab-active" : ""}`}
            onClick={() => { setMode(t.key); setPending(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Mode content */}
      <div>
        {mode === "DRAW" && <DrawPad onChange={setPending} />}
        {mode === "TYPE" && <TypePad onChange={setPending} />}
        {mode === "IMAGE" && <ImagePad onChange={setPending} />}
      </div>

      {/* Save to profile checkbox */}
      <label className="flex items-center gap-2 cursor-pointer select-none text-[14px]">
        <input
          type="checkbox"
          className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500"
          checked={saveToProfile}
          onChange={(e) => setSaveToProfile(e.target.checked)}
        />
        บันทึกลายมือชื่อนี้ไว้สำหรับครั้งถัดไป
      </label>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-base-300">
        <Button variant="ghost" size="sm" className=""  type="button"   onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button size="sm" className="" 
          type="button"
           
          disabled={!pending}
          onClick={handleConfirm}
        >
          ยืนยันลายมือชื่อ
        </Button>
      </div>
    </div>
  );
}
