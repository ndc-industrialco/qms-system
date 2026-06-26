"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface GraphGroupResult {
  id: string;
  displayName: string;
  mail: string | null;
  description: string | null;
}

interface Props {
  label: string;
  value: GraphGroupResult[];
  onChange: (groups: GraphGroupResult[]) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

function useGroupSearch(query: string) {
  const [results, setResults] = useState<GraphGroupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ms-graph/groups/search?q=${encodeURIComponent(query)}`);
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

export default function GraphGroupPicker({ label, value, onChange, placeholder, required, error }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const { results, loading } = useGroupSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!inputRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [open]);

  function add(group: GraphGroupResult) {
    if (value.some((g) => g.mail === group.mail && g.id === group.id)) return;
    onChange([...value, group]);
    setQuery("");
    setOpen(false);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  // Filter out already-selected groups from results
  const filteredResults = results.filter((r) => !value.some((g) => g.mail === r.mail && g.id === r.id));

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Selected groups as chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {value.map((g, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-2.5 py-1">
              <span className="text-xs font-semibold text-gray-900">{g.displayName}</span>
              {g.mail && <span className="text-xs text-gray-500 font-mono">&lt;{g.mail}&gt;</span>}
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-gray-400 hover:text-gray-600 ml-0.5 leading-none"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input — always shown to allow adding more */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(!!e.target.value.trim()); }}
          placeholder={placeholder ?? "ค้นหากลุ่ม Email MS365..."}
          autoComplete="off"
          autoCorrect="off"
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
            {filteredResults.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-gray-400 text-center">
                {loading ? "กำลังค้นหา..." : query ? "ไม่พบกลุ่ม" : "พิมพ์เพื่อค้นหากลุ่ม"}
              </p>
            ) : (
              <ul className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                {filteredResults.map((g) => (
                  <li key={g.id || g.mail}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); add(g); }}
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-green-50 transition-colors"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-xs font-bold mt-0.5">
                        @
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{g.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{g.mail ?? "ไม่มีอีเมล"}</p>
                        {g.description && <p className="text-xs text-gray-400 truncate">{g.description}</p>}
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

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
