"use client";

import { useMemo } from "react";
import type { UserWithDept } from "@/types/user";
import { useRouter } from "next/navigation";
import MrUserRow from "@/components/qms/MrUserRow";
import Toast from "@/components/common/Toast";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/locale-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useState } from "react";

type Props = { initialUsers: UserWithDept[] };

export default function MrManagementClient({ initialUsers }: Props) {
  const locale = useLocale();
  const isTh = locale === "th";
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const mrUsers = useMemo(() => initialUsers.filter((u) => u.role === "MR"), [initialUsers]);

  // ── URL-bound search (debounced) ───────────────────────────────────────────
  const { params, rawValues, setParam } = useUrlFilters({
    keys: ["search"] as const,
    searchKey: "search",
    debounceMs: 300,
  });

  const filtered = useMemo(() => {
    const q = params.search.toLowerCase().trim();
    if (!q) return initialUsers;
    return initialUsers.filter((u) =>
      [u.name, u.email, u.department?.name].join(" ").toLowerCase().includes(q),
    );
  }, [initialUsers, params.search]);

  async function handleToggle(userId: string, newRole: "MR" | "USER") {
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/qms/mr/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        showToast("error", json.error ?? (isTh ? "เกิดข้อผิดพลาด" : "An error occurred"));
        return;
      }
      showToast("success", isTh ? "อัปเดตสำเร็จ" : "Updated successfully");
      router.refresh();
    } catch {
      showToast("error", isTh ? "เกิดข้อผิดพลาด" : "An error occurred");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title={isTh ? "กำหนดผู้แทนฝ่ายบริหาร (MR)" : "Set Management Representative (MR)"}
        subtitle={isTh ? "กำหนดสิทธิ์ MR ให้กับผู้ใช้ในระบบ" : "Assign MR role to users in the system"}
        actions={
          <span className="flex items-center gap-2">
            <span className="text-[11px] text-neutral">{isTh ? "MR ปัจจุบัน" : "Current MR"}:</span>
            <span className="px-2.5 py-1 text-[12px] font-bold rounded-full bg-warning/15 text-warning">
              {mrUsers.length} {isTh ? "คน" : "user(s)"}
            </span>
          </span>
        }
      />

      {/* Current MR highlight */}
      {mrUsers.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl px-5 py-4">
          <p className="text-[12px] font-bold text-warning mb-3">
            {isTh ? "ผู้แทนฝ่ายบริหาร (MR) ปัจจุบัน" : "Current Management Representatives"}
          </p>
          <div className="flex flex-wrap gap-2">
            {mrUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-2 bg-white border border-warning/30 rounded-lg px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-warning/20 text-warning flex items-center justify-center text-[10px] font-bold shrink-0">
                  {(u.name ?? u.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-neutral">{u.name ?? u.email}</p>
                  {u.department && <p className="text-[10px] text-gray-400">{u.department.name}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <FilterBar
        searchValue={rawValues.search}
        onSearchChange={(v) => setParam("search", v)}
        searchPlaceholder={isTh ? "ค้นหาชื่อ, อีเมล, แผนก..." : "Search name, email, department..."}
        resultCount={filtered.length}
        totalCount={initialUsers.length}
        countLabel={isTh ? "คน" : "users"}
      />

      {/* Table */}
      <div className="card-premium overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isTh ? "ชื่อ" : "Name"}</TableHead>
                <TableHead className="hidden md:table-cell">{isTh ? "อีเมล" : "Email"}</TableHead>
                <TableHead className="hidden md:table-cell">{isTh ? "แผนก" : "Department"}</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">{isTh ? "การจัดการ" : "Action"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-400">
                    {isTh ? "ไม่พบผู้ใช้" : "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <MrUserRow
                    key={user.id}
                    user={user}
                    onToggle={handleToggle}
                    loading={loadingId === user.id}
                    isTh={isTh}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
          duration={toast.type === "error" ? 0 : 4000}
        />
      )}
    </div>
  );
}
