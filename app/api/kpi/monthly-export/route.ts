import path from "node:path";
import { type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { KpiExportService, type KpiYearlyPreviewRow } from "@/services/kpiExportService";
import { QmsConfigService } from "@/services/qmsConfigService";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const TEMPLATE_SHEET = "Rev.00";
const TEMPLATE_PATH = path.join(process.cwd(), "docs", "template", "KPI Result Year 2026.xlsx");
const DATA_START_ROW = 8;
const TEMPLATE_ROW = 8;

const filterSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  kpiId: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
});

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function isPercentUnit(unit: string | null | undefined) {
  if (!unit) return false;
  const normalized = unit.trim().toLowerCase();
  return normalized === "%" || normalized === "percent";
}

function toBuddhistYear(year: number) {
  return year + 543;
}

function formatUpdateDate(date: Date) {
  return date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" });
}

function getMonthCellValue(value: number | string | undefined) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
}

function applyMonthNumberFormat(cell: ExcelJS.Cell, value: number | null, unit?: string | null) {
  if (typeof value !== "number") {
    cell.numFmt = "";
    return;
  }
  if (isPercentUnit(unit) && value >= 0 && value <= 1) {
    cell.numFmt = "0.00%";
    return;
  }
  cell.numFmt = Number.isInteger(value) ? "0" : "0.00";
}

function rewriteHeader(ws: ExcelJS.Worksheet, year: number) {
  const buddhistYear = toBuddhistYear(year);
  ws.getCell("F4").value = `สรุปผลการดำเนินงานตามวัตถุประสงค์คุณภาพ ประจำปี ${buddhistYear}`;
  ws.getCell("F5").value = `Summary of Key Performance Results Year ${year}`;
  ws.getCell("L6").value = `ประจำปี ${buddhistYear} / Year ${year}`;
  ws.getCell("L7").value = `Year ${year}`;
  ws.getCell("X6").value = `Average Y ${year}`;
  ws.getCell("Y6").value = `New Target Y ${year + 1}`;
  ws.getCell("X7").value = `เฉลี่ย ปี ${year}`;
  ws.getCell("Y7").value = `เป้าหมาย ปี ${year + 1}`;
  ws.getCell("Y5").value = formatUpdateDate(new Date());
}

function rebuildDataSection(ws: ExcelJS.Worksheet, rows: KpiYearlyPreviewRow[]) {
  const templateRow = ws.getRow(TEMPLATE_ROW);
  const templateHeight = templateRow.height ?? 35.1;
  const templateStyles = Array.from({ length: 24 }, (_, index) =>
    deepClone(templateRow.getCell(index + 2).style),
  );
  const existingDataRowCount = Math.max(0, ws.rowCount - DATA_START_ROW + 1);
  const requiredRowCount = Math.max(existingDataRowCount, rows.length);

  for (let rowNumber = DATA_START_ROW; rowNumber < DATA_START_ROW + requiredRowCount; rowNumber++) {
    if (ws.getCell(`C${rowNumber}`).isMerged) {
      ws.unMergeCells(`C${rowNumber}:H${rowNumber}`);
    }

    for (let col = 2; col <= 25; col++) {
      const cell = ws.getRow(rowNumber).getCell(col);
      cell.value = null;
      cell.style = deepClone(templateStyles[col - 2]);
    }
    ws.getRow(rowNumber).height = templateHeight;
  }

  rows.forEach((row, index) => {
    const rowNumber = DATA_START_ROW + index;

    ws.mergeCells(`C${rowNumber}:H${rowNumber}`);

    ws.getCell(`B${rowNumber}`).value = row.no;
    ws.getCell(`C${rowNumber}`).value = row.objective;
    ws.getCell(`I${rowNumber}`).value = row.target;
    ws.getCell(`J${rowNumber}`).value = row.frequency;
    ws.getCell(`K${rowNumber}`).value = row.team;

    MONTHS.forEach((month, monthIndex) => {
      const colNumber = 12 + monthIndex;
      const cell = ws.getRow(rowNumber).getCell(colNumber);
      const monthData = row.months[monthIndex];
      cell.value = getMonthCellValue(monthData?.numericValue ?? monthData?.value);
      applyMonthNumberFormat(cell, monthData?.numericValue ?? null, row.unit);
    });

    const averageCell = ws.getCell(`X${rowNumber}`);
    averageCell.value = getMonthCellValue(row.averageNumericValue ?? row.average);
    applyMonthNumberFormat(averageCell, row.averageNumericValue, row.unit);
    ws.getCell(`Y${rowNumber}`).value = null;
  });

  for (let rowNumber = DATA_START_ROW + rows.length; rowNumber < DATA_START_ROW + requiredRowCount; rowNumber++) {
    ws.getCell(`B${rowNumber}`).value = null;
    ws.getCell(`C${rowNumber}`).value = null;
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      year: sp.get("year") ?? new Date().getFullYear(),
      kpiId: sp.get("kpiId") ?? undefined,
      department: sp.get("department") ?? undefined,
    });

    const [preview, naming] = await Promise.all([
      exportService.getYearlyPreview(filter),
      qmsConfigService.getExportNamingMeta("KPI_MONTHLY", {
        label: "KPI Monthly Report",
        fileBaseName: "kpi-monthly-export",
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEMPLATE_PATH);
    workbook.creator = "QMS System";
    workbook.created = new Date();

    const templateSheet = workbook.getWorksheet(TEMPLATE_SHEET);
    if (!templateSheet) {
      throw new Error(`Worksheet "${TEMPLATE_SHEET}" not found in KPI export template`);
    }

    for (const sheetName of ["Sheet1", "Sheet2"]) {
      const sheet = workbook.getWorksheet(sheetName);
      if (sheet) {
        workbook.removeWorksheet(sheet.id);
      }
    }

    templateSheet.name = naming.worksheetName;

    rewriteHeader(templateSheet, preview.year);
    rebuildDataSection(templateSheet, preview.rows);

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${naming.fileBaseName}-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const exportService = new KpiExportService();
const qmsConfigService = new QmsConfigService();
