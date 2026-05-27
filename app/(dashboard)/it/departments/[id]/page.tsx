import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getDepartmentWithMembers } from "@/services/department";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_LABELS = {
  USER: "ผู้ใช้งาน",
  QMS:  "เจ้าหน้าที่ QMS",
  MR:   "ผู้แทนฝ่ายบริหาร",
  IT:   "เจ้าหน้าที่ IT",
} as const;

const ROLE_BADGE = {
  USER: "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-base-200 text-neutral",
  QMS:  "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-info/15 text-info",
  MR:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-warning/15 text-warning",
  IT:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-success/15 text-success",
} as const;

type Props = { params: Promise<{ id: string }> };

export default async function DepartmentDetailPage({ params }: Props) {
  await requireRole("IT");
  const { id } = await params;
  const dept = await getDepartmentWithMembers(id);
  if (!dept) notFound();

  const subtitle = [
    dept.emailGroup ?? "ไม่มีอีเมลกลุ่ม",
    dept.isActive ? "ใช้งาน" : "ปิดใช้งาน",
  ].join(" · ");

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Page header with breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-neutral mb-3">
        <Link href="/it/departments" className="hover:text-primary transition-colors">
          จัดการแผนก
        </Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="font-medium text-base-content">{dept.name}</span>
      </nav>

      <PageHeader
        title={dept.name}
        subtitle={subtitle}
        className="mb-6"
        actions={
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
            <Link href="/it/departments">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              กลับ
            </Link>
          </Button>
        }
      />

      {/* Summary stat cards */}
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
          <p className="text-[11px] md:text-xs text-neutral">คน (QMS / MR / IT)</p>
        </div>
      </div>

      {/* Members */}
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
            <Table>
              <TableHeader>
                <TableRow className="border-b border-base-200">
                  <TableHead className="th-pro">#</TableHead>
                  <TableHead className="th-pro">ชื่อ</TableHead>
                  <TableHead className="th-pro">อีเมล</TableHead>
                  <TableHead className="th-pro">รหัสพนักงาน</TableHead>
                  <TableHead className="th-pro">Role</TableHead>
                  <TableHead className="th-pro">M365</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dept.members.map((member, idx) => (
                  <TableRow key={member.id} className="border-b border-base-200 hover:bg-base-200 transition-colors duration-100">
                    <TableCell className="text-[11px] md:text-xs text-neutral">{idx + 1}</TableCell>
                    <TableCell className="text-xs md:text-sm font-semibold text-neutral">{member.name ?? "—"}</TableCell>
                    <TableCell className="text-[11px] md:text-xs text-neutral">{member.email}</TableCell>
                    <TableCell className="text-[11px] md:text-xs text-neutral">
                      {member.employeeId ?? <span className="opacity-40">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={ROLE_BADGE[member.role]}>
                        {ROLE_LABELS[member.role]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.msUserId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-success/15 text-success">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          เชื่อม
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-base-200 text-neutral">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                  {/* Role badge — no DaisyUI class */}
                  <span className={`shrink-0 ${ROLE_BADGE[member.role]}`}>
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
