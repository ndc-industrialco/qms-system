import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import { KpiExportService } from "@/services/kpiExportService";
import { QmsConfigService } from "@/services/qmsConfigService";

const filterSchema = z.object({
  department: z.string().optional(),
  year:       z.coerce.number().optional(),
  month:      z.string().optional(),
  status:     z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      department: sp.get("department") ?? undefined,
      year:       sp.get("year")       ?? undefined,
      month:      sp.get("month")      ?? undefined,
      status:     sp.get("status")     ?? undefined,
    });

    const [reports, naming] = await Promise.all([
      exportService.listMonthlyReports({
      ...(filter.year && { year: filter.year }),
      ...(filter.month && { month: filter.month }),
      ...(filter.status && { status: filter.status as never }),
      ...(filter.department ? { kpi: { department: { contains: filter.department } } } : {}),
      }),
      qmsConfigService.getExportNamingMeta("KPI_MONTHLY", {
        label: "KPI Monthly Report",
        fileBaseName: "kpi-monthly-export",
      }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();

    const ws = wb.addWorksheet(naming.worksheetName);

    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1059" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const border: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCCCCCC" } };
    const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };
    const revisedFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };

    ws.columns = [
      { header: "Year",           key: "year",          width: 8  },
      { header: "Month",          key: "month",         width: 10 },
      { header: "Department",     key: "department",    width: 26 },
      { header: "Status",         key: "status",        width: 20 },
      { header: "Prepared By",    key: "prepareBy",     width: 22 },
      { header: "Reviewed By",    key: "reviewBy",      width: 22 },
      { header: "Approved By",    key: "approveBy",     width: 22 },
      { header: "Approved At",    key: "approvedAt",    width: 18 },
      { header: "Objective",      key: "objective",     width: 50 },
      { header: "Target",         key: "target",        width: 10 },
      { header: "Unit",           key: "unit",          width: 10 },
      { header: "Actual Result",  key: "actual",        width: 14 },
      { header: "Achieved",       key: "achieved",      width: 12 },
      { header: "Corrective Actions", key: "corrective", width: 50 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 22;

    const fmt = (d: Date | null | undefined) =>
      d ? d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : "";

    for (const r of reports) {
      if (r.details.length === 0) {
        // Report with no details — one row
        const added = ws.addRow({
          year:       r.year,
          month:      r.month,
          department: r.kpi.department,
          status:     r.status,
          prepareBy:  r.prepareBy ?? "",
          reviewBy:   r.reviewBy  ?? "",
          approveBy:  r.approveBy ?? "",
          approvedAt: fmt(r.approvedAt),
          objective:  "",
          target:     "",
          unit:       "",
          actual:     "",
          achieved:   "",
          corrective: "",
        });
        added.eachCell((cell) => {
          cell.border = allBorders;
          cell.alignment = { vertical: "top", wrapText: false };
        });
      } else {
        for (const d of r.details) {
          const corrective = d.correctiveActions
            .map((ca: { times: number; rootCause: string; guidelines: string; responsiblePerson: string; dueDate: Date }) => `[${ca.times}x] ${ca.rootCause} → ${ca.guidelines} (${ca.responsiblePerson}, due ${fmt(ca.dueDate)})`)
            .join(" | ");

          const isRevised = (d.kpiObjective as Record<string, unknown>)?.isRevised as boolean | undefined;

          const added = ws.addRow({
            year:       r.year,
            month:      r.month,
            department: r.kpi.department,
            status:     r.status,
            prepareBy:  r.prepareBy ?? "",
            reviewBy:   r.reviewBy  ?? "",
            approveBy:  r.approveBy ?? "",
            approvedAt: fmt(r.approvedAt),
            objective:  d.kpiObjective.objective,
            target:     d.kpiObjective.target,
            unit:       d.kpiObjective.unit ?? "",
            actual:     d.actualResult ?? "",
            achieved:   d.achievedStatus,
            corrective: corrective,
          });
          added.eachCell((cell) => {
            if (isRevised) {
              cell.fill = revisedFill;
              cell.font = { ...cell.font, color: { argb: 'FF000000' }, underline: true, italic: true };
            }
            cell.border = allBorders;
            cell.alignment = { vertical: "top", wrapText: false };
          });
        }
      }
    }

    ws.autoFilter = { from: "A1", to: "N1" };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const date   = new Date().toISOString().slice(0, 10);

    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${naming.fileBaseName}-${date}.xlsx"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const exportService = new KpiExportService();
const qmsConfigService = new QmsConfigService();
