"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface GraphUserResult {
  id: string;
  name: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
}

interface Props {
  label: string;
  value: GraphUserResult | null;
  onChange: (user: GraphUserResult | null) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

function useUserSearch(query: string) {
  const [results, setResults] = useState<GraphUserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ms-graph/users/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  return { results, loading };
}

export default function GraphUserPicker({ label, value, onChange, placeholder, required, error }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const { results, loading } = useUserSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function openDropdown() {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen(true);
  }

  function select(user: GraphUserResult) {
    onChange(user);
    setQuery("");
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {value ? (
        <div className="flex items-center gap-2.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F1059] text-white text-xs font-bold">
            {(value.name?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{value.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {value.jobTitle ? `${value.jobTitle} · ` : ""}
              {value.employeeId ? `#${value.employeeId} · ` : ""}
              {value.email}
            </p>
          </div>
          <button type="button" onClick={clear} className="shrink-0 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      ) : (
        <div className="relative" ref={containerRef}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); openDropdown(); }}
            onFocus={openDropdown}
            placeholder={placeholder ?? "ค้นหาชื่อ หรืออีเมล..."}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
          />
          {loading && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">...</span>
          )}

          {open && createPortal(
            <div
              ref={dropdownRef}
              style={dropdownStyle}
              className="rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden"
            >
              {results.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-gray-400 text-center">
                  {loading ? "กำลังค้นหา..." : query ? "ไม่พบผู้ใช้" : "พิมพ์เพื่อค้นหา"}
                </p>
              ) : (
                <ul className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                  {results.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => select(u)}
                        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs font-bold mt-0.5">
                          {(u.name?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {u.jobTitle ? `${u.jobTitle} · ` : ""}
                            {u.department ? `${u.department} · ` : ""}
                            {u.email}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>,
            document.body
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
