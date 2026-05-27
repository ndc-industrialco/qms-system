"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ReviewerUser {
  id: string;
  name: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
}

type SortKey = "name" | "department" | "jobTitle";

interface Props {
  open: boolean;
  isSending: boolean;
  onBack: () => void;
  onSend: (reviewer: ReviewerUser) => void;
}

const SORT_LABELS: Record<SortKey, string> = {
  name: "ชื่อ",
  department: "แผนก",
  jobTitle: "ตำแหน่ง",
};

export default function DarReviewerSelectModal({ open, isSending, onBack, onSend }: Props) {
  const [allUsers, setAllUsers] = useState<ReviewerUser[]>([]);
  const [selected, setSelected] = useState<ReviewerUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter / sort state
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("__all__");
  const [filterTitle, setFilterTitle] = useState<string>("__all__");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch users from API
  const fetchUsers = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const url = q.length > 0
        ? `/api/ms-graph/users/search?q=${encodeURIComponent(q)}`
        : `/api/ms-graph/users/search`;
      const res = await fetch(url, { signal: controller.signal });
      const json = await res.json() as { data: ReviewerUser[] | null; error: string | null };
      if (json.error) { setError(json.error); return; }
      setAllUsers(json.data ?? []);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("ไม่สามารถโหลดรายชื่อผู้ใช้ได้ กรุณาลองใหม่");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load full list on open; reset on close
  useEffect(() => {
    if (open) {
      void fetchUsers("");
    } else {
      setAllUsers([]);
      setSelected(null);
      setSearch("");
      setFilterDept("__all__");
      setFilterTitle("__all__");
      setSortBy("name");
      setError(null);
    }
  }, [open, fetchUsers]);

  // Debounced search — re-queries Graph when user types
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchUsers(search); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, open, fetchUsers]);

  // Unique department / jobTitle options from the current user list
  const departments = useMemo(() => {
    const set = new Set(allUsers.map((u) => u.department).filter(Boolean) as string[]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [allUsers]);

  const jobTitles = useMemo(() => {
    const set = new Set(allUsers.map((u) => u.jobTitle).filter(Boolean) as string[]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [allUsers]);

  // Filtered + sorted view
  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    let list = allUsers.filter((u) => {
      const matchSearch =
        q.length === 0 ||
        u.name.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.employeeId ?? "").toLowerCase().includes(q);
      const matchDept = filterDept === "__all__" || u.department === filterDept;
      const matchTitle = filterTitle === "__all__" || u.jobTitle === filterTitle;
      return matchSearch && matchDept && matchTitle;
    });

    list = [...list].sort((a, b) => {
      const av = (a[sortBy] ?? "").toLowerCase();
      const bv = (b[sortBy] ?? "").toLowerCase();
      return av.localeCompare(bv, "th");
    });

    return list;
  }, [allUsers, search, filterDept, filterTitle, sortBy]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSending) onBack(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>เลือกผู้ตรวจสอบ</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            ค้นหาและเลือกผู้ตรวจสอบสำหรับคำขอนี้
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Search */}
          <Input
            placeholder="ค้นหาชื่อ, อีเมล หรือรหัสพนักงาน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={isSending}
            autoFocus
          />

          {/* Filters + Sort */}
          <div className="grid grid-cols-3 gap-2">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              disabled={isSending || isLoading}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="__all__">ทุกแผนก</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              disabled={isSending || isLoading}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="__all__">ทุกตำแหน่ง</option>
              {jobTitles.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              disabled={isSending || isLoading}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>เรียงตาม{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-6">
              <span className="w-5 h-5 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <p className="text-sm text-rose-600 text-center py-2">{error}</p>
          )}

          {/* User list */}
          {!isLoading && !error && (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {displayed.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">ไม่พบผู้ใช้ที่ตรงกัน</p>
              ) : (
                displayed.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={isSending}
                    onClick={() => setSelected(r)}
                    className={[
                      "w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-3",
                      selected?.id === r.id ? "bg-emerald-50 border-l-2 border-l-emerald-500" : "",
                    ].join(" ")}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-semibold flex-shrink-0">
                      {(r.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                        {r.employeeId && (
                          <span className="text-xs text-slate-400 flex-shrink-0">#{r.employeeId}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {[r.jobTitle, r.department].filter(Boolean).join(" · ") || r.email}
                      </p>
                    </div>
                    {selected?.id === r.id && (
                      <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Result count */}
          {!isLoading && !error && allUsers.length > 0 && (
            <p className="text-xs text-slate-400 text-right -mt-1">
              {displayed.length} / {allUsers.length} รายการ
            </p>
          )}

          {/* Selected reviewer card */}
          {selected && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-semibold flex-shrink-0">
                {(selected.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">ผู้ตรวจสอบที่เลือก</p>
                <p className="text-sm font-semibold text-slate-800">
                  {selected.name}
                  {selected.employeeId && (
                    <span className="text-xs font-normal text-slate-400 ml-1.5">#{selected.employeeId}</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {[selected.jobTitle, selected.department].filter(Boolean).join(" · ") || selected.email}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onBack} disabled={isSending}>
            ย้อนกลับ
          </Button>
          <Button
            size="sm"
            disabled={!selected || isSending}
            onClick={() => selected && onSend(selected)}
          >
            {isSending && (
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-1" />
            )}
            ส่งคำขอ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
