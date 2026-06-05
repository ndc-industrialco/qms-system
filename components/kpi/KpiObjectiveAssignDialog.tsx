"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X, Loader2, User } from "lucide-react";

interface ReviewerCandidate {
  id: string;
  name: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReviewerId?: string;
  initialApproverId?: string;
  onConfirm: (reviewerUserId: string, approverUserId: string) => Promise<void>;
}

function useUserSearch(query: string) {
  const [results, setResults] = useState<ReviewerCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
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
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  return { results, loading };
}

interface UserPickerProps {
  label: string;
  value: ReviewerCandidate | null;
  onChange: (user: ReviewerCandidate | null) => void;
}

function UserPicker({ label, value, onChange }: UserPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, loading } = useUserSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = results;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function select(user: ReviewerCandidate) {
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
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-slate-700">{label}</p>

      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/30 bg-primary/5">
          <div className="w-7 h-7 rounded-full bg-[#0F1059] flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{value.name}</p>
            <p className="text-xs text-slate-400 truncate">
              {value.employeeId ? `${value.employeeId} · ` : ""}{value.email}
            </p>
          </div>
          <button onClick={clear} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="ชื่อ หรือ รหัสพนักงาน..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>

          {open && (
            <div
              ref={dropdownRef}
              className="absolute z-[9999] top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
            >
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400 text-center">
                  {loading ? "กำลังค้นหา..." : "ไม่พบผู้ใช้"}
                </p>
              ) : (
                <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                  {filtered.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                      onMouseDown={(e) => { e.preventDefault(); select(u); }}
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {u.employeeId ? `${u.employeeId} · ` : ""}{u.jobTitle ?? u.email}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KpiObjectiveAssignDialog({
  open,
  onOpenChange,
  initialReviewerId,
  initialApproverId,
  onConfirm,
}: Props) {
  const t = useT();
  const [reviewer, setReviewer] = useState<ReviewerCandidate | null>(null);
  const [approver, setApprover] = useState<ReviewerCandidate | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-fill if IDs are provided (edit flow)
  const prefilled = useRef(false);
  useEffect(() => {
    if (!open) { prefilled.current = false; return; }
    if (prefilled.current) return;
    if (!initialReviewerId && !initialApproverId) return;
    prefilled.current = true;

    async function prefillUsers() {
      try {
        const res = await fetch(`/api/ms-graph/users/search?q=`);
        const json: { data: ReviewerCandidate[] } = await res.json();
        const users: ReviewerCandidate[] = json.data ?? [];
        if (initialReviewerId) setReviewer(users.find((u) => u.id === initialReviewerId) ?? null);
        if (initialApproverId) setApprover(users.find((u) => u.id === initialApproverId) ?? null);
      } catch {}
    }

    void prefillUsers();
  }, [open, initialReviewerId, initialApproverId]);

  const handleClose = useCallback((v: boolean) => {
    if (!v) { setReviewer(null); setApprover(null); }
    onOpenChange(v);
  }, [onOpenChange]);

  async function submit() {
    if (!reviewer || !approver) return;
    setSaving(true);
    try {
      await onConfirm(reviewer.id, approver.id);
      handleClose(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-2xl overflow-visible">
        <DialogHeader>
          <DialogTitle>{t("kpi.submit.assignTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <UserPicker
            label={t("kpi.form.reviewer")}
            value={reviewer}
            onChange={setReviewer}
          />
          <UserPicker
            label={t("kpi.form.approver")}
            value={approver}
            onChange={setApprover}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => handleClose(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button
            className="rounded-xl bg-[#0F1059] hover:bg-[#161875]"
            onClick={submit}
            disabled={saving || !reviewer || !approver}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
