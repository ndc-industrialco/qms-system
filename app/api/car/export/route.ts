import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import { CarExportService } from "@/services/carExportService";
import { QmsConfigService } from "@/services/qmsConfigService";
import { CAR_STATUS_LABELS, type CarStatus } from "@/types/car";

const filterSchema = z.object({
  status:     z.string().optional(),
  sourceType: z.string().optional(),
  department: z.string().optional(),
  from:       z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  to:         z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
});

const exportService = new CarExportService();
const qmsConfigService = new QmsConfigService();

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      status:     sp.get("status")     ?? undefined,
      sourceType: sp.get("sourceType") ?? undefined,
      department: sp.get("department") ?? undefined,
      from:       sp.get("from")       ?? undefined,
      to:         sp.get("to")         ?? undefined,
    });

    const [rows, naming] = await Promise.all([
      exportService.listCars({
        ...(filter.status && { status: filter.status as never }),
        ...(filter.sourceType && { sourceType: filter.sourceType as never }),
        ...(filter.department && { targetDepartmentName: { contains: filter.department } }),
        ...(filter.from || filter.to ? { createdAt: { gte: filter.from, lte: filter.to } } : {}),
      }),
      qmsConfigService.getExportNamingMeta("CAR", {
        label: "Corrective Action Register",
        fileBaseName: "car-register",
      }),
    ]);

    // Load template
    const wb = new ExcelJS.Workbook();
    const templatePath = "docs/template/FM-MR-11 Rev.02  ทะเบียนใบแจ้งดำเนินการแก้ไข.xlsx";
    await wb.xlsx.readFile(templatePath);

    const ws = wb.worksheets[0];
    ws.name = naming.worksheetName;

    // Fill Year in Cell R2
    const filterYearStr = filter.from ? filter.from.getFullYear().toString() : new Date().getFullYear().toString();
    ws.getCell("R2").value = filterYearStr;

    // Reference Row 8 styles for cloning formatting
    const refRow = ws.getRow(8);
    const rowStyles = Array.from({ length: 18 }).map((_, c) => {
      const cell = refRow.getCell(c + 1);
      return {
        font: cell.font,
        border: cell.border,
        fill: cell.fill,
        alignment: cell.alignment,
        numFmt: cell.numFmt,
      };
    });

    const fmt = (d: Date | null | undefined) =>
      d ? d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : "";

    const startRow = 8;
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const v1 = r.verifications.find((v) => v.round === 1);
      const v2 = r.verifications.find((v) => v.round === 2);

      const currentRowNum = startRow + idx;
      const currentRow = ws.getRow(currentRowNum);

      // Map data columns
      currentRow.getCell(1).value = idx + 1; // ลำดับ
      currentRow.getCell(2).value = r.carNo; // CAR Number
      currentRow.getCell(3).value = fmt(r.issuedAt); // วันที่ออก CAR
      currentRow.getCell(4).value = r.defectDetail; // รายละเอียด CAR (Defect detail)
      currentRow.getCell(5).value = r.targetDepartmentName ?? ""; // หน่วยงานที่เกิดประเด็นปัญหา
      currentRow.getCell(6).value = r.response?.responderName ?? ""; // ผู้แก้ไข (Editor)
      currentRow.getCell(7).value = r.targetDepartmentName ?? ""; // หน่วยงาน (Section)
      currentRow.getCell(8).value = v1?.verifierName ?? ""; // ผู้ติดตาม (Follower)
      currentRow.getCell(9).value = v1?.verifierPosition ?? "QMS"; // หน่วยงาน (Section of Follower)
      currentRow.getCell(10).value = fmt(r.responseDueAt); // ครบกำหนดตอบกลับ (Due Date)
      currentRow.getCell(11).value = fmt(r.response?.respondedAt); // วันที่ตอบกลับ (Reply Date)
      currentRow.getCell(12).value = fmt(r.response?.plannedCompletionDate); // กำหนดแก้ไขแล้วเสร็จ (Due Date finish)
      currentRow.getCell(13).value = fmt(v1?.verifiedAt); // ติดตามครั้งที่ 1 (Follow 1st time)
      currentRow.getCell(14).value = fmt(v1?.nextDueDate); // กำหนดแก้ไขแล้วเสร็จครั้งที่ 2 (Due Date 2nd finish)
      currentRow.getCell(15).value = fmt(v2?.verifiedAt); // ติดตามครั้งที่ 2 (Follow the 2nd time)
      currentRow.getCell(16).value = fmt(r.mrSignature?.signedAt); // วันที่ปิด CAR (CAR Closing Date)
      currentRow.getCell(17).value = CAR_STATUS_LABELS[r.status as CarStatus] ?? r.status; // สถานะ CAR
      currentRow.getCell(18).value = r.mrSignature?.comment ?? v1?.findings ?? ""; // หมายเหตุ

      // Apply cloned styles
      for (let c = 1; c <= 18; c++) {
        const targetCell = currentRow.getCell(c);
        const style = rowStyles[c - 1];
        if (style) {
          if (style.font) targetCell.font = style.font;
          if (style.border) targetCell.border = style.border;
          if (style.fill) targetCell.fill = style.fill;
          if (style.alignment) targetCell.alignment = style.alignment;
          if (style.numFmt) targetCell.numFmt = style.numFmt;
        }
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
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
