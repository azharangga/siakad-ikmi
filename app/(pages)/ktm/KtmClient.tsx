"use client";

import React, { useRef, useState, useMemo } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, User, Eye, ShieldCheck, GraduationCap } from "lucide-react";
import { StudentData } from "@/lib/types";
import { KtmCard } from "@/components/features/mahasiswa/KtmCard";
import Image from "next/image";
import { usePdfPrint } from "@/hooks/use-pdf-print";
import JSZip from "jszip";
import KtmTable from "@/components/features/mahasiswa/KtmTable";
import { toast } from "sonner";

interface KtmClientProps {
  student?: StudentData | null;
  students?: StudentData[];
}

export default function KtmClient({ student, students }: KtmClientProps) {
  // === ADMIN VIEW STATE ===
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const ktmRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // === STUDENT VIEW STATE ===
  const singleKtmRef = useRef<HTMLDivElement>(null);
  
  const { isPrinting, printPdf, generatePdfBlob } = usePdfPrint();

  // ==========================================
  // LOGIC: ADMIN (BULK ACTIONS)
  // ==========================================
  
  // Print individual KTM (Admin context)
  const handlePrintIndividual = async (targetStudent: StudentData) => {
    const ref = ktmRefs.current.get(targetStudent.id);
    if (!ref) return;

    await printPdf({
      elementRef: { current: ref },
      fileName: `KTM_${targetStudent.profile.nama.replace(/\s+/g, "_")}_${targetStudent.profile.nim}.pdf`,
      pdfFormat: [85.6, 53.98],
      pdfOrientation: "landscape",
      pixelRatio: 8,
      imageType: "image/jpeg",
      imageQuality: 1.0
    });
  };

  // Generate ZIP (Admin context)
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

      // Process sequentially
      for (const studentId of selectedList) {
        const s = students.find(item => item.id === studentId);
        const ref = ktmRefs.current.get(studentId);
        
        if (!s || !ref) continue;

        // Update progress toast
        toast.loading(`Memproses ${processedCount + 1}/${selectedList.length}: ${s.profile.nama}`, {
            id: toastId,
        });

        const pdfBlob = await generatePdfBlob({
            elementRef: { current: ref },
            fileName: "", // Not used for blob
            pdfFormat: [85.6, 53.98],
            pdfOrientation: "landscape",
            pixelRatio: 8,
            imageType: "image/jpeg",
            imageQuality: 1.0,
        });

        if (pdfBlob) {
            const fileName = `KTM_${s.profile.nama.replace(/\s+/g, "_")}_${s.profile.nim}.pdf`;
            zip.file(fileName, pdfBlob);
        }
        processedCount++;
      }

      toast.loading("Mengkornpresi file ZIP...", { id: toastId });

      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `KTM_Mahasiswa_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setSelectedStudents(new Set());
      toast.success(`Berhasil membuat ZIP berisi ${processedCount} file`, { id: toastId });
    } catch (error) {
      console.error("Error generating ZIP:", error);
      toast.error("Gagal membuat file ZIP", { id: toastId });
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const hiddenKtmCards = useMemo(() => {
    if (!students) return null;
    return (
      <div className="absolute top-0 left-[-9999px]">
        {students.map(s => (
          <div 
            key={s.id}
            ref={(el) => {
              if (el) ktmRefs.current.set(s.id, el);
            }}
            className="w-[85.6mm] h-[53.98mm]"
          >
            <KtmCard student={s} className="rounded-none shadow-none border-none" />
          </div>
        ))}
      </div>
    );
  }, [students]);

  // ==========================================
  // LOGIC: STUDENT (SINGLE VIEW)
  // ==========================================
  const handleDownloadPDFSelf = async () => {
    if (!student) return;

    await printPdf({
      elementRef: singleKtmRef,
      fileName: `KTM_${student.profile.nama.replace(/\s+/g, "_")}_${student.profile.nim}.pdf`,
      pdfFormat: [85.6, 53.98],
      pdfOrientation: "landscape",
      pixelRatio: 8,
      imageType: "image/jpeg",
      imageQuality: 1.0
    });
  };

  // ==========================================
  // RENDER: ADMIN VIEW
  // ==========================================
  if (students && students.length >= 0) {
    return (
        <>
        {/* Hidden KTM Cards for PDF Generation */}
        {hiddenKtmCards}
  
        {/* Screen Content */}
        <div className="flex flex-col gap-6 pb-10 animate-in fade-in duration-500">
          <PageHeader 
            title="Kartu Tanda Mahasiswa" 
            breadcrumb={["Beranda", "KTM"]} 
          />
  
          <KtmTable 
            data={students}
            isLoading={false}
            selectedIds={selectedStudents}
            onSelectionChange={setSelectedStudents}
            onPrint={handlePrintIndividual}
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <p>Data mahasiswa tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <>
      {/* Hidden Print Area */}
      <div className="absolute top-0 left-[-9999px] w-[85.6mm] h-[53.98mm]">
          <div ref={singleKtmRef} className="block w-[85.6mm] h-[53.98mm]">
             <KtmCard student={student} className="rounded-none shadow-none border-none" />
          </div>
      </div>
      
      {/* SCREEN CONTENT */}
      <div className="screen-content flex flex-col gap-6 pb-10 animate-in fade-in duration-500">
        <PageHeader 
          title="Kartu Tanda Mahasiswa" 
          breadcrumb={["Beranda", "KTM"]} 
        />

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-stretch">
             
             {/* SIDEBAR */}
             <Card className="border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-32 h-40 bg-slate-100 rounded-lg border border-slate-200 relative overflow-hidden shadow-inner">
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

                    <div className="space-y-1 w-full border-b border-slate-100 pb-4">
                        <h3 className="font-semibold text-slate-900 leading-tight">{student.profile.nama}</h3>
                        <p className="text-sm text-slate-500 font-mono">{student.profile.nim}</p>
                    </div>

                    <div className="w-full space-y-2">
                        <div className="flex justify-between text-xs">
                             <span className="text-slate-500">Status</span>
                             {student.profile.status_mahasiswa?.toUpperCase() === "LULUS" ? (
                               <span className="font-medium text-indigo-600 flex items-center gap-1">
                                 <GraduationCap className="w-3 h-3" />
                                 Lulus
                               </span>
                             ) : (
                               <span className="font-medium text-emerald-600 flex items-center gap-1">
                                 <ShieldCheck className="w-3 h-3" />
                                 Aktif
                               </span>
                             )}
                        </div>
                        <div className="flex justify-between text-xs">
                             <span className="text-slate-500">Prodi</span>
                             <span className="font-medium text-slate-700 truncate max-w-[160px]" title={`${student.profile.study_program?.nama || "-"}${student.profile.study_program?.jenjang ? ` (${student.profile.study_program.jenjang})` : ""}`}>
                                {student.profile.study_program?.nama || "-"}
                                {student.profile.study_program?.jenjang && ` (${student.profile.study_program.jenjang})`}
                             </span>
                        </div>
                        <div className="flex justify-between text-xs">
                             <span className="text-slate-500">Angkatan</span>
                             <span className="font-medium text-slate-700">
                                {student.profile.angkatan || "-"}
                             </span>
                        </div>
                        <div className="flex justify-between text-xs">
                             <span className="text-slate-500">Semester</span>
                             <span className="font-medium text-slate-700">
                                {student.profile.semester || "-"}
                             </span>
                        </div>
                    </div>

                    <Button 
                        onClick={handleDownloadPDFSelf} 
                        className="w-full mt-2" 
                        disabled={isPrinting}
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        {isPrinting ? "Memproses..." : "Cetak KTM"}
                    </Button>
                </CardContent>
             </Card>

             {/* MAIN CONTENT */}
             <Card className="border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
                <CardContent className="flex-1 p-0 flex flex-col bg-slate-50/50">
                    
                    {/* Header Section */}
                    <div className="px-8 py-6 border-b border-slate-200 bg-white flex justify-between items-center">
                        <div>
                             <h2 className="text-lg font-semibold text-slate-900">Preview KTM Digital</h2>
                             <p className="text-sm text-slate-500">Tampilan kartu identitas mahasiswa.</p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                            <Eye className="w-3 h-3" />
                            Mode Pratinjau
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 opacity-100 overflow-hidden">
                         <div className="relative shadow-md rounded-xl overflow-hidden bg-white mobile-card-wrapper transform scale-105 md:scale-125 origin-center">
                             <KtmCard student={student} />
                         </div>
                    </div>

                </CardContent>
             </Card>

        </div>
      </div>
    </>
  );
}
