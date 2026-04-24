"use client";

import React, { useState, useMemo } from "react";
import { type StudentData, type Official } from "@/lib/types";
import { useLayout } from "@/app/context/LayoutContext";
import PrintableSKL from "@/components/features/surat-keterangan-lulus/PrintableSKL";
import SKLControlPanel from "@/components/features/surat-keterangan-lulus/SKLControlPanel";

interface StudentSKLViewProps {
  initialStudentData: StudentData | null;
  initialOfficialKaprodi: Official | null;
  initialOfficialKetua: Official | null;
}

export default function StudentSKLView({
  initialStudentData,
  initialOfficialKaprodi,
  initialOfficialKetua,
}: StudentSKLViewProps) {
  const studentsData = useMemo(() => (initialStudentData ? [initialStudentData] : []), [initialStudentData]);

  const [nomorSurat, setNomorSurat] = useState("");
  const [hariSidang, setHariSidang] = useState("");
  const [tanggalSidang, setTanggalSidang] = useState("");
  const [nilaiSidang, setNilaiSidang] = useState("");
  const [ipkYudisium, setIpkYudisium] = useState("");
  const [predikat, setPredikat] = useState("");
  const [signatureType, setSignatureType] = useState<"basah" | "digital" | "none">("none");
  const [totalPages, setTotalPages] = useState(1);

  const { isCollapsed, user } = useLayout();
  const currentStudent = studentsData[0] ?? null;

  return (
    <div className="flex flex-col xl:flex-row items-stretch justify-start gap-6 min-h-screen">
      <PrintableSKL
        loading={false}
        currentStudent={currentStudent}
        officialKaprodi={initialOfficialKaprodi}
        officialKetua={initialOfficialKetua}
        nomorSurat={nomorSurat}
        hariSidang={hariSidang}
        tanggalSidang={tanggalSidang}
        nilaiSidang={nilaiSidang}
        ipkYudisium={ipkYudisium}
        predikat={predikat}
        signatureType={signatureType}
        isCollapsed={isCollapsed}
        setTotalPages={setTotalPages}
      />

      <div className="w-full flex-1 print:hidden z-10 pb-10 xl:pb-0">
        <SKLControlPanel
          students={studentsData}
          selectedIndex={0}
          onSelect={() => {}}
          signatureType={signatureType}
          onSignatureChange={setSignatureType}
          onPrint={() => window.print()}
          officialKaprodi={initialOfficialKaprodi}
          officialKetua={initialOfficialKetua}
          user={user}
          totalPages={totalPages}
          nomorSurat={nomorSurat} setNomorSurat={setNomorSurat}
          hariSidang={hariSidang} setHariSidang={setHariSidang}
          tanggalSidang={tanggalSidang} setTanggalSidang={setTanggalSidang}
          nilaiSidang={nilaiSidang} setNilaiSidang={setNilaiSidang}
          ipkYudisium={ipkYudisium} setIpkYudisium={setIpkYudisium}
          predikat={predikat} setPredikat={setPredikat}
        />
      </div>
    </div>
  );
}
