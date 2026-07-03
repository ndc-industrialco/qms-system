"use client";

import React, { useState } from "react";

// ---------------------------------------------------------
// Types
// ---------------------------------------------------------
export interface ChartDataItem {
  label: string;
  value: number;
  secondaryValue?: number; // Used for target vs actual comparison
  color?: string;
}

interface BarChartProps {
  data: ChartDataItem[];
  title: string;
  valueLabel?: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  isExportMode?: boolean;
}

interface DonutChartProps {
  data: ChartDataItem[];
  title: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  isExportMode?: boolean;
}

// ---------------------------------------------------------
// Donut / Pie Chart Component
// ---------------------------------------------------------
export function DonutChart({ data, title, selected = true, onToggleSelect, isExportMode }: DonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  // Pre-defined slate/emerald/amber/rose color palette that matches design system
  const defaultColors = [
    "#0F1059", // Primary
    "#0284c7", // Info / Sky-600
    "#10b981", // Success / Emerald-500
    "#f59e0b", // Warning / Amber-500
    "#f43f5e", // Danger / Rose-500
    "#8b5cf6", // Violet-500
    "#64748b", // Slate-500
  ];

  // Prepare chart segments
  let accumulatedPercent = 0;
  const segments = data.map((item, idx) => {
    const value = item.value;
    const percent = total > 0 ? value / total : 0;
    const strokeLength = percent * 314.159;
    const strokeOffset = 314.159 - accumulatedPercent * 314.159;
    accumulatedPercent += percent;

    return {
      ...item,
      percent,
      strokeLength,
      strokeOffset,
      color: item.color || defaultColors[idx % defaultColors.length],
    };
  });

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 ${
        selected ? "ring-2 ring-[#0F1059]/20" : ""
      } ${isExportMode && !selected ? "opacity-40 print:hidden" : ""}`}
    >
      {/* Selection Overlay (only in export mode) */}
      {isExportMode && onToggleSelect && (
        <div className="absolute top-4 right-4 z-10 no-print">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 font-medium select-none">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="rounded text-[#0F1059] focus:ring-[#0F1059] border-slate-300 h-4 w-4"
            />
            เลือกพิมพ์
          </label>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>
        {total === 0 ? (
          <div className="flex h-[180px] flex-col items-center justify-center text-slate-400">
            <p className="text-xs">ไม่มีข้อมูลสำหรับแสดงผล</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* SVG Donut */}
            <div className="relative w-[150px] h-[150px] shrink-0">
              <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                {segments.map((seg, idx) => (
                  <circle
                    key={seg.label}
                    cx="60"
                    cy="60"
                    r="50"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={hoveredIdx === idx ? "16" : "12"}
                    strokeDasharray={`${seg.strokeLength} 314.159`}
                    strokeDashoffset={seg.strokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                ))}
              </svg>

              {/* Tooltip in the center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {hoveredIdx !== null ? (
                  <>
                    <span className="text-[10px] text-slate-500 font-medium truncate max-w-[90px]">
                      {segments[hoveredIdx].label}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {segments[hoveredIdx].value} ({Math.round(segments[hoveredIdx].percent * 100)}%)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-slate-500 font-medium">ทั้งหมด</span>
                    <span className="text-lg font-bold text-slate-900">{total}</span>
                  </>
                )}
              </div>
            </div>

            {/* Legends */}
            <div className="flex-1 w-full space-y-2">
              {segments.map((seg, idx) => (
                <div
                  key={seg.label}
                  className={`flex items-center justify-between text-xs p-1 rounded transition-colors duration-150 ${
                    hoveredIdx === idx ? "bg-slate-50 font-semibold" : ""
                  }`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-slate-700 truncate">{seg.label}</span>
                  </div>
                  <span className="text-slate-950 font-medium shrink-0">
                    {seg.value} ({Math.round(seg.percent * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Bar Chart Component (Responsive, supports values)
// ---------------------------------------------------------
export function BarChart({ data, title, valueLabel = "จำนวน", selected = true, onToggleSelect, isExportMode }: BarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  const chartHeight = 160;
  const barPadding = 12;
  const totalWidth = 400;
  const colWidth = data.length > 0 ? (totalWidth - 30) / data.length : totalWidth;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 ${
        selected ? "ring-2 ring-primary/20" : ""
      } ${isExportMode && !selected ? "opacity-40 print:hidden" : ""}`}
    >
      {/* Selection Overlay (only in export mode) */}
      {isExportMode && onToggleSelect && (
        <div className="absolute top-4 right-4 z-10 no-print">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 font-medium select-none">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="rounded text-[#0F1059] focus:ring-[#0F1059] border-slate-300 h-4 w-4"
            />
            เลือกพิมพ์
          </label>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>
        {total === 0 ? (
          <div className="flex h-[180px] flex-col items-center justify-center text-slate-400">
            <p className="text-xs">ไม่มีข้อมูลสำหรับแสดงผล</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* SVG Bar Chart */}
            <div className="w-full">
              <svg viewBox={`0 0 ${totalWidth} 200`} className="w-full h-auto overflow-visible">
                {/* Horizontal Grid lines */}
                {Array.from({ length: 5 }).map((_, idx) => {
                  const val = Math.round((maxValue / 4) * idx);
                  const y = chartHeight - (val / maxValue) * chartHeight;
                  return (
                    <g key={idx} className="opacity-10">
                      <line x1="25" y1={y} x2={totalWidth} y2={y} stroke="#000" strokeWidth="1" />
                      <text x="0" y={y + 3} fontSize="8" textAnchor="start">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {data.map((item, idx) => {
                  const barHeight = (item.value / maxValue) * chartHeight;
                  const x = 30 + idx * colWidth;
                  const y = chartHeight - barHeight;
                  const width = Math.max(4, colWidth - barPadding);

                  return (
                    <g key={item.label}>
                      {/* Bar Rectangle */}
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={Math.max(2, barHeight)}
                        fill={hoveredIdx === idx ? "#161875" : "#0F1059"}
                        rx="3"
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />

                      {/* Value above bar */}
                      <text
                        x={x + width / 2}
                        y={y - 5}
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        fill={hoveredIdx === idx ? "#0F1059" : "#475569"}
                        className="pointer-events-none"
                      >
                        {item.value > 0 ? item.value : ""}
                      </text>

                      {/* X Axis Label */}
                      <text
                        x={x + width / 2}
                        y={chartHeight + 15}
                        fontSize="8"
                        textAnchor="middle"
                        fill="#475569"
                        className="pointer-events-none"
                        style={{ textOverflow: "ellipsis", width: `${width}px` }}
                      >
                        {item.label.length > 10 ? item.label.slice(0, 8) + ".." : item.label}
                      </text>
                    </g>
                  );
                })}

                {/* Axis line */}
                <line x1="25" y1={chartHeight} x2={totalWidth} y2={chartHeight} stroke="#475569" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Legend / Stats Details */}
            {hoveredIdx !== null && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center text-xs animate-in fade-in duration-150">
                <span className="font-semibold text-slate-800">{data[hoveredIdx].label}:</span>{" "}
                <span className="font-bold text-[#0F1059]">
                  {data[hoveredIdx].value} {valueLabel}
                </span>{" "}
                ({Math.round((data[hoveredIdx].value / total) * 100)}%)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Target vs Actual Comparison Performance Chart (KPIs)
// ---------------------------------------------------------
export function KpiPerformanceChart({
  data,
  title,
  selected = true,
  onToggleSelect,
  isExportMode,
}: {
  data: ChartDataItem[];
  title: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  isExportMode?: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Calculate scales
  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.value, d.secondaryValue ?? 0))
  );

  const chartHeight = 160;
  const barPadding = 16;
  const totalWidth = 500;
  const colWidth = data.length > 0 ? (totalWidth - 40) / data.length : totalWidth;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 ${
        selected ? "ring-2 ring-primary/20" : ""
      } ${isExportMode && !selected ? "opacity-40 print:hidden" : ""}`}
    >
      {/* Selection Overlay (only in export mode) */}
      {isExportMode && onToggleSelect && (
        <div className="absolute top-4 right-4 z-10 no-print">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 font-medium select-none">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="rounded text-[#0F1059] focus:ring-[#0F1059] border-slate-300 h-4 w-4"
            />
            เลือกพิมพ์
          </label>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {/* Chart Legends */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#0F1059] rounded" />
              <span className="text-slate-600 font-medium">ผลการดำเนินงาน (Actual)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-500 rounded" />
              <span className="text-slate-600 font-medium">เป้าหมาย (Target)</span>
            </div>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex h-[180px] flex-col items-center justify-center text-slate-400">
            <p className="text-xs">ไม่มีข้อมูลสำหรับแสดงผล</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full">
              <svg viewBox={`0 0 ${totalWidth} 200`} className="w-full h-auto overflow-visible">
                {/* Horizontal Grid lines */}
                {Array.from({ length: 5 }).map((_, idx) => {
                  const val = Math.round((maxVal / 4) * idx * 10) / 10;
                  const y = chartHeight - (val / maxVal) * chartHeight;
                  return (
                    <g key={idx} className="opacity-10">
                      <line x1="30" y1={y} x2={totalWidth} y2={y} stroke="#000" strokeWidth="1" />
                      <text x="0" y={y + 3} fontSize="8" textAnchor="start">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Draw Groups of Bars */}
                {data.map((item, idx) => {
                  const actualHeight = (item.value / maxVal) * chartHeight;
                  const targetHeight = ((item.secondaryValue ?? 0) / maxVal) * chartHeight;

                  const xGroup = 35 + idx * colWidth;
                  const width = (colWidth - barPadding) / 2;

                  const xActual = xGroup;
                  const yActual = chartHeight - actualHeight;

                  const xTarget = xGroup + width + 2;
                  const yTarget = chartHeight - targetHeight;

                  return (
                    <g key={item.label}>
                      {/* Actual Performance Bar (Primary Color) */}
                      <rect
                        x={xActual}
                        y={yActual}
                        width={width}
                        height={Math.max(2, actualHeight)}
                        fill="#0F1059"
                        rx="2"
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />

                      {/* Target Performance Bar (Amber Color) */}
                      <rect
                        x={xTarget}
                        y={yTarget}
                        width={width}
                        height={Math.max(2, targetHeight)}
                        fill="#f59e0b"
                        rx="2"
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />

                      {/* X Axis Label */}
                      <text
                        x={xGroup + width}
                        y={chartHeight + 15}
                        fontSize="8"
                        textAnchor="middle"
                        fill="#475569"
                        className="pointer-events-none"
                      >
                        {item.label}
                      </text>
                    </g>
                  );
                })}

                {/* Axis line */}
                <line x1="30" y1={chartHeight} x2={totalWidth} y2={chartHeight} stroke="#475569" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Hover details */}
            {hoveredIdx !== null && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center text-xs animate-in fade-in duration-150">
                <span className="font-semibold text-slate-800">{data[hoveredIdx].label}:</span>{" "}
                <span>ผลจริง: </span>
                <span className="font-bold text-[#0F1059]">{data[hoveredIdx].value}</span>
                <span className="mx-2">|</span>
                <span>เป้าหมาย: </span>
                <span className="font-bold text-amber-600">{data[hoveredIdx].secondaryValue ?? 0}</span>
                <span className="ml-2 font-semibold">
                  (อัตราสำเร็จ:{" "}
                  {data[hoveredIdx].secondaryValue
                    ? Math.round((data[hoveredIdx].value / data[hoveredIdx].secondaryValue) * 100)
                    : 0}
                  %)
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
