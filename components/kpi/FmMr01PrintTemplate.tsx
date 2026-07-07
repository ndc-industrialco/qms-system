"use client";

import PrintPageActions from "@/components/shared/PrintPageActions";

interface KPIObjective {
  id: string;
  target: number;
  unit: string | null;
  objective: string;
  frequency: string;
  calculationFormula: string;
  actionPlanGuidelines: string;
  referenceDocuments: string | null;
  responsibleNameSnapshot?: string | null;
  responsibleEmployeeId?: string | null;
  responsibleEmailSnapshot?: string | null;
}

interface KPI {
  id: string;
  yearly: number;
  department: string;
  status: string;
  objectives: KPIObjective[];
}

interface FmMr01PrintTemplateProps {
  kpis: KPI[];
  year: number;
}

export default function FmMr01PrintTemplate({ kpis, year }: FmMr01PrintTemplateProps) {
  const formLabel = "วัตถุประสงค์คุณภาพ สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย";
  const formLabelEn = "Quality, Environment, Occupational Health and Safety Objectives";

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: A4 landscape;
          margin: 10mm 8mm 8mm 8mm;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 10px;
          color: #000;
          line-height: 1.2;
          background-color: #f8fafc;
        }

        .print-container {
          width: 100%;
          max-width: 280mm;
          margin: 0 auto;
          background-color: #fff;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          padding: 10mm 8mm;
        }

        .print-container table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4px;
        }

        .print-container td, .print-container th {
          border: 1px solid #000;
          padding: 4px 5px;
          vertical-align: middle;
        }

        .print-container th {
          background-color: #f3f4f6;
          font-weight: bold;
        }

        .print-container .text-center {
          text-align: center;
        }

        .print-container .text-left {
          text-align: left;
        }

        .print-container .text-right {
          text-align: right;
        }

        .print-container .font-bold {
          font-weight: bold;
        }

        .print-container .bg-gray {
          background-color: #f3f4f6;
        }

        .print-container .logo-container {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 2px;
        }

        .print-container .footer-note {
          font-size: 8px;
          text-align: right;
          margin-top: 6px;
          font-family: Arial, sans-serif;
        }

        @media print {
          body {
            background-color: #fff;
          }
          .print-container {
            width: 100%;
            max-width: 100%;
            box-shadow: none;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
        `
      }} />

      <div className="py-8 bg-slate-100 min-h-screen">
        <PrintPageActions />

        <div className="print-container">
          {/* Header Block */}
          <table style={{ marginBottom: "8px" }}>
            <tbody>
              <tr>
                <td style={{ width: "20%", textAlign: "left", padding: "4px" }}>
                  <div className="logo-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo/logo.webp" alt="Logo" style={{ height: "30px", objectFit: "contain" }} />
                  </div>
                </td>
                <td style={{ width: "60%", textAlign: "center" }}>
                  <div className="font-bold" style={{ fontSize: "14px", color: "#0F1059" }}>{formLabel} {year}</div>
                  <div className="font-bold" style={{ fontSize: "12px", color: "#0f1059" }}>{formLabelEn} {year}</div>
                </td>
                <td style={{ width: "20%", padding: "4px", fontSize: "9px" }}>
                  <div><strong>แผนงานประจำปี</strong></div>
                  <div>Annual Work Plan</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Objectives Table */}
          <table style={{ marginBottom: "12px" }}>
            <thead>
              <tr style={{ fontSize: "9.5px" }}>
                <th style={{ width: "15%" }} className="text-center">หน่วยงาน<br/>Departments</th>
                <th style={{ width: "25%" }} className="text-center">วัตถุประสงค์และเป้าหมาย<br/>Objectives and goals</th>
                <th style={{ width: "12%" }} className="text-center">สูตรคำนวน<br/>Calculation formula</th>
                <th style={{ width: "20%" }} className="text-center">แนวทางแผนการดำเนินงาน<br/>Operational plan guidelines</th>
                <th style={{ width: "8%" }} className="text-center">ความถี่ ในการวัด<br/>Measurement Frequency</th>
                <th style={{ width: "10%" }} className="text-center">เอกสารอ้างอิง<br/>References</th>
                <th style={{ width: "10%" }} className="text-center">ผู้รับผิดชอบ<br/>Responsible Person</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((kpi) => {
                if (!kpi.objectives || kpi.objectives.length === 0) return null;
                
                return kpi.objectives.map((obj, idx) => (
                  <tr key={obj.id} style={{ fontSize: "9px" }}>
                    {idx === 0 && (
                      <td rowSpan={kpi.objectives.length} className="text-center font-bold" style={{ verticalAlign: "top" }}>
                        {kpi.department}
                      </td>
                    )}
                    <td>
                      <div><strong>{obj.objective} {obj.target} {obj.unit || ""}</strong></div>
                    </td>
                    <td style={{ whiteSpace: "pre-line" }}>{obj.calculationFormula}</td>
                    <td style={{ whiteSpace: "pre-line" }}>{obj.actionPlanGuidelines}</td>
                    <td className="text-center">{obj.frequency}</td>
                    <td className="text-center">{obj.referenceDocuments || "-"}</td>
                    <td className="text-center">
                      {(obj.responsibleNameSnapshot || obj.responsibleEmailSnapshot) ? (
                        <>
                          {obj.responsibleNameSnapshot || obj.responsibleEmailSnapshot}
                          {obj.responsibleEmployeeId ? <br /> : ""}
                          {obj.responsibleEmployeeId ? `(#${obj.responsibleEmployeeId})` : ""}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ));
              })}
              
              {kpis.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-4">
                    No data for {year}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Signatures / Approval Block if needed */}
          {/* Typically FM-MR-01 has a bottom block for preparer/reviewer/approver but for a master list it might just have the document info */}
          
          {/* Footer prefix and label */}
          <div className="footer-note">
            FM-MR-01 Rev.02 / วัตถุประสงค์คุณภาพประจำปี
          </div>
        </div>
      </div>
    </>
  );
}
