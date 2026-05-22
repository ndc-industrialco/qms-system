"use client";

type Props = { kpiOk: number; kpiNg: number; kpiPending: number; kpiTotal: number; isTh: boolean };

const CARDS = (p: Props) => [
  {
    label: p.isTh ? "ตัวชี้วัดทั้งหมด" : "Total KPI",
    sub: p.isTh ? "ประจำเดือน" : "This Month",
    value: p.kpiTotal,
    grad: "linear-gradient(135deg,#0F1059 0%,#1D6A8A 100%)",
    glow: "rgba(29,106,138,0.35)",
    delay: "0ms",
  },
  {
    label: "OK",
    sub: p.isTh ? "ผ่านแล้ว" : "Passed",
    value: p.kpiOk,
    grad: "linear-gradient(135deg,#064E3B 0%,#10B981 100%)",
    glow: "rgba(16,185,129,0.3)",
    delay: "80ms",
  },
  {
    label: "NG",
    sub: p.isTh ? "ไม่ผ่าน" : "Failed",
    value: p.kpiNg,
    grad: "linear-gradient(135deg,#7F1D1D 0%,#EF4444 100%)",
    glow: "rgba(239,68,68,0.3)",
    delay: "160ms",
  },
  {
    label: p.isTh ? "รอดำเนินการ" : "Pending",
    sub: p.isTh ? "รอผล" : "In Review",
    value: p.kpiPending,
    grad: "linear-gradient(135deg,#78350F 0%,#F59E0B 100%)",
    glow: "rgba(245,158,11,0.3)",
    delay: "240ms",
  },
];

export default function DashboardKpiStrip({ kpiOk, kpiNg, kpiPending, kpiTotal, isTh }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {CARDS({ kpiOk, kpiNg, kpiPending, kpiTotal, isTh }).map((c) => (
        <div key={c.label}
          className="relative overflow-hidden rounded-xl p-5 cursor-default select-none transition-transform duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
          style={{ background: c.grad, boxShadow: `0 4px 24px ${c.glow}, 0 1px 4px rgba(0,0,0,0.2)` }}>
          {/* Diagonal stripe decoration */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle,#fff,transparent 70%)" }} />
          <div className="absolute bottom-0 right-0 w-12 h-12 opacity-[0.07]"
            style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)", backgroundSize: "6px 6px" }} />

          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 mb-2">{c.label}</p>
          <p className="text-4xl font-black text-white font-mono leading-none">{c.value}</p>
          <p className="text-[11px] text-white/50 mt-2">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
