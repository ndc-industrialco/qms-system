"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;
const MONTH_TH: Record<string, string> = {
  Jan:'ม.ค.', Feb:'ก.พ.', Mar:'มี.ค.', Apr:'เม.ย.', May:'พ.ค.', Jun:'มิ.ย.',
  Jul:'ก.ค.', Aug:'ส.ค.', Sep:'ก.ย.', Oct:'ต.ค.', Nov:'พ.ย.', Dec:'ธ.ค.',
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-amber-400',
  PENDING_REVIEW: 'bg-blue-400',
  PENDING_APPROVAL: 'bg-indigo-500',
  APPROVED: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'ยังไม่ส่ง',
  PENDING_REVIEW: 'รออนุมัติ',
  PENDING_APPROVAL: 'รออนุมัติขั้นสุดท้าย',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ถูกปฏิเสธ',
};

export interface KpiMatrixRow {
  department: string;
  kpiId: string;
  months: Record<string, string | null>;
}

interface Props {
  year: number;
  noKpiDepartments: string[];
  matrix: KpiMatrixRow[];
}

function StatusDot({ status }: { status: string | null }) {
  if (!status) return <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" title="ไม่มีข้อมูล" />;
  return (
    <span
      className={`w-3 h-3 rounded-full inline-block ${STATUS_COLOR[status] ?? 'bg-slate-300'}`}
      title={STATUS_LABEL[status] ?? status}
    />
  );
}

const LEGEND = [
  { color: 'bg-amber-400',   label: 'ยังไม่ส่ง' },
  { color: 'bg-blue-400',    label: 'รออนุมัติ' },
  { color: 'bg-indigo-500',  label: 'รออนุมัติขั้นสุดท้าย' },
  { color: 'bg-emerald-500', label: 'อนุมัติแล้ว' },
  { color: 'bg-rose-500',    label: 'ถูกปฏิเสธ' },
  { color: 'bg-slate-200',   label: 'ไม่มีข้อมูล' },
];

export default function DashboardKpiMonthlySection({ year, noKpiDepartments, matrix }: Props) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[rgb(15,16,89)]">
          สถานะ KPI รายเดือน ปี {year}
        </h2>
        <Link
          href="/qms/kpi/monthly"
          className="text-xs text-[rgb(15,16,89)] font-semibold hover:underline"
        >
          ดูทั้งหมด
        </Link>
      </div>

      {noKpiDepartments.length > 0 && (
        <div className="px-6 pt-4">
          <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
            <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold w-full mb-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              แผนกต่อไปนี้ยังไม่กำหนด KPI ปี {year}
            </div>
            {noKpiDepartments.map((d) => (
              <span key={d} className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-xs font-medium">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {matrix.length > 0 ? (
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left pr-6 pb-2 font-semibold text-slate-500 whitespace-nowrap min-w-36">
                  แผนก
                </th>
                {MONTHS.map((m) => (
                  <th key={m} className="pb-2 font-semibold text-slate-500 text-center w-9">
                    {MONTH_TH[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.kpiId} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="pr-6 py-2.5 text-slate-700 font-medium whitespace-nowrap">
                    {row.department}
                  </td>
                  {MONTHS.map((m) => (
                    <td key={m} className="py-2.5 text-center">
                      <StatusDot status={row.months[m] ?? null} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-slate-100">
            {LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="p-6 text-center text-sm text-slate-400">
          ไม่มีแผนกที่อนุมัติ KPI แล้วในปี {year}
        </p>
      )}
    </div>
  );
}
