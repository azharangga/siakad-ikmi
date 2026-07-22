"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getStudents, getActiveAcademicYear, getOfficialForDocument } from "@/app/actions/students";
import { type StudentData, type Official, type AcademicYear } from "@/lib/types";

import { useSignature } from "@/hooks/useSignature";
import { useToastMessage } from "@/hooks/use-toast-message";
import { useLayout } from "@/app/context/LayoutContext";
import { Skeleton } from "@/components/ui/skeleton";

import ControlPanel from "@/components/features/document/ControlPanel";
import PrintableSuratKeterangan from "@/components/features/surat-keterangan/PrintableSuratKeterangan";

interface AdminSuratViewProps {
  initialStudents: StudentData[];
  initialAcademicYear?: string;
  initialAcademicYears?: AcademicYear[];
  initialActiveYear?: string;
}

export default function AdminSuratView({
  initialStudents,
  initialAcademicYear,
  initialAcademicYears,
  initialActiveYear,
}: AdminSuratViewProps) {
  const [studentsData, setStudentsData] = useState<StudentData[]>(initialStudents || []);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // State Data Dinamis
  const [nomorSurat, setNomorSurat] = useState("422.1/001/IKMI/III/2026"); 
  const [official, setOfficial] = useState<Official | null>(null);
  const [tahunAkademik, setTahunAkademik] = useState(initialAcademicYear || initialActiveYear || ""); 
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [alamat, setAlamat] = useState("");
  const [namaOrangTua, setNamaOrangTua] = useState("");
  const [pekerjaanOrangTua, setPekerjaanOrangTua] = useState("");

  const { signatureType, setSignatureType, isLoading: isSigLoading } = useSignature("none", official);
  const { showLoading, dismiss } = useToastMessage();
  const toastIdRef = React.useRef<string | number | null>(null);

  useEffect(() => {
    if (isSigLoading) {
      if (!toastIdRef.current) toastIdRef.current = showLoading("Menyiapkan dokumen...");
    } else {
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [isSigLoading]);

  const secureImage = useMemo(() => {
    if (!official) return null;
    if (signatureType === "basah") return official.ttd_basah_url || null;
    if (signatureType === "digital") return official.ttd_digital_url || null;
    return null;
  }, [official, signatureType]);
  const { isCollapsed } = useLayout();
  const [totalPages, setTotalPages] = useState(1);

  // Removed internal fetch logic

  const currentStudent = useMemo(() => studentsData[selectedIndex], [studentsData, selectedIndex]);

  // Update Alamat saat mahasiswa berganti

  useEffect(() => {
    if (currentStudent?.profile?.alamat) {
      setAlamat(currentStudent.profile.alamat);
    } else {
      setAlamat("");
    }
    
    // Fetch Official sesuai Prodi
    const fetchOfficial = async () => {
        if (currentStudent?.profile?.study_program_id) {
            const off = await getOfficialForDocument(currentStudent.profile.study_program_id);
            setOfficial(off);
        } else {
            // Fallback default
            const off = await getOfficialForDocument();
            setOfficial(off);
        }
    }
    fetchOfficial();

  }, [currentStudent]);

  return (
    <div className="flex flex-col xl:flex-row items-stretch justify-start gap-6 min-h-screen">
        <PrintableSuratKeterangan
          loading={loading}
          currentStudent={currentStudent}
          official={official}
          nomorSurat={nomorSurat}
          tahunAkademik={tahunAkademik}
          tempatLahir={tempatLahir}
          tanggalLahir={tanggalLahir}
          alamat={alamat}
          namaOrangTua={namaOrangTua}
          pekerjaanOrangTua={pekerjaanOrangTua}
          signatureType={signatureType}
          signatureBase64={secureImage}
          isCollapsed={isCollapsed}
          setTotalPages={setTotalPages}
        />

        <div className="w-full flex-1 print:hidden z-10 pb-10 xl:pb-0">
          {loading ? (
             <div className="space-y-4">
                <Skeleton className="h-[240px] w-full rounded-xl" />
                <Skeleton className="h-[120px] w-full rounded-xl" />
             </div>
          ) : (
            <ControlPanel
              students={studentsData}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              signatureType={signatureType}
              onSignatureChange={setSignatureType}
              onPrint={() => window.print()}
              official={official}
              
              nomorSurat={nomorSurat} setNomorSurat={setNomorSurat}
              tahunAkademik={tahunAkademik} setTahunAkademik={setTahunAkademik}
              tempatLahir={tempatLahir} setTempatLahir={setTempatLahir}
              tanggalLahir={tanggalLahir} setTanggalLahir={setTanggalLahir}
              alamat={alamat} setAlamat={setAlamat}
              namaOrangTua={namaOrangTua} setNamaOrangTua={setNamaOrangTua}
              pekerjaanOrangTua={pekerjaanOrangTua} setPekerjaanOrangTua={setPekerjaanOrangTua}
              totalPages={totalPages}
            />
          )}
        </div>
    </div>
  );
}
