import React from "react";
import { getSession } from "@/app/actions/auth";
import { getStudents, getStudentByNim } from "@/app/actions/students";
import { getCourses } from "@/app/actions/courses";

import {
  calculateIPK,
  calculateTotalSKSLulus,
  calculateSemesterTrend,
} from "@/lib/grade-calculations";

import { 
  calculateGradeDistribution,
  calculateSemesterTrend as calculateAdminTrend 
} from "@/lib/dashboard-helper";

import DashboardClient from "./DashboardClient";
import { StudentData } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) return null;

  let stats: any[] = [];
  let trendData: any[] = [];
  let gradeDistData = { counts: { A: 0, B: 0, C: 0, D: 0, E: 0 }, totalGrades: 0, totalAM: 0 };
  let prodiStats: { prodi: string; count: number }[] = [];
  let prodiName: string = "Teknik Informatika";
  let currentSmt: number = 1;

  const isMahasiswa = user.role === "mahasiswa";
  const username = user.username;

  let student: StudentData | null = null;

  if (isMahasiswa) {
    student = await getStudentByNim(username);

    if (student) {
      const myIPK = calculateIPK(student.transcript);
      const totalSKS = calculateTotalSKSLulus(student.transcript);
      
      currentSmt = student.profile.semester; 
      trendData = calculateSemesterTrend(student.transcript, currentSmt); 
      const totalMK = student.transcript.length;
      
      prodiName = student.profile?.study_program?.nama || "Teknik Informatika";
      const jenjang = student.profile?.study_program?.jenjang || "S1";
      const targetSKS = jenjang.includes("D3") ? 108 : 144;
      const sisaSKS = Math.max(0, targetSKS - totalSKS);

      let deskripsiSKS = sisaSKS > 0 ? `${sisaSKS} SKS lagi untuk Lulus.` : "Syarat SKS Terpenuhi";

      stats = [
        {
          label: "Total IPK",
          value: myIPK, 
          description: "Skala Indeks 4.00", 
          iconType: "award",
          themeColor: "chart-1",
        },
        {
          label: "Total SKS Lulus",
          value: totalSKS.toString(),
          description: deskripsiSKS,
          iconType: "activity", 
          themeColor: "chart-2",
        },
        {
          label: "Mata Kuliah",
          value: totalMK.toString(),
          description: "Akumulasi Mata Kuliah Diambil", 
          iconType: "library",
          themeColor: "chart-3",
        },
        {
          label: "Semester",
          value: `${currentSmt}`,
          description: "Periode Akademik Aktif", 
          iconType: "calendar",
          themeColor: "chart-4",
        },
      ];
      
      gradeDistData = calculateGradeDistribution([student]);
    } else {
      stats = [{ label: "Data Tidak Ditemukan", value: "-", description: "-", iconType: "users", themeColor: "chart-1" }];
    }

  } else {
    // --- SERVER SIDE LOGIC FOR ADMIN / DOSEN / SUPERUSER ---
    const [students, courses] = await Promise.all([
      getStudents(),
      getCourses()
    ]);

    const currentStudentCount = students.length;
    let totalIPK = 0;
    const prodiMap = new Map<string, number>();

    students.forEach((s) => {
      totalIPK += parseFloat(calculateIPK(s.transcript));
      const pName = s.profile?.study_program?.nama || "Lainnya";
      prodiMap.set(pName, (prodiMap.get(pName) || 0) + 1);
    });
    
    const avgIPK = currentStudentCount > 0 ? (totalIPK / currentStudentCount).toFixed(2) : "0.00";
    
    prodiStats = Array.from(prodiMap.entries()).map(([prodi, count]) => ({
      prodi,
      count,
    }));

    gradeDistData = calculateGradeDistribution(students);
    trendData = calculateAdminTrend(students);
    
    const avgGradePoint = gradeDistData.totalGrades > 0 ? (gradeDistData.totalAM / gradeDistData.totalGrades).toFixed(2) : "0.00";
    
    stats = [
      {
        label: "Total Mahasiswa",
        value: currentStudentCount.toLocaleString(),
        description: "Mahasiswa Terdaftar",
        iconType: "users", 
        themeColor: "chart-1",
      },
      {
        label: "Total Mata Kuliah",
        value: courses.length.toString(),
        description: "MK Dalam Kurikulum",
        iconType: "library", 
        themeColor: "chart-2",
      },
      {
        label: "Rata-rata Nilai Mutu",
        value: avgGradePoint,
        description: "Standar Mutu Akademik",
        iconType: "award", 
        themeColor: "chart-3",
      },
      {
        label: "Rata-rata IPK",
        value: avgIPK,
        description: "Rata-rata Mahasiswa",
        iconType: "trending", 
        themeColor: "chart-4",
      },
    ];
  }

  return (
    <DashboardClient 
      stats={stats} 
      trendData={trendData} 
      gradeDistData={gradeDistData} 
      role={user.role}
      userName={user.name || "User"} 
      studentId={isMahasiswa && student ? student.profile.id : undefined}
      prodiStats={prodiStats}
      prodiName={prodiName}
      currentSmt={currentSmt}
    />
  );
}