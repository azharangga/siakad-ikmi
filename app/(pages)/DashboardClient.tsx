"use client";

import React from "react";
import { DashboardHeader } from "@/components/features/dashboard/DashboardHeader";
import { StatCard } from "@/components/features/dashboard/StatCard";
import { SemesterLineChart } from "@/components/features/dashboard/SemesterLineChart";
import { GradeDonutChart } from "@/components/features/dashboard/GradeDonutChart";
import { 
  UsersIcon, 
  LibraryIcon, 
  AwardIcon, 
  TrendingUpIcon 
} from "@/components/features/dashboard/DashboardIcons";
import { Activity, CalendarDays } from "lucide-react";

interface DashboardStat {
  label: string;
  value: string;
  description: string;
  iconType: "users" | "library" | "award" | "trending" | "activity" | "calendar";
  themeColor: "chart-1" | "chart-2" | "chart-3" | "chart-4";
}

interface DashboardClientProps {
  stats: DashboardStat[];
  trendData: { label: string; val: number; height: string }[];
  gradeDistData: { counts: any; totalGrades: number; totalAM: number };
  role: string;
  studentId?: string;
  prodiStats?: { prodi: string; count: number }[];
  prodiName?: string;
  currentSmt?: number;
}

export default function DashboardClient({
  stats,
  trendData,
  gradeDistData,
  role,
  userName,
  studentId,
  prodiStats = [],
  prodiName = "Teknik Informatika",
  currentSmt = 1,
}: DashboardClientProps & { userName: string }) {
  
  const getIcon = (type: string) => {
    switch (type) {
      case "users": return <UsersIcon className="w-6 h-6" />;
      case "library": return <LibraryIcon className="w-6 h-6" />;
      case "award": return <AwardIcon className="w-6 h-6" />;
      case "trending": return <TrendingUpIcon className="w-6 h-6" />;
      case "activity": return <Activity className="w-6 h-6" />;
      case "calendar": return <CalendarDays className="w-6 h-6" />;
      default: return <AwardIcon className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <DashboardHeader name={userName} role={role} studentId={studentId} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, idx) => (
          <StatCard 
            key={idx} 
            label={s.label}
            value={s.value}
            description={s.description}
            themeColor={s.themeColor}
            icon={getIcon(s.iconType)}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <SemesterLineChart 
          data={trendData} 
          title={role === "mahasiswa" ? "Tren IPS Setiap Semester" : "Tren Rata-rata IPS Mahasiswa"} 
        />
        <GradeDonutChart
          counts={gradeDistData.counts}
          total={gradeDistData.totalGrades}
          role={role}
          myIPK={stats[0]?.value || "0.00"}
          totalSKS={parseInt(stats[1]?.value || "0") || 0}
          prodiStats={prodiStats}
          prodiName={prodiName}
          currentSmt={currentSmt}
        />
      </div>
    </div>
  );
}
