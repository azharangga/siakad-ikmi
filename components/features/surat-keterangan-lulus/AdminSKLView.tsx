"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getOfficialForDocument } from "@/app/actions/students";
import { getOfficials } from "@/app/actions/officials";
import { type StudentData, type Official } from "@/lib/types";
import { useLayout } from "@/app/context/LayoutContext";
import { Skeleton } from "@/components/ui/skeleton";
import PrintableSKL from "@/components/features/surat-keterangan-lulus/PrintableSKL";
import SKLControlPanel from "@/components/features/surat-keterangan-lulus/SKLControlPanel";

interface AdminSKLViewProps {
  initialStudents: StudentData[];
  initialOfficialKaprodi: Official | null;
  initialOfficialKetua: Official | null;
}

export default function AdminSKLView({
  initialStudents,
  initialOfficialKaprodi,
  initialOfficialKetua,
}: AdminSKLViewProps) {
  const [studentsData] = useState<StudentData[]>(initialStudents || []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [officialKaprodi, setOfficialKaprodi] = useState<Official | null>(initialOfficialKaprodi);
  const [officialKetua, setOfficialKetua] = useState<Official | null>(initialOfficialKetua);

  const [nomorSurat, setNomorSurat] = useState("");
  const [hariSidang, setHariSidang] = useState("");
  const [tanggalSidang, setTanggalSidang] = useState("");
  const [nilaiSidang, setNilaiSidang] = useState("");
  const [ipkYudisium, setIpkYudisium] = useState("");
  const [predikat, setPredikat] = useState("");
  const [signatureType, setSignatureType] = useState<"basah" | "digital" | "none">("none");
  const [totalPages, setTotalPages] = useState(1);

  const { isCollapsed } = useLayout();
  const currentStudent = useMemo(() => studentsData[selectedIndex], [studentsData, selectedIndex]);

  // Fetch Kaprodi sesuai prodi mahasiswa yang dipilih
  useEffect(() => {
    const fetchOfficials = async () => {
      if (currentStudent?.profile?.study_program_id) {
        const kaprodi = await getOfficialForDocument(currentStudent.profile.study_program_id);
        setOfficialKaprodi(kaprodi);
      }
    };
    fetchOfficials();
  }, [currentStudent]);

  return (
    <div className="flex flex-col xl:flex-row items-stretch justify-start gap-6 min-h-screen">
      <PrintableSKL
        loading={false}
        currentStudent={currentStudent}
        officialKaprodi={officialKaprodi}
        officialKetua={officialKetua}
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
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          signatureType={signatureType}
          onSignatureChange={setSignatureType}
          onPrint={() => window.print()}
          officialKaprodi={officialKaprodi}
          officialKetua={officialKetua}
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
