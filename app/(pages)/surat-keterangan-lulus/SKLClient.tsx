'use client';

import React from "react";
import PageHeader from "@/components/layout/PageHeader";
import StudentSKLView from "@/components/features/surat-keterangan-lulus/StudentSKLView";
import AdminSKLView from "@/components/features/surat-keterangan-lulus/AdminSKLView";
import { StudentData, StudyProgram, Official, SidangSkripsi, PredikatYudisium } from "@/lib/types";

interface SKLClientProps {
  user: any;
  studentData: StudentData | null;
  officialKaprodi: Official | null;
  officialKetua: Official | null;
  allStudents: StudentData[];
  studyPrograms: StudyProgram[];
  sidang: SidangSkripsi | null;
  sidangMap: Record<string, SidangSkripsi>;
  predikatList: PredikatYudisium[];
}

export default function SKLClient({
  user,
  studentData,
  officialKaprodi,
  officialKetua,
  allStudents,
  studyPrograms,
  sidang,
  sidangMap,
  predikatList,
}: SKLClientProps) {
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="print:hidden">
        <PageHeader title="Surat Keterangan Lulus" breadcrumb={["Beranda", "Surat Keterangan Lulus"]} />
      </div>

      {user.role === "mahasiswa" ? (
        <StudentSKLView
          initialStudentData={studentData}
          initialOfficialKaprodi={officialKaprodi}
          initialOfficialKetua={officialKetua}
          sidang={sidang}
          predikatList={predikatList}
        />
      ) : (
        <AdminSKLView
          initialStudents={allStudents}
          initialStudyPrograms={studyPrograms}
          officialKetua={officialKetua}
          sidangMap={sidangMap}
          predikatList={predikatList}
        />
      )}
    </div>
  );
}
