export const runtime = 'nodejs';

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getDepartmentWithMembers } from "@/services/department";
import EmptyState from "@/components/common/EmptyState";

const ROLE_LABELS = {
  USER: "ผู้ใช้งาน",
  QMS: "เจ้าหน้าที่ QMS",
  MR: "ผู้แทนฝ่ายบริหาร",
  IT: "เจ้าหน้าที่ IT",
} as const;

const ROLE_BADGE = {
  USER: "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-500",
  QMS:  "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-blue-100 text-blue-600",
  MR:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-amber-100 text-amber-700",
  IT:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-emerald-100 text-emerald-600",
} as const;

type Props = { params: Promise<{ id: string }> };

export default async function DepartmentDetailPage({ params }: Props) {
  await requireRole("IT");
  const { id } = await params;
  const dept = await getDepartmentWithMembers(id);
  if (!dept) notFound();

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 mb-1">
            <Link href="/it/departments" className="hover:text-primary transition-colors">
              จัดการแผนก
            </Link>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span className="text-base-content font-medium">{dept.name}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-primary">{dept.name}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {dept.emailGroup ? (
              <span className="text-[11px] md:text-xs text-gray-500 font-mono">{dept.emailGroup}</span>
            ) : (
              <span className="text-[11px] md:text-xs text-gray-500 opacity-50">ไม่มีอีเมลกลุ่ม</span>
            )}
            <span className="text-gray-500 opacity-30">·</span>
            {dept.isActive ? (
              <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-emerald-100 text-emerald-600">ใช้งาน</span>
            ) : (
              <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-500">ปิดใช้งาน</span>
            )}
          </div>
        </div>

        <Link href="/it/departments" className="btn btn-ghost btn-sm gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          กลับ
        </Link>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card-premium p-5">
          <p className="text-[12px] text-neutral mb-1">สมาชิกทั้งหมด</p>
          <p className="text-[24px] font-semibold text-base-content">{dept.members.length}</p>
          <p className="text-[12px] text-neutral">คน</p>
        </div>
        <div className="card-premium p-5">
          <p className="text-[12px] text-neutral mb-1">เชื่อม M365</p>
          <p className="text-[24px] font-semibold text-success">
            {dept.members.filter((m) => m.msUserId).length}
          </p>
          <p className="text-[12px] text-neutral">คน</p>
        </div>
        <div className="card-premium p-5">
          <p className="text-[12px] text-neutral mb-1">มีรหัสพนักงาน</p>
          <p className="text-[24px] font-semibold text-base-content">
            {dept.members.filter((m) => m.employeeId).length}
          </p>
          <p className="text-[12px] text-neutral">คน</p>
        </div>
        <div className="card-premium p-5">
          <p className="text-[12px] text-neutral mb-1">Role พิเศษ</p>
          <p className="text-[24px] font-semibold text-base-content">
            {dept.members.filter((m) => m.role !== "USER").length}
          </p>
          <p className="text-[11px] md:text-xs text-gray-500">คน (QMS / MR / IT)</p>
        </div>
      </div>

      {/* ── Members ── */}
      {dept.members.length === 0 ? (
        <EmptyState
          title="ยังไม่มีสมาชิกในแผนกนี้"
          description="ไปที่หน้าจัดการผู้ใช้เพื่อกำหนดแผนกให้ผู้ใช้"
          ctaLabel="ไปหน้าผู้ใช้"
          ctaHref="/it/users"
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card-premium overflow-hidden">
            <table className="table w-full">
              <thead>
                <tr className="bg-base-200 text-xs text-gray-500 border-b border-base-200">
                  <th className="py-3.5 px-4 font-semibold">#</th>
                  <th className="py-3.5 px-4 font-semibold">ชื่อ</th>
                  <th className="py-3.5 px-4 font-semibold">อีเมล</th>
                  <th className="py-3.5 px-4 font-semibold">รหัสพนักงาน</th>
                  <th className="py-3.5 px-4 font-semibold">Role</th>
                  <th className="py-3.5 px-4 font-semibold">M365</th>
                </tr>
              </thead>
              <tbody>
                {dept.members.map((member, idx) => (
                  <tr key={member.id} className="border-b border-base-200 hover:bg-base-200 transition-colors duration-100">
                    <td className="py-3.5 px-4 text-[11px] md:text-xs text-gray-500">{idx + 1}</td>
                    <td className="py-3.5 px-4 text-xs md:text-sm font-semibold text-neutral">{member.name ?? "—"}</td>
                    <td className="py-3.5 px-4 text-[11px] md:text-xs text-gray-500">{member.email}</td>
                    <td className="py-3.5 px-4 text-[11px] md:text-xs text-gray-500">
                      {member.employeeId ?? <span className="opacity-40">—</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={ROLE_BADGE[member.role]}>
                        {ROLE_LABELS[member.role]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {member.msUserId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-emerald-100 text-emerald-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          เชื่อม
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {dept.members.map((member) => (
              <div key={member.id} className="card-premium p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-[14px] font-medium">{member.name ?? "—"}</p>
                    <p className="text-[12px] text-neutral">{member.email}</p>
                  </div>
                  <span className={`badge badge-sm shrink-0 ${ROLE_BADGE[member.role]}`}>
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[13px] text-neutral flex-wrap">
                  <span>รหัส: {member.employeeId ?? "—"}</span>
                  <span>·</span>
                  <span>
                    M365:{" "}
                    {member.msUserId
                      ? <span className="text-success font-medium">เชื่อมแล้ว</span>
                      : "ยังไม่เชื่อม"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
