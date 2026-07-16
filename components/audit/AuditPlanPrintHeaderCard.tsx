/* eslint-disable @next/next/no-img-element */
// Print-style header/signature block shared between audit/plans/[id] and the reviewer/approver pages,
// mirroring the look of print/audit/plan/[id] (FM-MR-07) without the printer-only page chrome.

type Signoff = {
  signedRole: string;
  signerNameSnapshot: string | null;
  signaturePath?: string | null;
  signedAt: string;
};

type Props = {
  auditNo: string;
  title: string;
  standards?: string[] | null;
  standard?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  ownerNameSnapshot: string | null;
  reviewerNameSnapshot: string | null;
  approverNameSnapshot: string | null;
  signoffs: Signoff[];
};

function formatDateSign(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "-";
  const fmt = (v: string) => new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start || end)!);
}

export default function AuditPlanPrintHeaderCard({
  auditNo,
  title,
  standards,
  standard,
  startDate,
  endDate,
  ownerNameSnapshot,
  reviewerNameSnapshot,
  approverNameSnapshot,
  signoffs,
}: Props) {
  const reviewerSignoff = signoffs.find((s) => s.signedRole === "REVIEWER");
  const approverSignoff = signoffs.find((s) => s.signedRole === "APPROVER");
  const standardsLabel = standards?.length ? standards.join(", ") : (standard ?? "-");

  const signatureBlocks: Array<{ label: string; name: string | null; signaturePath?: string | null; date: string | null }> = [
    { label: "Prepared by", name: ownerNameSnapshot, signaturePath: null, date: null },
    { label: "Reviewed by", name: reviewerSignoff?.signerNameSnapshot ?? reviewerNameSnapshot, signaturePath: reviewerSignoff?.signaturePath, date: reviewerSignoff?.signedAt ?? null },
    { label: "Approved by", name: approverSignoff?.signerNameSnapshot ?? approverNameSnapshot, signaturePath: approverSignoff?.signaturePath, date: approverSignoff?.signedAt ?? null },
  ];

  return (
    <div className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* Header document table */}
      <table className="w-full border-collapse border-2 border-slate-900 text-slate-900">
        <tbody>
          <tr>
            <td className="w-[18%] border-2 border-slate-900 p-2 text-center align-middle">
              <img src="/logo/logo.webp" alt="NDC INDUSTRIAL" className="mx-auto mb-0.5 h-7 object-contain" />
              <div className="text-[8px] font-black tracking-wider">INDUSTRIAL</div>
            </td>
            <td className="border-2 border-slate-900 p-2 text-center align-middle">
              <div className="text-sm font-bold leading-snug">แผนการตรวจติดตามภายใน / Internal Audit Plan</div>
              <div className="mt-0.5 text-xs text-slate-600">{auditNo} · {title}</div>
            </td>
            <td className="w-[22%] border-2 border-slate-900 p-2 align-middle text-[10px]">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">มาตรฐาน / Standard</span>
                <span className="font-semibold">{standardsLabel}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="font-semibold text-slate-500">ช่วงเวลา / Period</span>
                <span className="font-semibold">{formatDateRange(startDate, endDate)}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature table */}
      <table className="mt-3 w-full border-collapse border-2 border-slate-900 text-slate-900">
        <tbody>
          <tr className="bg-slate-50 text-center text-[10px] font-bold">
            {signatureBlocks.map((b) => (
              <td key={b.label} className="border-2 border-slate-900 p-1.5">{b.label}</td>
            ))}
          </tr>
          <tr className="text-center align-middle">
            {signatureBlocks.map((b) => (
              <td key={b.label} className="border-2 border-slate-900 p-2" style={{ height: 60 }}>
                {b.signaturePath ? (
                  <img src={b.signaturePath} alt={b.label} className="mx-auto max-h-8 max-w-[90%] object-contain" />
                ) : (
                  <div className="h-8" />
                )}
                <div className="mt-1 text-[10px] font-bold text-primary">{b.name || "-"}</div>
              </td>
            ))}
          </tr>
          <tr className="text-[9px] text-slate-600">
            {signatureBlocks.map((b) => (
              <td key={b.label} className="border-2 border-slate-900 p-1.5">
                Date: <span className="font-mono font-bold text-primary">{formatDateSign(b.date)}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
