"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { getStudents, getOfficialForDocument } from "@/app/actions/students";
import { type StudentData, type TranscriptItem, type Official } from "@/lib/types";
import { useSignature } from "@/hooks/useSignature";
import { usePdfPrint } from "@/hooks/use-pdf-print";
import { useLayout } from "@/app/context/LayoutContext";
import { useToastMessage } from "@/hooks/use-toast-message";

import PrintableKHS from "@/components/features/khs/PrintableKHS"; // Keep for Modal
import KHSTable from "@/components/features/khs/KHSTable"; // New Table
import { calculateIPS, calculateIPK, calculateTotalSKSLulus, calculateTotalMutu } from "@/lib/grade-calculations";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Loader2, TrendingUp, Award, PieChart, GraduationCap, FileText, Trophy, BookOpen } from "lucide-react";

interface StudentKHSViewProps {
  initialStudentData: StudentData | null;
  initialOfficial: Official | null;
}

export default function StudentKHSView({ initialStudentData, initialOfficial }: StudentKHSViewProps) {
  const [studentsData, setStudentsData] = useState<StudentData[]>(initialStudentData ? [initialStudentData] : []);
  const [loading, setLoading] = useState(false);
  const [official, setOfficial] = useState<Official | null>(initialOfficial);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSemester, setSelectedSemester] = useState<number>(0);
  const [printSemester, setPrintSemester] = useState<number>(0); // Decoupled state for printing

  const { signatureType, setSignatureType, isLoading: isSigLoading } = useSignature("none");
  
  // Derive Signature
  const secureImage = useMemo(() => {
    if (!official) return null;
    if (signatureType === "basah") return official.ttd_basah_url || null;
    if (signatureType === "digital") return official.ttd_digital_url || null;
    return null;
  }, [official, signatureType]);
  const { isCollapsed, user } = useLayout();
  const { showLoading, dismiss } = useToastMessage();
  
  const [totalPages, setTotalPages] = useState(1);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const { isPrinting, printPdf } = usePdfPrint();
  const printRef = useRef<HTMLDivElement>(null);

  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    // Optional loading state
    if (isSigLoading) {
        if (!toastIdRef.current) toastIdRef.current = showLoading("Menyiapkan dokumen...");
    } else {
        if (toastIdRef.current) {
            dismiss(toastIdRef.current);
            toastIdRef.current = null;
        }
    }
  }, [isSigLoading]);

  // Auto-select latest semester for printing if "All Semesters" is active

  // Auto-select mahasiswa login (Always index 0 as we only pass 1 student)
  useEffect(() => {
    if (studentsData.length > 0) {
       setSelectedIndex(0);
    }
  }, [studentsData]);

  const currentStudent = useMemo(() => studentsData[selectedIndex], [studentsData, selectedIndex]);

  // === LOGIC SEMESTER ===
  const availableSemesters = useMemo<number[]>(() => {
    if (!currentStudent) return [];
    const currentSem = currentStudent.profile?.semester || 1;
    const transcriptSmts = currentStudent.transcript?.map((t: TranscriptItem) => Number(t.smt)) || [];
    const maxDataSem = Math.max(0, ...transcriptSmts);
    const limit = Math.max(currentSem, maxDataSem);
    return Array.from({ length: limit }, (_, i) => i + 1);
  }, [currentStudent]);

  // (Removed internal fetch for official, rely on props)

  // Auto-select latest semester for printing if "All Semesters" is active
  useEffect(() => {
    if (isPrintModalOpen && availableSemesters.length > 0) {
        if (selectedSemester !== 0) {
            setPrintSemester(selectedSemester);
        } else {
            setPrintSemester(availableSemesters[availableSemesters.length - 1]);
        }
    }
  }, [isPrintModalOpen, selectedSemester, availableSemesters]);

  useEffect(() => {
    if (availableSemesters.length > 0) {
        if (selectedSemester !== 0 && !availableSemesters.includes(selectedSemester)) {
            setSelectedSemester(0);
        }
    }
  }, [availableSemesters, selectedSemester]);

  // Data Semester Ini
  const semesterData = useMemo(() => {
    if (!currentStudent?.transcript) return [];
    if (selectedSemester === 0) return currentStudent.transcript;
    return currentStudent.transcript.filter((t: TranscriptItem) => Number(t.smt) === selectedSemester);
  }, [currentStudent, selectedSemester]);

  // Data Kumulatif (Sampai Semester Ini)
  const cumulativeData = useMemo(() => {
    if (!currentStudent?.transcript) return [];
    if (selectedSemester === 0) {
         return currentStudent.transcript.filter((t: TranscriptItem) => t.hm !== '-');
    }
    return currentStudent.transcript.filter((t: TranscriptItem) => Number(t.smt) <= selectedSemester && t.hm !== '-');
  }, [currentStudent, selectedSemester]);

  const ips = useMemo(() => {
    if (selectedSemester === 0) {
         // Jika "Semua Semester", gunakan IPK sebagai representasi "Rata-rata"
         return calculateIPK(cumulativeData).replace('.', ',');
    }
    return calculateIPS(currentStudent?.transcript || [], selectedSemester).replace('.', ',');
  }, [currentStudent, selectedSemester, cumulativeData]);

  const ipk = useMemo(() => {
    return calculateIPK(cumulativeData).replace('.', ',');
  }, [cumulativeData]);

  const totalSKS = useMemo(() => {
    return calculateTotalSKSLulus(cumulativeData);
  }, [cumulativeData]);

  const totalMutu = useMemo(() => {
    return calculateTotalMutu(cumulativeData);
  }, [cumulativeData]);

  const totalCourses = useMemo(() => {
    return cumulativeData.length;
  }, [cumulativeData]);

  // Data for Printing (Based on printSemester)
  const printSemesterData = useMemo(() => {
    if (!currentStudent?.transcript) return [];
    return currentStudent.transcript.filter((t: TranscriptItem) => Number(t.smt) === printSemester);
  }, [currentStudent, printSemester]);

  // IPS for Printing
  const printIPS = useMemo(() => {
    return calculateIPS(currentStudent?.transcript || [], printSemester).replace('.', ',');
  }, [currentStudent, printSemester]);

  // IPK for Printing
  const printCumulativeData = useMemo(() => {
    if (!currentStudent?.transcript) return [];
    return currentStudent.transcript.filter((t: TranscriptItem) => Number(t.smt) <= printSemester && t.hm !== '-');
  }, [currentStudent, printSemester]);

  const printIPK = useMemo(() => {
    return calculateIPK(printCumulativeData).replace('.', ',');
  }, [printCumulativeData]);

  // Handle Print with usePdfPrint
  const handlePrintProcess = async () => {
    await printPdf({
      elementRef: printRef,
      fileName: `KHS_SMT${printSemester}_${user?.name || 'Mahasiswa'}.pdf`,
      pdfFormat: "a4",
      pdfOrientation: "portrait",
    });
    setIsPrintModalOpen(false);
  };

  return (
    <>
      {/* --- HIDDEN PRINT COMPONENT --- */}
      <div className="absolute top-0 left-[-9999px] w-[210mm]">
          <PrintableKHS 
            ref={printRef} 
            loading={loading}
            currentStudent={currentStudent}
            selectedSemester={printSemester} // Use printSemester
            semesterData={printSemesterData} // Use printSemesterData
            ips={printIPS} // Use printIPS
            ipk={printIPK} // Use printIPK
            signatureType={signatureType}
            signatureBase64={secureImage}
            official={official}
            isCollapsed={true} // Force full width for print
            setTotalPages={setTotalPages}
          />
      </div>

      <div className="space-y-6 print:hidden">
         {/* HEADER SECTION */}


         {/* HEADER SECTION - SUMMARY CARDS (IPK & Total SKS) */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* CARD 1: IPK (Left) - Spans 2 columns */}
             <Card className="col-span-1 md:col-span-2 border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-blue-800 to-blue-900">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Trophy size={120} />
                </div>
                <CardContent className="p-4 sm:p-6 relative z-10 flex flex-col justify-between h-full">
                     {loading ? (
                         <div className="flex flex-col justify-between h-full gap-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-3">
                                    <Skeleton className="h-4 w-32 opacity-25" />
                                    <Skeleton className="h-8 w-48 opacity-25" />
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                                <Skeleton className="h-10 w-[240px] opacity-25" />
                            </div>
                         </div>
                    ) : (
                        <>
                            <div>
                                <p className="text-blue-100 font-medium text-sm mb-1">Indeks Prestasi Kumulatif</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{ipk}</h2>
                                    <span className="text-lg text-blue-200 font-medium">/ 4.00</span>
                                </div>
                            </div>
                            
                            <div className="mt-6 flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-md border border-white/10 backdrop-blur-sm">
                                    <GraduationCap className="w-4 h-4 text-blue-50" />
                                    <span className="text-sm font-medium text-blue-50">Total Nilai Mutu: {totalMutu}</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-md border border-white/10 backdrop-blur-sm">
                                    <FileText className="w-4 h-4 text-blue-50" />
                                    <span className="text-sm font-medium text-blue-50">Total Mata Kuliah: {totalCourses}</span>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
             </Card>

             {/* CARD 2: Total SKS (Right) - Spans 1 column */}
             <Card className="border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-cyan-600 to-blue-600">
                <div className="absolute -bottom-6 -right-6 opacity-20 rotate-12">
                    <BookOpen size={140} />
                </div>
                <CardContent className="p-4 sm:p-6 relative z-10 flex flex-col justify-between h-full">
                    {loading ? (
                         <div className="space-y-6">
                           <div className="space-y-3">
                               <Skeleton className="h-4 w-32 opacity-25" />
                               <div className="flex items-baseline gap-2">
                                  <Skeleton className="h-10 w-16 opacity-25" />
                                  <Skeleton className="h-6 w-12 opacity-25" />
                               </div>
                           </div>
                           <div className="space-y-2">
                              <Skeleton className="h-3 w-full opacity-25 rounded-full" />
                              <Skeleton className="h-3 w-3/4 opacity-25 rounded-full" />
                           </div>
                         </div>
                    ) : (
                        <>
                            <div>
                                <div className="flex items-center gap-2 text-cyan-50 mb-1">
                                    <span className="text-sm font-medium">Total SKS Lulus</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{totalSKS}</h2>
                                    <span className="text-lg text-cyan-100 font-medium">/ 144 SKS</span>
                                </div>
                            </div>
                            
                            <div className="mt-4">
                                <div className="w-full bg-black/20 rounded-full h-3 mb-3 overflow-hidden backdrop-blur-sm">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                                        style={{ width: `${Math.min((totalSKS / 144) * 100, 100)}%` }} 
                                    />
                                </div>
                                <p className="text-xs text-cyan-50/90 leading-relaxed font-medium">
                                    {Math.min(Math.round((totalSKS / 144) * 100), 100)}% dari minimal 144 SKS untuk kelulusan.
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
             </Card>
         </div>


         {/* CONTENT SECTION (TABLE) */}
         <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                       <KHSTable 
                        data={semesterData} 
                        loading={loading}
                        // Pass onPrint to enable the "Cetak KHS" button in the table
                        onPrint={() => setIsPrintModalOpen(true)}
                        availableSemesters={availableSemesters}
                        selectedSemester={selectedSemester}
                        onSemesterChange={setSelectedSemester}
                       />
                  </div>
            </CardContent>
         </Card>

         {/* PRINT MODAL */}
         <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
              <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                      <DialogTitle>Opsi Cetak KHS</DialogTitle>
                  </DialogHeader>

                  <div className="py-4 space-y-4">
                      {/* Select Semester in Modal (Syncs with main view) */}
                      <div className="space-y-2">
                          <label className="text-sm font-medium">Semester</label>
                          <Select
                              value={String(printSemester)}
                              onValueChange={(val) => setPrintSemester(Number(val))}
                          >
                              <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Pilih Semester" />
                              </SelectTrigger>
                              <SelectContent>
                                  {availableSemesters.map((smt) => (
                                      <SelectItem key={smt} value={String(smt)}>
                                          Semester {smt}
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="space-y-2">
                          <label className="text-sm font-medium">Pilih Jenis Tanda Tangan</label>
                          <Select value={signatureType} onValueChange={(val) => setSignatureType(val as "basah" | "digital" | "none")}>
                              <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Pilih Tanda Tangan" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="none">Tanpa Tanda Tangan</SelectItem>
                                  {official?.ttd_basah_url && <SelectItem value="basah">Tanda Tangan Basah</SelectItem>}
                                  {official?.ttd_digital_url && <SelectItem value="digital">Tanda Tangan Digital</SelectItem>}
                              </SelectContent>
                          </Select>
                      </div>
                  </div>

                      <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsPrintModalOpen(false)} disabled={isPrinting}>Batal</Button>
                      <Button onClick={handlePrintProcess} className="bg-primary text-white" disabled={isPrinting || isSigLoading}>
                          {isPrinting || isSigLoading ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isPrinting ? "Memproses..." : "Memuat..."}</>
                          ) : (
                              <><Printer className="w-4 h-4 mr-2" /> Cetak PDF</>
                          )}
                      </Button>
                  </div>
              </DialogContent>
         </Dialog>
      </div>
    </>
  );
}
