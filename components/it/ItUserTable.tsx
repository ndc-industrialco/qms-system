"use client";

import { useState, useMemo, useRef } from "react";
import type { UserWithDept } from "@/types/user";
import type { UserRole } from "@/app/generated/prisma/edge";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/locale-context";
import Toast from "@/components/common/Toast";
import { useRouter } from "next/navigation";

const ROLE_LABELS_TH: Record<UserRole, string> = {
  USER: "ผู้ใช้งาน",
  QMS:  "เจ้าหน้าที่ QMS",
  MR:   "ผู้แทนฝ่ายบริหาร",
  IT:   "เจ้าหน้าที่ IT",
};
const ROLE_LABELS_EN: Record<UserRole, string> = {
  USER: "User",
  QMS:  "QMS Officer",
  MR:   "Management Rep.",
  IT:   "IT Officer",
};
const ROLE_BADGE: Record<UserRole, string> = {
  USER: "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-500",
  QMS:  "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-blue-100 text-blue-600",
  MR:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-amber-100 text-amber-700",
  IT:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-emerald-100 text-emerald-600",
};

type SortKey = "name" | "email" | "employeeId" | "role" | "department" | "createdAt";
type SortDir = "asc" | "desc";
type Department = { id: string; name: string };
type Props = { users: UserWithDept[]; departments: Department[] };

function IconSort({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
    </svg>
  );
  return dir === "asc" ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
function IconUpload({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconPencil({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function ItUserTable({ users, departments }: Props) {
  const locale = useLocale();
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();

  const ROLE_LABELS = locale === "th" ? ROLE_LABELS_TH : ROLE_LABELS_EN;

  const t = {
    searchLabel:        locale === "th" ? "ค้นหา"                                 : "Search",
    searchPlaceholder:  locale === "th" ? "ชื่อ, อีเมล, รหัสพนักงาน..."           : "Name, email, employee ID...",
    roleLabel:          locale === "th" ? "Role"                                   : "Role",
    allRoles:           locale === "th" ? "ทุก Role"                               : "All Roles",
    deptLabel:          locale === "th" ? "แผนก"                                   : "Department",
    allDepts:           locale === "th" ? "ทุกแผนก"                               : "All Departments",
    m365Label:          "M365",
    allM365:            locale === "th" ? "ทั้งหมด"                               : "All",
    m365Yes:            locale === "th" ? "เชื่อมแล้ว"                            : "Linked",
    m365No:             locale === "th" ? "ยังไม่เชื่อม"                          : "Not Linked",
    clearFilter:        locale === "th" ? "ล้างตัวกรอง"                           : "Clear Filters",
    countSuffix:        (n: number, total: number) =>
      locale === "th" ? `${n} / ${total} คน` : `${n} / ${total} users`,
    selectedCount:      (n: number) =>
      locale === "th" ? `เลือกแล้ว ${n} คน` : `${n} selected`,
    bulkUpdate:         (n: number) =>
      locale === "th" ? `อัปเดต M365 ทั้งหมดที่เลือก (${n} คน)` : `Update M365 for selected (${n})`,
    bulkUpdating:       locale === "th" ? "กำลังอัปเดต M365..."    : "Updating M365...",
    cancelSelect:       locale === "th" ? "ยกเลิก"                 : "Cancel",
    colName:            locale === "th" ? "ชื่อ"                   : "Name",
    colEmail:           locale === "th" ? "อีเมล"                  : "Email",
    colEmpId:           locale === "th" ? "รหัสพนักงาน"            : "Employee ID",
    colM365:            "M365",
    colRole:            "Role",
    colChangeRole:      locale === "th" ? "เปลี่ยน Role"           : "Change Role",
    colDept:            locale === "th" ? "แผนก"                   : "Department",
    colUpdateM365:      locale === "th" ? "อัปเดต M365"            : "Update M365",
    noUsers:            locale === "th" ? "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข" : "No users match the filter",
    noM365:             locale === "th" ? "ไม่มี M365"             : "No M365",
    unlinked:           "—",
    linked:             locale === "th" ? "เชื่อม"                 : "Linked",
    empIdNone:          locale === "th" ? "ไม่ระบุ"               : "None",
    empIdEdit:          locale === "th" ? "คลิกเพื่อแก้ไข"         : "Click to edit",
    noDept:             locale === "th" ? "— ไม่ระบุ —"            : "— None —",
    noDeptMobile:       locale === "th" ? "— ไม่ระบุแผนก —"        : "— No Department —",
    updateOk:           locale === "th" ? "อัปเดตข้อมูลสำเร็จ"     : "Updated successfully",
    updateFail:         locale === "th" ? "เกิดข้อผิดพลาด"          : "An error occurred",
    updateFailRetry:    locale === "th" ? "เกิดข้อผิดพลาด กรุณาลองใหม่" : "An error occurred, please try again",
    m365UpdateOk:       locale === "th" ? "อัปเดตไปยัง Microsoft 365 สำเร็จ" : "Synced to Microsoft 365",
    m365UpdateFail:     locale === "th" ? "อัปเดต M365 ไม่สำเร็จ"  : "M365 update failed",
    m365ConnectFail:    locale === "th" ? "ไม่สามารถเชื่อมต่อได้"   : "Connection failed",
    noM365Selected:     locale === "th" ? "ไม่มีผู้ใช้ที่เชื่อม M365 ในรายการที่เลือก" : "No M365-linked users in selection",
    bulkOk:             (ok: number) =>
      locale === "th" ? `อัปเดต ${ok} คน ไปยัง M365 สำเร็จ` : `Synced ${ok} user(s) to M365`,
    bulkPartial:        (ok: number, fail: number) =>
      locale === "th" ? `สำเร็จ ${ok} คน, ล้มเหลว ${fail} คน` : `${ok} succeeded, ${fail} failed`,
    sending:            locale === "th" ? "กำลังส่ง..."    : "Sending...",
    updateBtn:          locale === "th" ? "อัปเดต"         : "Update",
    successBtn:         locale === "th" ? "สำเร็จ"         : "Success",
    sendingMobile:      locale === "th" ? "กำลังส่ง M365..."       : "Sending to M365...",
    successMobile:      locale === "th" ? "M365 สำเร็จ"            : "M365 Success",
    updateMobile:       locale === "th" ? "อัปเดตไปยัง M365"       : "Update to M365",
    m365StatusYes:      locale === "th" ? "เชื่อมแล้ว"   : "Linked",
    m365StatusNo:       locale === "th" ? "ยังไม่เชื่อม"  : "Not linked",
    deptMobile:         locale === "th" ? "แผนก"           : "Dept.",
    checkboxTitle:      locale === "th" ? "เลือกทั้งหมดที่เชื่อม M365" : "Select all M365-linked",
  };

  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [pushingId, setPushingId]   = useState<string | null>(null);
  const [pushedIds, setPushedIds]   = useState<Set<string>>(new Set());

  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empIdDraft, setEmpIdDraft]     = useState("");
  const empIdRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPushing, setBulkPushing] = useState(false);

  const [search, setSearch]           = useState("");
  const [filterRole, setFilterRole]   = useState<UserRole | "">("");
  const [filterDept, setFilterDept]   = useState("");
  const [filterMs365, setFilterMs365] = useState<"" | "yes" | "no">("");

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (q && ![u.name, u.email, u.employeeId].join(" ").toLowerCase().includes(q)) return false;
      if (filterRole && u.role !== filterRole) return false;
      if (filterDept && u.department?.id !== filterDept) return false;
      if (filterMs365 === "yes" && !u.msUserId) return false;
      if (filterMs365 === "no" && u.msUserId) return false;
      return true;
    });
  }, [users, search, filterRole, filterDept, filterMs365]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string, vb: string;
      switch (sortKey) {
        case "name":       va = a.name ?? "";             vb = b.name ?? "";             break;
        case "email":      va = a.email;                  vb = b.email;                  break;
        case "employeeId": va = a.employeeId ?? "";       vb = b.employeeId ?? "";       break;
        case "role":       va = a.role;                   vb = b.role;                   break;
        case "department": va = a.department?.name ?? ""; vb = b.department?.name ?? ""; break;
        case "createdAt":  va = a.createdAt;              vb = b.createdAt;              break;
      }
      return sortDir === "asc" ? va.localeCompare(vb, "th") : vb.localeCompare(va, "th");
    });
  }, [filtered, sortKey, sortDir]);

  const m365Ids = useMemo(() => new Set(sorted.filter((u) => u.msUserId).map((u) => u.id)), [sorted]);
  const allChecked = m365Ids.size > 0 && [...m365Ids].every((id) => selected.has(id));

  function toggleAll() {
    setSelected((prev) => {
      const s = new Set(prev);
      if (allChecked) { m365Ids.forEach((id) => s.delete(id)); }
      else { m365Ids.forEach((id) => s.add(id)); }
      return s;
    });
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });
  }

  async function patchUser(userId: string, patch: { role?: UserRole; departmentId?: string | null; employeeId?: string | null }) {
    setPatchingId(userId);
    try {
      const res = await fetch(`/api/it/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok || json.error) { showToast("error", json.error ?? t.updateFail); return; }
      showToast("success", t.updateOk);
      router.refresh();
    } catch {
      showToast("error", t.updateFailRetry);
    } finally {
      setPatchingId(null);
    }
  }

  function startEditEmpId(userId: string, current: string | null) {
    setEditingEmpId(userId);
    setEmpIdDraft(current ?? "");
    setTimeout(() => empIdRef.current?.focus(), 30);
  }
  async function commitEmpId(userId: string) {
    const val = empIdDraft.trim();
    setEditingEmpId(null);
    const orig = users.find((u) => u.id === userId)?.employeeId ?? "";
    if (val === orig) return;
    await patchUser(userId, { employeeId: val || null });
  }

  async function pushToM365(userId: string) {
    setPushingId(userId);
    try {
      const res = await fetch(`/api/it/users/${userId}/push-to-m365`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) { showToast("error", json.error ?? t.m365UpdateFail); return; }
      showToast("success", t.m365UpdateOk);
      setPushedIds((p) => new Set(p).add(userId));
      setTimeout(() => setPushedIds((p) => { const s = new Set(p); s.delete(userId); return s; }), 2500);
    } catch {
      showToast("error", t.m365ConnectFail);
    } finally {
      setPushingId(null);
    }
  }

  async function bulkPush() {
    const ids = [...selected].filter((id) => m365Ids.has(id));
    if (!ids.length) { showToast("error", t.noM365Selected); return; }
    setBulkPushing(true);
    let ok = 0, fail = 0;
    await Promise.all(ids.map(async (id) => {
      try {
        const res = await fetch(`/api/it/users/${id}/push-to-m365`, { method: "POST" });
        const json = await res.json();
        if (res.ok && !json.error) { ok++; setPushedIds((p) => new Set(p).add(id)); }
        else fail++;
      } catch { fail++; }
    }));
    setBulkPushing(false);
    setSelected(new Set());
    showToast(
      fail === 0 ? "success" : "error",
      fail === 0 ? t.bulkOk(ok) : t.bulkPartial(ok, fail),
    );
    setTimeout(() => setPushedIds(new Set()), 3000);
  }

  const isBusy = (id: string) => patchingId === id || pushingId === id;
  const hasFilter = search || filterRole || filterDept || filterMs365;

  function thSort(label: string, colKey: SortKey) {
    return (
      <th className="py-3.5 px-4 font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(colKey)}>
        <span className="flex items-center gap-1">{label}<IconSort active={sortKey === colKey} dir={sortDir} /></span>
      </th>
    );
  }

  return (
    <>
      {/* Filter bar */}
      <div className="card-premium px-5 py-4 mb-6 border border-base-300 rounded-xl shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-44">
          <label className="text-[11px] text-gray-500 mb-1 block">{t.searchLabel}</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </span>
            <input
              type="text"
              className="input input-bordered input-sm pl-9 w-full text-[13px]"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="min-w-40">
          <label className="text-[11px] text-gray-500 mb-1 block">{t.roleLabel}</label>
          <select className="select select-bordered select-sm w-full text-[13px]" value={filterRole} onChange={(e) => setFilterRole(e.target.value as UserRole | "")}>
            <option value="">{t.allRoles}</option>
            {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="min-w-44">
          <label className="text-[11px] text-gray-500 mb-1 block">{t.deptLabel}</label>
          <select className="select select-bordered select-sm w-full text-[13px]" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="">{t.allDepts}</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="min-w-36">
          <label className="text-[11px] text-gray-500 mb-1 block">{t.m365Label}</label>
          <select className="select select-bordered select-sm w-full text-[13px]" value={filterMs365} onChange={(e) => setFilterMs365(e.target.value as "" | "yes" | "no")}>
            <option value="">{t.allM365}</option>
            <option value="yes">{t.m365Yes}</option>
            <option value="no">{t.m365No}</option>
          </select>
        </div>
        {hasFilter && (
          <button
            className="btn btn-ghost btn-sm text-[13px] self-end"
            onClick={() => { setSearch(""); setFilterRole(""); setFilterDept(""); setFilterMs365(""); }}
          >
            {t.clearFilter}
          </button>
        )}
        <div className="self-end ml-auto text-[11px] md:text-xs text-gray-500 whitespace-nowrap">
          {t.countSuffix(sorted.length, users.length)}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 mb-6 flex items-center gap-3 flex-wrap">
          <span className="text-[13px] text-primary font-medium">{t.selectedCount(selected.size)}</span>
          <button className="btn btn-primary btn-sm gap-2 ml-auto" onClick={bulkPush} disabled={bulkPushing}>
            {bulkPushing
              ? <><span className="loading loading-spinner loading-xs" />{t.bulkUpdating}</>
              : <><IconUpload className="w-4 h-4" />{t.bulkUpdate([...selected].filter((id) => m365Ids.has(id)).length)}</>
            }
          </button>
          <button className="btn btn-ghost btn-sm text-[13px]" onClick={() => setSelected(new Set())}>{t.cancelSelect}</button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block card-premium overflow-x-auto border border-base-300 rounded-xl shadow-sm">
        <table className="table w-full">
          <thead>
            <tr className="bg-base-200 text-xs text-gray-500 border-b border-base-200">
              <th className="py-3.5 px-3 w-10">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={allChecked}
                  disabled={m365Ids.size === 0}
                  onChange={toggleAll}
                  title={t.checkboxTitle}
                />
              </th>
              {thSort(t.colName, "name")}
              {thSort(t.colEmail, "email")}
              {thSort(t.colEmpId, "employeeId")}
              <th className="py-3.5 px-4 font-semibold whitespace-nowrap">{t.colM365}</th>
              {thSort(t.colRole, "role")}
              <th className="py-3.5 px-4 font-semibold whitespace-nowrap">{t.colChangeRole}</th>
              {thSort(t.colDept, "department")}
              <th className="py-3.5 px-4 font-semibold text-center whitespace-nowrap">{t.colUpdateM365}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-xs md:text-sm text-gray-500">{t.noUsers}</td></tr>
            ) : sorted.map((user) => (
              <tr key={user.id} className={`border-b border-base-200 transition-colors duration-100 ${selected.has(user.id) ? "bg-primary/5" : "hover:bg-base-200"}`}>
                <td className="py-3.5 px-3">
                  {user.msUserId
                    ? <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={selected.has(user.id)} onChange={() => toggleOne(user.id)} />
                    : <span className="w-4 h-4 block" />}
                </td>

                <td className="py-3 px-4 text-xs md:text-sm font-semibold">{user.name ?? "—"}</td>
                <td className="py-3 px-4 text-[11px] md:text-xs text-gray-500">{user.email}</td>

                {/* Inline employeeId */}
                <td className="py-3.5 px-4">
                  {editingEmpId === user.id ? (
                    <input
                      ref={empIdRef}
                      type="text"
                      className="input input-bordered input-xs w-24 text-[13px]"
                      value={empIdDraft}
                      maxLength={16}
                      onChange={(e) => setEmpIdDraft(e.target.value)}
                      onBlur={() => commitEmpId(user.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEmpId(user.id);
                        if (e.key === "Escape") setEditingEmpId(null);
                      }}
                    />
                  ) : (
                    <button
                      className="flex items-center gap-1 group text-neutral hover:text-base-content"
                      onClick={() => startEditEmpId(user.id, user.employeeId)}
                      disabled={isBusy(user.id)}
                      title={t.empIdEdit}
                    >
                      <span className="text-[13px]">
                        {user.employeeId ?? <span className="italic opacity-40">{t.empIdNone}</span>}
                      </span>
                      <IconPencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </button>
                  )}
                </td>

                {/* M365 status */}
                <td className="py-3.5 px-4">
                  {user.msUserId
                    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-emerald-100 text-emerald-600"><IconCheck className="w-3 h-3" />{t.linked}</span>
                    : <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-500">{t.unlinked}</span>}
                </td>

                {/* Role badge */}
                <td className="py-3.5 px-4">
                  <span className={ROLE_BADGE[user.role]}>{ROLE_LABELS[user.role]}</span>
                </td>

                {/* Change role */}
                <td className="py-3.5 px-4">
                  <select
                    className="select select-bordered select-xs text-[13px]"
                    value={user.role}
                    disabled={isBusy(user.id)}
                    onChange={(e) => patchUser(user.id, { role: e.target.value as UserRole })}
                  >
                    {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>

                {/* Change dept */}
                <td className="py-3.5 px-4">
                  <select
                    className="select select-bordered select-xs text-[13px] min-w-32.5"
                    value={user.department?.id ?? ""}
                    disabled={isBusy(user.id)}
                    onChange={(e) => patchUser(user.id, { departmentId: e.target.value || null })}
                  >
                    <option value="">{t.noDept}</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </td>

                {/* Push to M365 */}
                <td className="py-3 px-4 text-center">
                  {user.msUserId ? (
                    <button
                      className={`btn btn-xs gap-1 ${pushedIds.has(user.id) ? "btn-success" : "btn-outline btn-primary"}`}
                      disabled={isBusy(user.id) || bulkPushing}
                      onClick={() => pushToM365(user.id)}
                      title={t.m365UpdateOk}
                    >
                      {pushingId === user.id ? <span className="loading loading-spinner loading-xs" />
                        : pushedIds.has(user.id) ? <IconCheck className="w-3.5 h-3.5" />
                        : <IconUpload className="w-3.5 h-3.5" />}
                      {pushingId === user.id ? t.sending
                        : pushedIds.has(user.id) ? t.successBtn
                        : t.updateBtn}
                    </button>
                  ) : (
                    <span className="text-[12px] text-neutral opacity-40">{t.noM365}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {sorted.length === 0 ? (
          <div className="text-center py-10 text-xs md:text-sm text-gray-500">{t.noUsers}</div>
        ) : sorted.map((user) => (
          <div key={user.id} className={`card-premium p-4 border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${selected.has(user.id) ? "border-primary" : "border-base-300"}`}>
            <div className="flex items-start gap-2 mb-1">
              {user.msUserId && (
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary mt-0.5 shrink-0"
                  checked={selected.has(user.id)}
                  onChange={() => toggleOne(user.id)}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs md:text-sm font-semibold text-neutral truncate">{user.name ?? "—"}</p>
                  <span className={`shrink-0 ${ROLE_BADGE[user.role]}`}>{ROLE_LABELS[user.role]}</span>
                </div>
                <p className="text-[11px] md:text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* Employee ID inline */}
            <div className="flex items-center gap-2 my-2">
              <span className="text-[12px] text-neutral w-24 shrink-0">{t.colEmpId}:</span>
              {editingEmpId === user.id ? (
                <input
                  ref={empIdRef}
                  type="text"
                  className="input input-bordered input-xs flex-1 text-[13px]"
                  value={empIdDraft}
                  maxLength={16}
                  onChange={(e) => setEmpIdDraft(e.target.value)}
                  onBlur={() => commitEmpId(user.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEmpId(user.id);
                    if (e.key === "Escape") setEditingEmpId(null);
                  }}
                />
              ) : (
                <button className="flex items-center gap-1" onClick={() => startEditEmpId(user.id, user.employeeId)}>
                  <span className="text-[13px]">
                    {user.employeeId ?? <span className="italic text-neutral opacity-50">{t.empIdNone}</span>}
                  </span>
                  <IconPencil className="w-3 h-3 text-neutral opacity-50" />
                </button>
              )}
            </div>

            <p className="text-[12px] text-neutral mb-3">
              {t.m365Label}: {user.msUserId
                ? <span className="text-success">{t.m365StatusYes}</span>
                : t.m365StatusNo}
              {user.department && <> · {t.deptMobile}: {user.department.name}</>}
            </p>

            <div className="flex flex-col gap-2">
              <select
                className="select select-bordered select-sm w-full text-[13px]"
                value={user.role}
                disabled={isBusy(user.id)}
                onChange={(e) => patchUser(user.id, { role: e.target.value as UserRole })}
              >
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select
                className="select select-bordered select-sm w-full text-[13px]"
                value={user.department?.id ?? ""}
                disabled={isBusy(user.id)}
                onChange={(e) => patchUser(user.id, { departmentId: e.target.value || null })}
              >
                <option value="">{t.noDeptMobile}</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {user.msUserId && (
                <button
                  className={`btn btn-sm w-full gap-2 ${pushedIds.has(user.id) ? "btn-success" : "btn-outline btn-primary"}`}
                  disabled={isBusy(user.id) || bulkPushing}
                  onClick={() => pushToM365(user.id)}
                >
                  {pushingId === user.id
                    ? <><span className="loading loading-spinner loading-xs" />{t.sendingMobile}</>
                    : pushedIds.has(user.id)
                    ? <><IconCheck className="w-4 h-4" />{t.successMobile}</>
                    : <><IconUpload className="w-4 h-4" />{t.updateMobile}</>}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={hideToast} />}
    </>
  );
}
