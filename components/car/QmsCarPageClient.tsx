"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDepartments } from "@/hooks/api/use-departments";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, FileSpreadsheet, Printer, ShieldAlert, Layers, Calendar, Landmark } from "lucide-react";
import CarListTable from "./CarListTable";
import { CAR_STATUS_LABELS, type CarListResponse, type CarListScope, type CarStatus } from "@/types/car";

interface QmsCarPageClientProps {
  initialData: CarListResponse;
  authDepartmentId: string | null;
  role: string;
  scope: string;
}

interface SummaryRow {
  departmentId: string;
  departmentName: string;
  newCount: number;
  closedCount: number;
  totalCount: number;
}

interface StatusRow {
  id: string;
  carNo: string;
  issuedAt: string | null;
  defectDetail: string;
  targetDepartmentName: string;
  responseDueAt: string | null;
  followUp: string;
  closingDate: string | null;
  status: string;
  remark: string;
}

const CAR_STATUS_VALUES = ["DRAFT", "ISSUED", "RESPONDED", "VERIFY_1", "VERIFY_2", "CLOSED", "RE_CAR", "CANCELLED"];

export default function QmsCarPageClient({
  initialData,
  authDepartmentId,
  role,
  scope,
}: QmsCarPageClientProps) {
  const { data: departments = [] } = useDepartments();

  // Active Tab state: 'list' | 'summary' | 'status'
  const [activeTab, setActiveTab] = useState<"list" | "summary" | "status">("list");

  // Summary filters state
  const [summaryYear, setSummaryYear] = useState<string>("");
  const [summaryDept, setSummaryDept] = useState<string>("");
  const [summaryStatus, setSummaryStatus] = useState<string>("");

  // Status report filters state
  const [statusDueFilter, setStatusDueFilter] = useState<string>("all");
  const [statusValFilter, setStatusValFilter] = useState<string>("all");

  // Fetch summary data
  const { data: summaryData = [], isLoading: isSummaryLoading } = useQuery<SummaryRow[]>({
    queryKey: ["car-summary", summaryYear, summaryDept, summaryStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (summaryYear) params.set("year", summaryYear);
      if (summaryDept) params.set("department", summaryDept);
      if (summaryStatus) params.set("status", summaryStatus);

      const res = await fetch(`/api/car/reports/summary?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch summary report");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: activeTab === "summary",
  });

  // Fetch status data
  const { data: statusData = [], isLoading: isStatusLoading } = useQuery<StatusRow[]>({
    queryKey: ["car-status-report", statusDueFilter, statusValFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusDueFilter !== "all") params.set("dueFilter", statusDueFilter);
      if (statusValFilter !== "all") params.set("status", statusValFilter);

      const res = await fetch(`/api/car/reports/status?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch status report");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: activeTab === "status",
  });

  // Excel Export Handler for Summary
  const handleExportSummaryExcel = () => {
    const params = new URLSearchParams();
    if (summaryYear) params.set("year", summaryYear);
    if (summaryDept) params.set("department", summaryDept);
    if (summaryStatus) params.set("status", summaryStatus);
    window.open(`/api/car/reports/summary/export?${params.toString()}`, "_blank");
  };

  // PDF Print Handler for Summary
  const handlePrintSummaryPdf = () => {
    const params = new URLSearchParams();
    if (summaryYear) params.set("year", summaryYear);
    if (summaryDept) params.set("department", summaryDept);
    if (summaryStatus) params.set("status", summaryStatus);
    window.open(`/print/qms/car/summary?${params.toString()}`, "_blank");
  };

  // Excel Export Handler for Status
  const handleExportStatusExcel = () => {
    const params = new URLSearchParams();
    if (statusDueFilter !== "all") params.set("dueFilter", statusDueFilter);
    if (statusValFilter !== "all") params.set("status", statusValFilter);
    window.open(`/api/car/reports/status/export?${params.toString()}`, "_blank");
  };

  // PDF Print Handler for Status
  const handlePrintStatusPdf = () => {
    const params = new URLSearchParams();
    if (statusDueFilter !== "all") params.set("dueFilter", statusDueFilter);
    if (statusValFilter !== "all") params.set("status", statusValFilter);
    window.open(`/print/qms/car/status?${params.toString()}`, "_blank");
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 gap-1.5 no-print bg-white p-1 rounded-t-xl">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === "list"
              ? "bg-[#0F1059] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Layers className="h-4 w-4" />
          รายการ CAR
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === "summary"
              ? "bg-[#0F1059] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          สรุปผล CAR (CAR Summary)
        </button>
        <button
          onClick={() => setActiveTab("status")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === "status"
              ? "bg-[#0F1059] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          ติดตามสถานะ CAR (CAR Status)
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "list" && (
        <CarListTable
          initialData={initialData}
          isPrivileged
          canEditDelete={role === "QMS" || role === "IT"}
          initialScope={scope as CarListScope}
          allowAllScope
          myAuthDeptId={authDepartmentId}
        />
      )}

      {activeTab === "summary" && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary Filters */}
          <div className="card-premium p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0F1059]" />
              ตัวกรองรายงานสรุปผล
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">ปีประจำแผนก (Year)</label>
                <select
                  value={summaryYear}
                  onChange={(e) => setSummaryYear(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F1059]"
                >
                  <option value="">ปีทั้งหมด</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">แผนกที่รับผิดชอบ (Department)</label>
                <select
                  value={summaryDept}
                  onChange={(e) => setSummaryDept(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F1059]"
                >
                  <option value="">แผนกทั้งหมด</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">สถานะ CAR (Status)</label>
                <select
                  value={summaryStatus}
                  onChange={(e) => setSummaryStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F1059]"
                >
                  <option value="">สถานะทั้งหมด</option>
                  {CAR_STATUS_VALUES.map((status) => (
                    <option key={status} value={status}>
                      {CAR_STATUS_LABELS[status as CarStatus] ?? status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSummaryExcel}
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-9"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                ส่งออก Excel
              </Button>
              <Button
                size="sm"
                onClick={handlePrintSummaryPdf}
                className="bg-[#0F1059] hover:bg-[#161875] text-white h-9"
              >
                <Printer className="h-4 w-4 mr-2" />
                พิมพ์เอกสาร / PDF
              </Button>
            </div>
          </div>

          {/* Summary Table */}
          {isSummaryLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="th-pro">แผนก (Department)</TableHead>
                      <TableHead className="th-pro text-center">CAR ใหม่ (New CAR)</TableHead>
                      <TableHead className="th-pro text-center">ปิดแล้ว (Closed)</TableHead>
                      <TableHead className="th-pro text-center">รวมแผนก (Total)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.map((row) => (
                      <TableRow key={row.departmentId} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-800">{row.departmentName}</TableCell>
                        <TableCell className="text-center font-mono">{row.newCount}</TableCell>
                        <TableCell className="text-center font-mono">{row.closedCount}</TableCell>
                        <TableCell className="text-center font-mono font-semibold text-blue-900">{row.totalCount}</TableCell>
                      </TableRow>
                    ))}
                    {summaryData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-400 py-16">
                          ไม่พบข้อมูลสรุป
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "status" && (
        <div className="space-y-4 animate-fade-in">
          {/* Status Filters */}
          <div className="card-premium p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-[#0F1059]" />
              ติดตามสถานะและกำหนดการ (CAR Follow-up)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">ตัวกรองกำหนดส่งคำตอบ (Due Filter)</label>
                <select
                  value={statusDueFilter}
                  onChange={(e) => setStatusDueFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F1059]"
                >
                  <option value="all">ทั้งหมด (All)</option>
                  <option value="near-due">ใกล้กำหนดส่ง (ภายใน 7 วัน)</option>
                  <option value="overdue">เกินกำหนดส่ง (Overdue)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">สถานะเอกสาร (Status)</label>
                <select
                  value={statusValFilter}
                  onChange={(e) => setStatusValFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F1059]"
                >
                  <option value="all">ทั้งหมด (All)</option>
                  {CAR_STATUS_VALUES.map((status) => (
                    <option key={status} value={status}>
                      {CAR_STATUS_LABELS[status as CarStatus] ?? status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportStatusExcel}
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-9"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                ส่งออก Excel
              </Button>
              <Button
                size="sm"
                onClick={handlePrintStatusPdf}
                className="bg-[#0F1059] hover:bg-[#161875] text-white h-9"
              >
                <Printer className="h-4 w-4 mr-2" />
                พิมพ์เอกสาร / PDF
              </Button>
            </div>
          </div>

          {/* Status Table */}
          {isStatusLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="th-pro">CAR Number</TableHead>
                      <TableHead className="th-pro text-center">Issue Date</TableHead>
                      <TableHead className="th-pro">Detail</TableHead>
                      <TableHead className="th-pro">Operator</TableHead>
                      <TableHead className="th-pro text-center">Due Date</TableHead>
                      <TableHead className="th-pro">Follow-up</TableHead>
                      <TableHead className="th-pro text-center">Closing Date</TableHead>
                      <TableHead className="th-pro text-center">Status</TableHead>
                      <TableHead className="th-pro">Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusData.map((row) => (
                      <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-mono font-semibold text-blue-600">{row.carNo}</TableCell>
                        <TableCell className="text-center font-mono">
                          {row.issuedAt ? new Date(row.issuedAt).toLocaleDateString("th-TH") : "-"}
                        </TableCell>
                        <TableCell className="text-slate-600 max-w-xs truncate">{row.defectDetail}</TableCell>
                        <TableCell className="text-slate-700">{row.targetDepartmentName}</TableCell>
                        <TableCell className="text-center font-mono">
                          {row.responseDueAt ? new Date(row.responseDueAt).toLocaleDateString("th-TH") : "-"}
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs">{row.followUp}</TableCell>
                        <TableCell className="text-center font-mono">
                          {row.closingDate ? new Date(row.closingDate).toLocaleDateString("th-TH") : "-"}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {CAR_STATUS_LABELS[row.status as CarStatus] ?? row.status}
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">{row.remark || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {statusData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-slate-400 py-16">
                          ไม่พบประวัติสถานะ CAR
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
