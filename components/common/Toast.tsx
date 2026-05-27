"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error";

type Props = {
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
};

export default function Toast({ type, message, onClose, duration = 4000 }: Props) {
  useEffect(() => {
    // duration === 0 → no auto-dismiss (used for errors per design spec)
    if (duration === 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);


  const icon =
    type === "success" ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );

  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 shadow-md rounded-xl border text-sm max-w-sm w-full ${type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
        {icon}
        <span className="flex-1 font-medium">{message}</span>
        <button onClick={onClose} className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity hover:bg-black/5" aria-label="Close">✕</button>
      </div>
    </div>,
    document.body,
  );
}
