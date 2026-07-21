"use client";

import React, { useState } from "react";
import { ChartPieIcon } from "./DashboardIcons";
import { BookOpen, CheckCircle, GraduationCap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Counts = { A: number; B: number; C: number; D: number; E: number };
type ProdiStat = { prodi: string; count: number };

const PRODI_COLORS = [
  { colorVar: "var(--color-chart-2)", bgClass: "bg-chart-2/10", textClass: "text-chart-2", indicatorClass: "bg-chart-2" },
  { colorVar: "var(--color-chart-3)", bgClass: "bg-chart-3/10", textClass: "text-chart-3", indicatorClass: "bg-chart-3" },
  { colorVar: "var(--color-chart-1)", bgClass: "bg-chart-1/10", textClass: "text-chart-1", indicatorClass: "bg-chart-1" },
  { colorVar: "var(--color-chart-4)", bgClass: "bg-chart-4/10", textClass: "text-chart-4", indicatorClass: "bg-chart-4" },
  { colorVar: "var(--color-chart-5)", bgClass: "bg-chart-5/10", textClass: "text-chart-5", indicatorClass: "bg-chart-5" },
];

export function GradeDonutChart({
  counts,
  total,
  role = "mahasiswa",
  myIPK = "0.00",
  totalSKS = 0,
  jenjang = "S1",
  prodiStats = [],
  prodiName = "Teknik Informatika",
  currentSmt = 1,
}: {
  counts: Counts;
  total: number;
  role?: string;
  myIPK?: string;
  totalSKS?: number;
  jenjang?: string;
  prodiStats?: ProdiStat[];
  prodiName?: string;
  currentSmt?: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const isMahasiswa = role === "mahasiswa";

  // =========================================================================
  // VIEW 1: ROLE MAHASISWA - CAPAIAN KURIKULUM & SKS (DESAIN ELEGAN & REALISTIS)
  // =========================================================================
  if (isMahasiswa) {
    const targetSKS = jenjang.includes("D3") ? 108 : 144;
    const progressPercent = Math.min(Math.round((totalSKS / targetSKS) * 100), 100);
    const sisaSKS = Math.max(0, targetSKS - totalSKS);

    return (
      <section className="lg:col-span-3 rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden h-full">
        {/* Header */}
        <header className="px-6 py-5 border-b border-border bg-muted/20 flex items-center justify-between">
          <h3 className="font-semibold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Capaian Pembelajaran
          </h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-muted/50 text-muted-foreground border-border">
            Semeter {currentSmt}
          </span>
        </header>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
          {/* Main Progress Ring & Summary */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Progres SKS Lulus
              </span>
              <span className="text-2xl font-black text-foreground">
                {progressPercent}%
              </span>
            </div>

            {/* Clean Progress Bar */}
            <div className="w-full bg-muted/60 rounded-full h-3.5 overflow-hidden p-0.5 border border-border/40">
              <div
                className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(progressPercent, 3)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground font-medium pt-0.5">
              <span>{totalSKS} SKS Lulus</span>
              <span>Target {targetSKS} SKS</span>
            </div>
          </div>

          {/* Clean 2x2 Metric Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">SKS Terpenuhi</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-2">
                {totalSKS} <span className="text-xs font-normal text-muted-foreground">SKS</span>
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Clock className="w-4 h-4 shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Sisa SKS</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-2">
                {sisaSKS} <span className="text-xs font-normal text-muted-foreground">SKS</span>
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Mata Kuliah</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-2">
                {total} <span className="text-xs font-normal text-muted-foreground">Matkul</span>
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">IPK Terakhir</span>
              </div>
              <span className="text-lg font-bold text-foreground mt-2">
                {myIPK} <span className="text-xs font-normal text-muted-foreground">/ 4.00</span>
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // VIEW 2: ROLE ADMIN / DOSEN / SUPERUSER - SEBARAN MAHASISWA PER PRODI (DATA DATABASE REAL)
  // =========================================================================
  const displayProdi = prodiStats.length > 0 ? prodiStats : [
    { prodi: "Teknik Informatika", count: 0 },
    { prodi: "Sistem Informasi", count: 0 },
    { prodi: "Rekayasa Perangkat Lunak", count: 0 },
    { prodi: "Manajemen Informatika", count: 0 },
    { prodi: "Komputerisasi Akuntansi", count: 0 },
  ];

  const totalVal = displayProdi.reduce((s, p) => s + p.count, 0);

  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let currentAngle = -90;

  const segments = displayProdi.map((item, index) => {
    const percentage = totalVal > 0 ? item.count / totalVal : 0;
    const strokeLength = percentage * circumference;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    const config = PRODI_COLORS[index % PRODI_COLORS.length];

    return {
      index,
      label: item.prodi,
      value: item.count,
      percentage: totalVal > 0 ? Math.round(percentage * 100) : 0,
      strokeLength: Math.max(0, strokeLength),
      rotation: startAngle,
      config,
    };
  });

  return (
    <section className="lg:col-span-3 rounded-xl border border-border bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden h-full">
      <header className="px-6 py-5 border-b border-border bg-muted/20 flex items-center justify-between">
        <h3 className="font-semibold tracking-tight text-foreground flex items-center gap-2">
          <ChartPieIcon className="w-4 h-4 text-primary" />
          Sebaran Mahasiswa per Prodi
        </h3>
      </header>

      <div className="p-6 flex-1 flex flex-col items-center justify-between min-h-[320px]">
        {/* Donut Chart */}
        <div className="relative group my-2">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-44 h-44 transform transition-transform duration-300">
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted/15"
            />
            {totalVal > 0 && segments.map((seg) => {
              const isHovered = hoveredIndex === seg.index;
              const isDimmed = hoveredIndex !== null && hoveredIndex !== seg.index;

              return (
                <circle
                  key={seg.index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={seg.config.colorVar}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${seg.strokeLength} ${circumference}`}
                  strokeDashoffset={0}
                  transform={`rotate(${seg.rotation} ${center} ${center})`}
                  className={cn(
                    "transition-all duration-300 ease-out cursor-pointer",
                    isDimmed ? "opacity-20" : "opacity-100"
                  )}
                  onMouseEnter={() => setHoveredIndex(seg.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <span className="text-3xl font-black tracking-tighter text-foreground">
              {hoveredIndex !== null ? segments[hoveredIndex].value : totalVal}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              {hoveredIndex !== null ? "Mahasiswa" : "Total Mahasiswa"}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full space-y-1.5 mt-3">
          {segments.map((seg) => (
            <div
              key={seg.index}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-default border border-transparent",
                hoveredIndex === seg.index ? seg.config.bgClass : "hover:bg-muted/50"
              )}
              onMouseEnter={() => setHoveredIndex(seg.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center gap-2 truncate">
                <span className={cn("w-2.5 h-2.5 rounded-xs shrink-0", seg.config.indicatorClass)} />
                <span className="truncate text-muted-foreground font-medium">{seg.label}</span>
              </div>
              <span className="font-bold text-foreground ml-2 shrink-0">{seg.value} ({seg.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}