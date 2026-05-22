"use client";

interface Props { kpiOk: number; kpiNg: number; kpiPending: number; kpiTotal: number; isTh: boolean }

const LEGEND = (p: Props) => [
  { label: "OK", value: p.kpiOk, color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  { label: "NG", value: p.kpiNg, color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  { label: p.isTh ? "รอ" : "Pending", value: p.kpiPending, color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
];

export default function DashboardKpiWidget({ kpiOk, kpiNg, kpiPending, kpiTotal, isTh }: Props) {
  if (kpiTotal === 0) {
    return (
      <div className="py-4 text-center">
        <div className="w-20 h-20 rounded-full border-4 border-dashed border-base-300 mx-auto flex items-center justify-center">
          <span className="text-[11px] text-gray-400">{isTh ? "ไม่มีข้อมูล" : "No data"}</span>
        </div>
      </div>
    );
  }

  const okPct = (kpiOk / kpiTotal) * 100;
  const ngPct = ((kpiOk + kpiNg) / kpiTotal) * 100;

  // CSS conic-gradient ring
  const ringStyle = {
    background: `conic-gradient(
      #10B981 0% ${okPct}%,
      #EF4444 ${okPct}% ${ngPct}%,
      #F59E0B ${ngPct}% 100%
    )`,
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Ring chart */}
      <div className="relative w-28 h-28 rounded-full flex items-center justify-center" style={ringStyle}>
        {/* Center hole */}
        <div className="absolute w-[72px] h-[72px] rounded-full bg-white flex flex-col items-center justify-center">
          <span className="text-2xl font-black font-mono text-primary leading-none">{kpiTotal}</span>
          <span className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">
            {isTh ? "ทั้งหมด" : "total"}
          </span>
        </div>
      </div>

      {/* Legend bars */}
      <div className="w-full space-y-2.5">
        {LEGEND({ kpiOk, kpiNg, kpiPending, kpiTotal, isTh }).map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                <span className="text-xs font-semibold text-neutral">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400">
                  {kpiTotal ? Math.round((item.value / kpiTotal) * 100) : 0}%
                </span>
                <span className="text-xs font-mono font-bold w-5 text-right" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-base-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${kpiTotal ? (item.value / kpiTotal) * 100 : 0}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
