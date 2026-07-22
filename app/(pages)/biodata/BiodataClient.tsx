"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, User, CheckCircle2, XCircle, Loader2 } from "lucide-react"; 
import PrintableBiodata from "@/components/features/mahasiswa/PrintableBiodata";
import { StudentData } from "@/lib/types";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { usePdfPrint } from "@/hooks/use-pdf-print";
import BiodataTable from "@/components/features/mahasiswa/BiodataTable";
import JSZip from "jszip";
import { toast } from "sonner";

interface BiodataClientProps {
  student?: StudentData | null;
  students?: StudentData[];
}

export default function BiodataClient({ student, students }: BiodataClientProps) {
  // === COMMON STATE ===
  const { isPrinting, printPdf, generatePdfBlob } = usePdfPrint();
  
  // === ADMIN VIEW STATE ===
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  
  // Create a ref for the HIDDEN PRINT AREA used for bulk/admin printing
  // We use a SINGLE printable component and swap its data to save memory
  const [printTargetStudent, setPrintTargetStudent] = useState<StudentData | null>(null);
  const adminPrintRef = useRef<HTMLDivElement>(null);

  // === STUDENT VIEW STATE ===
  const singlePrintRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // LOGIC: ADMIN (BULK / INDIVIDUAL)
  // ==========================================
  
  // Helper to wait for react render
  const waitForRender = () => new Promise(resolve => setTimeout(resolve, 100));

  const handlePrintIndividualAdmin = async (targetStudent: StudentData) => {
    // 1. Set data to the hidden print component
    setPrintTargetStudent(targetStudent);
    
    // 2. Wait for render
    await waitForRender();

    // 3. Print
    if (adminPrintRef.current) {
        await printPdf({
            elementRef: adminPrintRef,
            fileName: `Biodata_${targetStudent.profile.nama.replace(/\s+/g, "_")}_${targetStudent.profile.nim}.pdf`,
            pdfFormat: "a4",
            pdfOrientation: "portrait",
        });
    }
    
    // 4. Cleanup (optional)
    setPrintTargetStudent(null);
  };

  const handlePrintBulk = async () => {
    if (!students) return;
    if (selectedStudents.size === 0) {
      toast.error("Pilih minimal 1 mahasiswa untuk dicetak");
      return;
    }

    setIsGeneratingZip(true);
    const toastId = toast.loading("Memulai pembuatan ZIP...");

    try {
      const zip = new JSZip();
      const selectedList = Array.from(selectedStudents);
      let processedCount = 0;

      for (const studentId of selectedList) {
        const s = students.find(item => item.id === studentId);
        if (!s) continue;

        // Update progress toast (only every 1 item to avoid flicker or too many updates, though local is fast)
        toast.loading(`Memproses ${processedCount + 1}/${selectedList.length}: ${s.profile.nama}`, {
            id: toastId,
        });

        // 1. Swap Data
        setPrintTargetStudent(s);
        await waitForRender();

        // 2. Generate content
        if (adminPrintRef.current) {
            const pdfBlob = await generatePdfBlob({
                elementRef: adminPrintRef,
                fileName: "", // Not used for blob
                pdfFormat: "a4",
                pdfOrientation: "portrait",
            });

            if (pdfBlob) {
                const fileName = `Biodata_${s.profile.nama.replace(/\s+/g, "_")}_${s.profile.nim}.pdf`;
                zip.file(fileName, pdfBlob);
            }
        }
        processedCount++;
      }

      toast.loading("Mengkornpresi file ZIP...", { id: toastId });

      // 3. Download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Biodata_Mahasiswa_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setSelectedStudents(new Set());
      toast.success(`Berhasil membuat ZIP berisi ${processedCount} file`, { id: toastId });
    } catch (error) {
      console.error("Error ZIP:", error);
      toast.error("Gagal membuat file ZIP", { id: toastId });
    } finally {
      setIsGeneratingZip(false);
      setPrintTargetStudent(null);
    }
  };

  // ==========================================
  // LOGIC: STUDENT (SINGLE VIEW)
  // ==========================================
  const handleDownloadPDFSelf = async () => {
    if (!student) return;
    await printPdf({
      elementRef: singlePrintRef,
      fileName: `Biodata_${student.profile.nama.replace(/\s+/g, "_")}_${student.profile.nim}.pdf`,
      pdfFormat: "a4",
      pdfOrientation: "portrait",
    });
  };

  // ==========================================
  // RENDER: ADMIN VIEW
  // ==========================================
  if (students && students.length >= 0) {
    return (
        <>
            {/* Hidden Single Print Component for Admin - Dynamic Content */}
            <div className="absolute top-0 left-[-9999px] w-[210mm]">
                {printTargetStudent && (
                    <PrintableBiodata 
                        ref={adminPrintRef} 
                        student={printTargetStudent} 
                        className="block"
                    />
                )}
            </div>

            <div className="flex flex-col gap-6 pb-10 animate-in fade-in duration-500">
                <PageHeader 
                    title="Biodata Mahasiswa" 
                    breadcrumb={["Beranda", "Biodata"]} 
                />

                <BiodataTable 
                    data={students}
                    isLoading={false}
                    selectedIds={selectedStudents}
                    onSelectionChange={setSelectedStudents}
                    onPrint={handlePrintIndividualAdmin}
                    onPrintBulk={handlePrintBulk}
                    isGeneratingZip={isGeneratingZip}
                    isPrinting={isPrinting}
                />
            </div>
        </>
    );
  }

  // ==========================================
  // RENDER: STUDENT VIEW
  // ==========================================
  if (!student) {
     return <div>Data tidak ditemukan</div>
  }

  return (
    <>
      {/* Hidden Print Area but Rendered for Capture */}
      <div className="absolute top-0 left-[-9999px] w-[210mm]">
        <PrintableBiodata 
            ref={singlePrintRef} 
            student={student} 
            className="block" 
        />
      </div>

      <div className="flex flex-col gap-6 pb-10 animate-in fade-in duration-500">
        <PageHeader 
          title="Biodata Mahasiswa" 
          breadcrumb={["Beranda", "Biodata"]} 
        />

        <Card className="border-none shadow-sm ring-1 ring-gray-200">
          <CardContent className="p-5 md:p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* DESKTOP SIDEBAR (Avatar + Button) - Hidden on Mobile */}
              <div className="hidden md:flex w-[170px] flex-col items-center gap-4 shrink-0">
                <div className="w-[150px] h-[200px] bg-slate-100 rounded-lg border border-slate-200 relative overflow-hidden shadow-sm">
                  {student.profile.avatar_url ? (
                    <Image
                      src={student.profile.avatar_url}
                      alt={student.profile.nama}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <User className="h-16 w-16 mb-2" />
                      <span className="text-xs">Foto Tidak Tersedia</span>
                    </div>
                  )}
                </div>
                <Button 
                   onClick={handleDownloadPDFSelf} 
                   className="w-full" 
                   variant="default"
                   disabled={isPrinting}
                >
                  {isPrinting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="mr-2 h-4 w-4" />
                  )}
                  {isPrinting ? "Memproses..." : "Cetak PDF"}
                </Button>
              </div>

              {/* MOBILE HEADER (Avatar + Name) - Hidden on Desktop */}
              <div className="flex md:hidden w-full items-center gap-4 border-b border-gray-100 pb-4 mb-2">
                 <div className="w-24 h-32 bg-slate-100 rounded-md border border-slate-200 relative overflow-hidden shrink-0">
                    {student.profile.avatar_url ? (
                        <Image
                        src={student.profile.avatar_url}
                        alt={student.profile.nama}
                        fill
                        className="object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <User className="h-8 w-8 mb-1" />
                        <span className="text-[10px]">Foto Tidak Tersedia</span>
                        </div>
                    )}
                 </div>
                 <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-800 leading-tight mb-1">{student.profile.nama}</h2>
                    <p className="text-gray-500 font-mono text-sm">{student.profile.nim}</p>
                 </div>
              </div>

              {/* DATA SECTION */}
              <div className="flex-1 w-full">
                {/* Desktop Name Header */}
                <div className="hidden md:block mb-6">
                    <h2 className="text-xl font-bold text-gray-800">{student.profile.nama}</h2>
                    <p className="text-gray-500 font-mono text-base">{student.profile.nim}</p>
                </div>

                <div className="flex flex-col text-sm md:text-sm">
                   {/* DATA AKADEMIK */}
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">Program Studi</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.study_program?.nama || "-"}
                        </span>
                   </div>
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">Jenjang</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.study_program?.jenjang || "-"}
                        </span>
                   </div>
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">Angkatan</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.angkatan}
                        </span>
                   </div>
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">Semester</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.semester}
                        </span>
                   </div>
                    <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-100 py-3 gap-1 sm:gap-4">
                         <span className="text-gray-500 font-medium w-[140px] shrink-0">Status Akademik</span>
                         <span>
                           <Badge 
                             className={`font-normal ${
                               student.profile.status_mahasiswa === "AKTIF" ? "bg-green-600 hover:bg-green-700 text-white" :
                               student.profile.status_mahasiswa === "LULUS" ? "bg-blue-600 hover:bg-blue-700 text-white" :
                               student.profile.status_mahasiswa === "CUTI" ? "bg-amber-500 hover:bg-amber-600 text-white" :
                               "bg-red-600 hover:bg-red-700 text-white"
                             }`}
                           >
                             {student.profile.status_mahasiswa || "AKTIF"}
                           </Badge>
                         </span>
                    </div>

                   {/* DATA PRIBADI */}
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">NIK</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.nik || "-"}
                        </span>
                   </div>
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">Tempat, Tgl Lahir</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.tempat_lahir ? `${student.profile.tempat_lahir}, ` : ""}{formatDate(student.profile.tanggal_lahir)}
                        </span>
                   </div>
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">Jenis Kelamin</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.jenis_kelamin || "-"}
                        </span>
                   </div>
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">Agama</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.agama || "-"}
                        </span>
                   </div>
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">Status Perkawinan</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.status || "-"}
                        </span>
                   </div>

                   {/* DATA KONTAK */}
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">No Telepon</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.no_hp || "-"}
                        </span>
                   </div>
                   <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-gray-100 py-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">Email</span>
                        <span className="text-gray-800 font-medium">
                            {student.profile.email || "-"}
                        </span>
                   </div>
                   <div className="flex flex-col sm:flex-row sm:items-start pt-3 gap-1 sm:gap-4">
                        <span className="text-gray-500 font-medium w-[140px] shrink-0">Alamat</span>
                        <span className="text-gray-800 leading-relaxed">
                            {student.profile.alamat || "-"}
                        </span>
                   </div>
                </div>

                {/* MOBILE BUTTON (Bottom) */}
                <div className="mt-6 md:hidden">
                    <Button 
                    onClick={handleDownloadPDFSelf} 
                    className="w-full" 
                    variant="default"
                    disabled={isPrinting}
                    >
                    {isPrinting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Printer className="mr-2 h-4 w-4" />
                    )}
                    {isPrinting ? "Memproses..." : "Cetak PDF"}
                    </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
