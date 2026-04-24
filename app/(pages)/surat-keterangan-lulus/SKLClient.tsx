'use client';

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/layout/PageHeader";
import StudentSKLView from "@/components/features/surat-keterangan-lulus/StudentSKLView";
import AdminSKLView from "@/components/features/surat-keterangan-lulus/AdminSKLView";

interface SKLClientProps {
  user: any;
  studentData: any;
  officialKaprodi: any;
  officialKetua: any;
  allStudents: any[];
}

export default function SKLClient({
  user,
  studentData,
  officialKaprodi,
  officialKetua,
  allStudents,
}: SKLClientProps) {
  if (!user) {
    return (
      <div className="flex flex-col gap-6 w-full p-8">
        <PageHeader title="Surat Keterangan Lulus" breadcrumb={["Beranda", "Surat Keterangan Lulus"]} />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

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
        />
      ) : (
        <AdminSKLView
          initialStudents={allStudents}
          initialOfficialKaprodi={officialKaprodi}
          initialOfficialKetua={officialKetua}
        />
      )}
    </div>
  );
}
