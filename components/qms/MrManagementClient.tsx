"use client";

import { useState, useMemo } from "react";
import type { UserWithDept } from "@/types/user";
import { useRouter } from "next/navigation";
import MrUserRow from "@/components/qms/MrUserRow";
import Toast from "@/components/common/Toast";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/locale-context";

type Props = { initialUsers: UserWithDept[] };

export default function MrManagementClient({ initialUsers }: Props) {
  const locale = useLocale();
  const isTh = locale === "th";
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const mrUsers = useMemo(() => initialUsers.filter((u) => u.role === "MR"), [initialUsers]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return initialUsers;
    return initialUsers.filter((u) =>
      [u.name, u.email, u.department?.name].join(" ").toLowerCase().includes(q)
    );
  }, [initialUsers, search]);

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
      <div className="bg-white border border-base-300 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-primary">
            {isTh ? "กำหนดผู้แทนฝ่ายบริหาร (MR)" : "Set Management Representative (MR)"}
          </h1>
          <p className="text-[12px] text-gray-500 mt-0.5">
            {isTh ? "กำหนดสิทธิ์ MR ให้กับผู้ใช้ในระบบ" : "Assign MR role to users in the system"}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[11px] text-gray-400">{isTh ? "MR ปัจจุบัน" : "Current MR"}:</span>
          <span className="px-2.5 py-1 text-[12px] font-bold rounded-full bg-warning/15 text-warning">
            {mrUsers.length} {isTh ? "คน" : "user(s)"}
          </span>
        </div>
      </div>

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

      {/* Search + table */}
      <div className="bg-white border border-base-300 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-base-200">
          <div className="relative max-w-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth="2" /><path d="m21 21-4.3-4.3" strokeWidth="2" />
            </svg>
            <input
              type="text"
              className="input input-bordered input-sm pl-9 w-full text-[13px]"
              placeholder={isTh ? "ค้นหาชื่อ, อีเมล, แผนก..." : "Search name, email, department..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="border-b border-base-200">
                <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wide">{isTh ? "ชื่อ" : "Name"}</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">{isTh ? "อีเมล" : "Email"}</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">{isTh ? "แผนก" : "Department"}</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="py-3 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wide">{isTh ? "การจัดการ" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">{isTh ? "ไม่พบผู้ใช้" : "No users found"}</td></tr>
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
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast type={toast.type} message={toast.message} onClose={hideToast} />}
    </div>
  );
}
