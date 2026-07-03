"use client";

import type { CarDetail } from "@/types/car";
import type { FooterConfig } from "@/services/qmsConfigService";
import PrintPageActions from "@/components/shared/PrintPageActions";

interface CarPrintTemplateProps {
  car: CarDetail;
  footerConfig?: FooterConfig | null;
}

export default function CarPrintTemplate({ car, footerConfig }: CarPrintTemplateProps) {
  const footerLabel = footerConfig?.label?.trim() || "Corrective Action Request / Preventive Action (CAR) | ใบคำขอให้แก้ไขและป้องกันการเกิดซ้ำ (CAR)";
  const footerPrefix = footerConfig?.prefix?.trim() || "FM-QC-02";
  const [primaryTitle, secondaryTitle] = splitBilingualLabel(footerLabel);

  // Helper to format date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("th-TH");
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: A4;
          margin: 10mm 8mm 8mm 8mm;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 9px;
          color: #000;
          line-height: 1.2;
          background-color: #f8fafc;
        }

        .print-container {
          width: 100%;
          max-width: 194mm;
          margin: 0 auto;
          background-color: #fff;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          padding: 8mm 6mm;
        }

        /* Common Borders & Grid styles */
        .print-container table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4px;
        }

        .print-container td, .print-container th {
          border: 1px solid #000;
          padding: 3px 4px;
          vertical-align: top;
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

        /* Section Headers */
        .print-container .section-title {
          font-weight: bold;
          text-align: left;
          background-color: #e2e8f0;
          border: 1px solid #000;
          border-bottom: none;
          padding: 3px 6px;
          font-size: 9.5px;
        }

        /* Checkbox list styles */
        .print-container .checkbox-container {
          border: 1px solid #000;
          padding: 4px 6px;
          margin-bottom: 4px;
        }

        .print-container .checkbox-item {
          display: inline-flex;
          align-items: center;
          margin-right: 12px;
        }

        .print-container .checkbox-box {
          width: 9px;
          height: 9px;
          border: 1px solid #000;
          margin-right: 4px;
          display: inline-block;
          text-align: center;
          line-height: 8px;
          font-size: 8px;
          font-weight: bold;
        }

        .print-container .checkbox-box.checked::after {
          content: "✓";
        }

        /* Header Logo Styles */
        .print-container .logo-container {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 2px;
        }

        /* Dotted line helper */
        .print-container .dotted-line {
          border-bottom: 1px dotted #000;
          display: inline-block;
        }

        /* Blank lines helper */
        .print-container .line-container {
          padding: 4px 6px;
          border: 1px solid #000;
          margin-bottom: 4px;
          min-height: 38px;
        }

        /* Footer styling */
        .print-container .footer-note {
          font-size: 8px;
          text-align: left;
          margin-top: 4px;
          font-family: Arial, sans-serif;
        }

        .signature-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          padding: 2px;
        }

        .signature-img {
          max-height: 30px;
          max-width: 100%;
          object-fit: contain;
          margin-bottom: 2px;
        }

        /* Print media overrides */
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
          {/* 1. Header (Logo & Title & Doc No) */}
          <table style={{ marginBottom: "6px" }}>
            <tbody>
              <tr>
                <td style={{ width: "25%", textAlign: "left", padding: "4px", verticalAlign: "middle" }}>
                  <div className="logo-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo/logo.webp" alt="NDC Industrial Logo" style={{ height: "26px", objectFit: "contain" }} />
                  </div>
                </td>
                <td style={{ width: "50%", textAlign: "center", verticalAlign: "middle" }}>
                  <div className="font-bold" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>{primaryTitle}</div>
                  <div className="font-bold text-slate-700" style={{ fontSize: "10px" }}>{secondaryTitle}</div>
                </td>
                <td style={{ width: "25%", padding: 0 }}>
                  <table style={{ width: "100%", height: "100%", border: "none", margin: 0 }}>
                    <tbody>
                      <tr>
                        <td className="font-bold text-center bg-gray" style={{ padding: "2px", fontSize: "8.5px", borderTop: "none", borderLeft: "none", borderRight: "none" }}>
                          For DCC
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "2px 4px", borderLeft: "none", borderRight: "none", fontSize: "8.5px" }}>
                          <strong>CAR No. :</strong> <span className="font-bold font-mono">{car.carNo}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "2px 4px", borderBottom: "none", borderLeft: "none", borderRight: "none", fontSize: "8.5px" }}>
                          <strong>Date :</strong> {formatDate(car.issuedAt)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 2. Section 1 Header */}
          <div className="section-title">
            1. Defect Description & Issuer Details / รายละเอียดความบกพร่องและผู้ออก CAR
          </div>
          
          {/* Section 1 Content Grid */}
          <table style={{ marginBottom: "6px" }}>
            <tbody>
              <tr>
                <td style={{ width: "50%" }}>
                  <strong>To (ถึง แผนก):</strong> {car.targetDepartment.name}
                </td>
                <td style={{ width: "50%" }}>
                  <strong>Issuer (ผู้พบปัญหา):</strong> {car.issuer.name || "-"} ({car.issuerPosition})
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Date of Issue (วันที่ออก):</strong> {formatDate(car.issuedAt)}
                </td>
                <td>
                  <strong>Response Due Date (กำหนดส่งคืน):</strong> {formatDate(car.responseDueAt)}
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <strong>ISO Standard Requirements (ข้อกำหนดมาตรฐาน):</strong>{" "}
                  {car.isoStandards.length > 0 ? (
                    car.isoStandards.map((std, idx) => (
                      <span key={std} className="mr-2">
                        <span className="checkbox-box checked" style={{ verticalAlign: "middle" }}></span>
                        <span style={{ marginLeft: "2px", verticalAlign: "middle" }}>{std}</span>
                      </span>
                    ))
                  ) : (
                    <span>—</span>
                  )}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ padding: "4px" }}>
                  <strong>Source of Issue / แหล่งที่มาของความบกพร่อง:</strong>
                  <div style={{ marginTop: "3px" }}>
                    <span className="checkbox-item">
                      <span className={`checkbox-box ${car.sourceType === "I" ? "checked" : ""}`}></span>
                      <span>(I) Internal Audit / การตรวจติดตามคุณภาพภายใน</span>
                    </span>
                    <span className="checkbox-item">
                      <span className={`checkbox-box ${car.sourceType === "C" ? "checked" : ""}`}></span>
                      <span>(C) Customer Complaint / ข้อร้องเรียนจากลูกค้า</span>
                    </span>
                    <span className="checkbox-item">
                      <span className={`checkbox-box ${car.sourceType === "N" ? "checked" : ""}`}></span>
                      <span>(N) Non-conforming Product / ปัญหาคุณภาพ</span>
                    </span>
                    <span className="checkbox-item">
                      <span className={`checkbox-box ${car.sourceType === "O" ? "checked" : ""}`}></span>
                      <span>(O) Others / อื่นๆ {car.sourceDetail ? `(${car.sourceDetail})` : ""}</span>
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ minHeight: "50px" }}>
                  <strong>Defect Details / รายละเอียดข้อบกพร่อง:</strong>
                  <div style={{ marginTop: "4px", whiteSpace: "pre-wrap" }}>{car.defectDetail}</div>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <strong>Non-Conformance Reference (ข้ออ้างอิง/เอกสารอ้างอิง):</strong>
                  <div style={{ marginTop: "3px", whiteSpace: "pre-wrap" }}>{car.nonConformanceRef || "—"}</div>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="text-right" style={{ padding: "4px 8px" }}>
                  <div style={{ display: "inline-block", textAlign: "center" }}>
                    <div style={{ minHeight: "34px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {car.issuerSignaturePath ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={car.issuerSignaturePath} alt="Issuer Signature" className="signature-img" />
                      ) : (
                        <div style={{ color: "#aaa", fontSize: "7.5px" }}>(ยังไม่ได้ลงชื่อ / Not signed)</div>
                      )}
                    </div>
                    <div style={{ borderTop: "1px solid #000", width: "160px", margin: "2px auto 0 auto" }}></div>
                    <div style={{ fontSize: "8px" }}>Issuer Signature / ลายเซ็นผู้พบปัญหา</div>
                    <div style={{ fontSize: "7.5px" }}>Date / วันที่: {formatDate(car.issuedAt)}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3. Section 2 Header */}
          <div className="section-title">
            2. Cause Analysis & Action Plan / การวิเคราะห์สาเหตุและแผนการแก้ไขป้องกัน
          </div>

          {/* Section 2 Content */}
          <table style={{ marginBottom: "6px" }}>
            <tbody>
              {car.response ? (
                <>
                  <tr>
                    <td style={{ width: "50%" }}>
                      <strong>Responder (ผู้ตอบกลับ):</strong> {car.response.responder.name || "-"} ({car.response.responderPosition})
                    </td>
                    <td style={{ width: "50%" }}>
                      <strong>Responded Date (วันที่ตอบกลับ):</strong> {formatDate(car.response.respondedAt)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: "4px" }}>
                      <strong>Root Cause Classification / การจำแนกสาเหตุรากเหง้า:</strong>
                      <div style={{ marginTop: "3px" }}>
                        <span className="checkbox-item">
                          <span className={`checkbox-box ${car.response.rootCausePerson ? "checked" : ""}`}></span>
                          <span>Person / คน</span>
                        </span>
                        <span className="checkbox-item">
                          <span className={`checkbox-box ${car.response.rootCauseMaterial ? "checked" : ""}`}></span>
                          <span>Material / วัตถุดิบ</span>
                        </span>
                        <span className="checkbox-item">
                          <span className={`checkbox-box ${car.response.rootCauseMachine ? "checked" : ""}`}></span>
                          <span>Machine / เครื่องจักร</span>
                        </span>
                        <span className="checkbox-item">
                          <span className={`checkbox-box ${car.response.rootCauseMethod ? "checked" : ""}`}></span>
                          <span>Method / วิธีการ</span>
                        </span>
                        <span className="checkbox-item">
                          <span className={`checkbox-box ${car.response.rootCauseOther ? "checked" : ""}`}></span>
                          <span>Other / อื่นๆ {car.response.rootCauseOtherDetail ? `(${car.response.rootCauseOtherDetail})` : ""}</span>
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* 5 Whys or Cause Analysis Detail */}
                  {car.response.responseType === "FIVE_WHY" && car.response.fiveWhys && car.response.fiveWhys.length > 0 ? (
                    <tr>
                      <td colSpan={2}>
                        <strong>5 Whys Analysis / การวิเคราะห์หาสาเหตุด้วย 5 Whys:</strong>
                        <div style={{ marginTop: "3px", paddingLeft: "8px" }}>
                          {car.response.fiveWhys.map((why, idx) => (
                            <div key={idx} style={{ marginBottom: "2px" }}>
                              <strong>Why {idx + 1}:</strong> {why.question || "-"} ➔ <strong>Ans:</strong> {why.answer || "-"}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={2}>
                        <strong>Cause Analysis Details / รายละเอียดการวิเคราะห์สาเหตุ:</strong>
                        <div style={{ marginTop: "3px", whiteSpace: "pre-wrap" }}>
                          {car.response.whyAnalysis || car.response.additionalToolDetail || "—"}
                        </div>
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td colSpan={2}>
                      <strong>Root Cause Summary / สรุปสาเหตุหลัก:</strong>
                      <div style={{ marginTop: "3px", whiteSpace: "pre-wrap" }}>{car.response.rootCauseSummary}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2}>
                      <strong>Immediate Action / มาตรการแก้ไขเร่งด่วน:</strong>
                      <div style={{ marginTop: "3px", whiteSpace: "pre-wrap" }}>{car.response.immediateAction}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2}>
                      <strong>Preventive Action Plan / มาตรการป้องกันการเกิดซ้ำ:</strong>
                      <div style={{ marginTop: "3px", whiteSpace: "pre-wrap" }}>{car.response.preventiveAction}</div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Target Completion Date (กำหนดเสร็จสิ้น):</strong> {formatDate(car.response.plannedCompletionDate)}
                    </td>
                    <td className="text-right" style={{ padding: "4px 8px" }}>
                      <div style={{ display: "inline-block", textAlign: "center" }}>
                        <div style={{ minHeight: "34px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {car.response.responderSignaturePath ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={car.response.responderSignaturePath} alt="Responder Signature" className="signature-img" />
                          ) : (
                            <div style={{ color: "#aaa", fontSize: "7.5px" }}>(ยังไม่ได้ลงชื่อ / Not signed)</div>
                          )}
                        </div>
                        <div style={{ borderTop: "1px solid #000", width: "160px", margin: "2px auto 0 auto" }}></div>
                        <div style={{ fontSize: "8px" }}>Responder Signature / ลายเซ็นผู้รับผิดชอบแก้ไข</div>
                        <div style={{ fontSize: "7.5px" }}>Date / วันที่: {formatDate(car.response.respondedAt)}</div>
                      </div>
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={2} className="text-center" style={{ padding: "16px", color: "#666" }}>
                    (รอการตอบกลับแผนการแก้ไขจากหน่วยงาน / Awaiting response action plan)
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 4. MR Review of Action Plan Section */}
          <div className="section-title">
            3. Management Representative (MR) Plan Review / การตรวจสอบและอนุมัติแผนงานของ MR
          </div>
          <table style={{ marginBottom: "6px" }}>
            <tbody>
              {car.mrResponseReview ? (
                <tr>
                  <td style={{ width: "65%" }}>
                    <strong>Review Action / ผลการพิจารณาแผน:</strong>{" "}
                    {car.mrResponseReview.action === "APPROVED" ? (
                      <strong className="text-emerald-700">APPROVED / อนุมัติแผนงาน</strong>
                    ) : (
                      <strong className="text-rose-700">REJECTED / ส่งคืนแก้ไขแผนงาน</strong>
                    )}
                    <div style={{ marginTop: "4px" }}>
                      <strong>Comments / ข้อคิดเห็น:</strong> {car.mrResponseReview.comment || "—"}
                    </div>
                  </td>
                  <td style={{ width: "35%" }} className="text-center">
                    <div style={{ display: "inline-block", textAlign: "center" }}>
                      <div style={{ minHeight: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {/* Use custom signature path or placeholder */}
                        <div style={{ fontSize: "8px", fontWeight: "bold" }}>{car.mrResponseReview.mrUser.name}</div>
                      </div>
                      <div style={{ borderTop: "1px solid #000", width: "140px", margin: "2px auto 0 auto" }}></div>
                      <div style={{ fontSize: "7.5px" }}>MR Signature / ลายเซ็น MR</div>
                      <div style={{ fontSize: "7.5px" }}>Date / วันที่: {formatDate(car.mrResponseReview.reviewedAt)}</div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={2} className="text-center" style={{ padding: "8px", color: "#666" }}>
                    (รอ MR ตรวจสอบแผนงาน / Awaiting MR plan review)
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 5. Section 4 Follow-up & Verification */}
          <div className="section-title">
            4. Follow-up & Verification Rounds / การตรวจสอบติดตามผลการดำเนินงาน
          </div>

          <table style={{ marginBottom: "6px" }}>
            <thead>
              <tr className="text-center font-bold bg-gray" style={{ fontSize: "8.5px" }}>
                <th style={{ width: "8%" }}>Round</th>
                <th style={{ width: "50%" }}>Findings & Evidence / รายละเอียดการตรวจติดตาม</th>
                <th style={{ width: "15%" }}>Result / ผลตรวจ</th>
                <th style={{ width: "27%" }}>Verifier Signature / ผู้ติดตาม</th>
              </tr>
            </thead>
            <tbody>
              {/* Render existing verifications up to 2 rounds */}
              {Array.from({ length: 2 }).map((_, idx) => {
                const roundNum = idx + 1;
                const verify = car.verifications.find(v => v.round === roundNum);

                if (verify) {
                  return (
                    <tr key={verify.id}>
                      <td className="text-center font-bold" style={{ verticalAlign: "middle" }}>{roundNum}</td>
                      <td>
                        <div style={{ whiteSpace: "pre-wrap" }}>{verify.findings}</div>
                        {verify.result === "FAILED" && verify.nextDueDate && (
                          <div style={{ marginTop: "4px", fontSize: "8px", color: "#b91c1c" }}>
                            <strong>Next due date / กำหนดติดตามครั้งถัดไป:</strong> {formatDate(verify.nextDueDate)}
                          </div>
                        )}
                      </td>
                      <td className="text-center font-bold" style={{ verticalAlign: "middle" }}>
                        {verify.result === "PASSED" ? (
                          <span style={{ color: "#047857" }}>PASSED / ผ่าน</span>
                        ) : (
                          <span style={{ color: "#b91c1c" }}>FAILED / ไม่ผ่าน</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div style={{ minHeight: "26px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {verify.verifierSignaturePath ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={verify.verifierSignaturePath} alt={`Verifier Round ${roundNum}`} className="signature-img" />
                          ) : (
                            <span style={{ fontSize: "8px" }}>{verify.verifier.name}</span>
                          )}
                        </div>
                        <div style={{ borderTop: "1px solid #000", width: "100px", margin: "1px auto 0 auto" }}></div>
                        <div style={{ fontSize: "7.5px" }}>Date: {formatDate(verify.verifiedAt)}</div>
                      </td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={`empty-${roundNum}`} style={{ height: "36px" }}>
                      <td className="text-center font-bold" style={{ verticalAlign: "middle", color: "#bbb" }}>{roundNum}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>

          {/* 6. Section 5 Final Closure */}
          <div className="section-title">
            5. CAR Final Closure Sign-off / การปิดงานและยกเลิก CAR โดย MR
          </div>
          <table style={{ marginBottom: "2px" }}>
            <tbody>
              {car.mrSignature ? (
                <tr>
                  <td style={{ width: "65%" }}>
                    <div className="font-bold text-emerald-800">
                      STATUS: CLOSED / ปิดงานอย่างเป็นทางการ
                    </div>
                    <div style={{ marginTop: "4px" }}>
                      <strong>Comments / ข้อคิดเห็นท้ายสุด:</strong> {car.mrSignature.comment || "—"}
                    </div>
                  </td>
                  <td style={{ width: "35%" }} className="text-center">
                    <div style={{ display: "inline-block", textAlign: "center" }}>
                      <div style={{ minHeight: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {car.mrSignature.mrUser.name ? (
                          <div style={{ fontSize: "8px", fontWeight: "bold" }}>{car.mrSignature.mrUser.name}</div>
                        ) : (
                          <div style={{ color: "#aaa", fontSize: "7.5px" }}>(ยังไม่ได้ลงชื่อ)</div>
                        )}
                      </div>
                      <div style={{ borderTop: "1px solid #000", width: "140px", margin: "2px auto 0 auto" }}></div>
                      <div style={{ fontSize: "7.5px" }}>MR Signature / ลายเซ็นปิด CAR</div>
                      <div style={{ fontSize: "7.5px" }}>Date / วันที่: {formatDate(car.mrSignature.signedAt)}</div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={2} className="text-center" style={{ padding: "8px", color: "#666" }}>
                    (รอการลงนามปิด CAR โดย MR / Awaiting final MR signature to close CAR)
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer prefix metadata */}
          <div className="footer-note">
            {footerPrefix} - {primaryTitle}
          </div>

        </div>
      </div>
    </>
  );
}

function splitBilingualLabel(label: string): [string, string] {
  const parts = label
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return [parts[0], parts[1]];
  }

  const single = parts[0] || label.trim() || "Corrective Action Request / Preventive Action (CAR)";
  return [single, single];
}
