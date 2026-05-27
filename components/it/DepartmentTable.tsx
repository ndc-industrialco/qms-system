"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DepartmentRow } from "@/types/department";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/locale-context";
import Toast from "@/components/common/Toast";
import ConfirmModal from "@/components/common/ConfirmModal";
import DepartmentModal from "@/components/it/DepartmentModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";

type Props = { departments: DepartmentRow[] };

export default function DepartmentTable({ departments }: Props) {
  const locale = useLocale();
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<DepartmentRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDept, setConfirmDept] = useState<DepartmentRow | null>(null);

  const t = {
    title: locale === "th" ? "จัดการแผนก" : "Manage Departments",
    description: (n: number) =>
      locale === "th"
        ? `แผนกทั้งหมดในระบบ (${n} แผนก)`
        : `All departments in system (${n})`,
    addDept: locale === "th" ? "เพิ่มแผนก" : "Add Department",
    colName: locale === "th" ? "ชื่อแผนก" : "Department Name",
    colEmail: locale === "th" ? "อีเมลกลุ่ม" : "Group Email",
    colUsers: locale === "th" ? "จำนวนผู้ใช้" : "Users",
    colStatus: locale === "th" ? "สถานะ" : "Status",
    colActions: locale === "th" ? "จัดการ" : "Actions",
    active: locale === "th" ? "ใช้งาน" : "Active",
    inactive: locale === "th" ? "ปิดใช้งาน" : "Inactive",
    edit: locale === "th" ? "แก้ไข" : "Edit",
    delete: locale === "th" ? "ลบ" : "Delete",
    users: (n: number) => locale === "th" ? `${n} คน` : `${n} user(s)`,
    usersLink: (n: number) => locale === "th" ? `ผู้ใช้: ${n} คน →` : `Users: ${n} →`,
    cantDelete: (n: number) =>
      locale === "th"
        ? `ไม่สามารถลบแผนกที่มีผู้ใช้งาน ${n} คน`
        : `Cannot delete department with ${n} user(s)`,
    confirmTitle: locale === "th" ? "ยืนยันการลบ" : "Confirm Delete",
    confirmMsg: (name: string) =>
      locale === "th"
        ? `ต้องการลบแผนก "${name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
        : `Delete department "${name}"? This action cannot be undone.`,
    confirmYes: locale === "th" ? "ลบ" : "Delete",
    confirmNo: locale === "th" ? "ยกเลิก" : "Cancel",
    deleteOk: locale === "th" ? "ลบแผนกสำเร็จ" : "Department deleted",
    addOk: locale === "th" ? "เพิ่มแผนกสำเร็จ" : "Department added",
    editOk: locale === "th" ? "แก้ไขแผนกสำเร็จ" : "Department updated",
    errorGen: locale === "th" ? "เกิดข้อผิดพลาด กรุณาลองใหม่" : "An error occurred, please try again",
  };

  function openCreate() {
    setSelected(null);
    setModalMode("create");
  }

  function openEdit(dept: DepartmentRow) {
    setSelected(dept);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelected(null);
  }

  function handleSuccess() {
    closeModal();
    showToast("success", modalMode === "create" ? t.addOk : t.editOk);
    router.refresh();
  }

  function requestDelete(dept: DepartmentRow) {
    if (dept._count.users > 0) {
      showToast("error", t.cantDelete(dept._count.users));
      return;
    }
    setConfirmDept(dept);
  }

  async function executeDelete() {
    if (!confirmDept) return;
    const dept = confirmDept;
    setConfirmDept(null);
    setDeletingId(dept.id);
    try {
      const res = await fetch(`/api/it/departments/${dept.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error) {
        showToast("error", json.error ?? t.errorGen);
        return;
      }
      showToast("success", t.deleteOk);
      router.refresh();
    } catch {
      showToast("error", t.errorGen);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={t.description(departments.length)}
        actions={
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <PlusIcon />
            {t.addDept}
          </Button>
        }
      />

      {/* Desktop table */}
      <div className="hidden md:block card-premium overflow-hidden border border-base-300 rounded-xl shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-base-200">
              <TableHead>{t.colName}</TableHead>
              <TableHead>{t.colEmail}</TableHead>
              <TableHead>{t.colUsers}</TableHead>
              <TableHead>{t.colStatus}</TableHead>
              <TableHead>{t.colActions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((dept) => (
              <TableRow key={dept.id} className="text-sm hover:bg-base-200 transition-colors duration-100">
                <TableCell>
                  <Link
                    href={`/it/departments/${dept.id}`}
                    className="text-xs md:text-sm font-semibold text-neutral hover:text-primary transition-colors"
                  >
                    {dept.name}
                  </Link>
                </TableCell>
                <TableCell className="text-[11px] md:text-xs text-gray-500 font-mono">
                  {dept.emailGroup ? (
                    <span className="truncate max-w-45 block">{dept.emailGroup}</span>
                  ) : (
                    <span className="text-base-300">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/it/departments/${dept.id}`}
                    className="text-[11px] md:text-xs text-gray-500 hover:text-primary transition-colors"
                  >
                    {t.users(dept._count.users)}
                  </Link>
                </TableCell>
                <TableCell>
                  {dept.isActive ? (
                    <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">{t.active}</Badge>
                  ) : (
                    <Badge variant="secondary">{t.inactive}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(dept)}
                      className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                    >
                      {t.edit}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => requestDelete(dept)}
                      disabled={deletingId === dept.id}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      {deletingId === dept.id ? (
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        t.delete
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {departments.map((dept) => (
          <div key={dept.id} className="card-premium p-4 border border-base-300 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <Link
                  href={`/it/departments/${dept.id}`}
                  className="text-xs md:text-sm font-semibold text-neutral hover:text-primary transition-colors"
                >
                  {dept.name}
                </Link>
                {dept.emailGroup && (
                  <p className="text-[11px] text-gray-500 font-mono truncate max-w-50">
                    {dept.emailGroup}
                  </p>
                )}
              </div>
              {dept.isActive ? (
                <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-success/15 text-success shrink-0">{t.active}</span>
              ) : (
                <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-base-200 text-neutral shrink-0">{t.inactive}</span>
              )}
            </div>
            <Link href={`/it/departments/${dept.id}`} className="text-[11px] md:text-xs text-gray-500 hover:text-primary transition-colors mb-3 block">
              {t.usersLink(dept._count.users)}
            </Link>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-sky-600 hover:text-sky-700 hover:bg-sky-50 flex-1" onClick={() => openEdit(dept)}>
                {t.edit}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex-1"
                onClick={() => requestDelete(dept)}
                disabled={deletingId === dept.id}
              >
                {deletingId === dept.id ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t.delete}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Department create/edit modal */}
      {modalMode && (
        <DepartmentModal
          mode={modalMode}
          department={selected}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}

      {/* Confirm delete modal */}
      {confirmDept && (
        <ConfirmModal
          title={t.confirmTitle}
          message={t.confirmMsg(confirmDept.name)}
          confirmLabel={t.confirmYes}
          cancelLabel={t.confirmNo}
          onConfirm={executeDelete}
          onCancel={() => setConfirmDept(null)}
          loading={deletingId === confirmDept.id}
          danger
        />
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
          duration={toast.type === "error" ? 0 : 4000}
        />
      )}
    </>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
